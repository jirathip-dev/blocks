/// Why an op or a frame does not fit the screen it is applied to.
public enum ApplyError: Error, Equatable, Sendable {
    case noBlock(String)
    case noList(String)
    case shape(String)
    case unknown
    case gap(want: UInt64, got: UInt64)
}

extension Block {
    /// Applies `ops` in order, as the crate's `apply` does; on an error the block is left as it was.
    public mutating func apply(_ ops: [Op]) throws(ApplyError) {
        var tree: JSONValue
        do { tree = try JSONValue(self) } catch { throw .shape("\(error)") }
        for op in ops { try tree.apply(op) }
        do { self = try tree.decode(Block.self) } catch { throw .shape("\(error)") }
    }
}

/// The old per-screen stream's receiving side: the screen as of the last `OldFrame` applied, its badge and dot.
public struct Replica: Equatable, Sendable {
    public private(set) var screen: Block?
    public private(set) var seq: UInt64?
    public private(set) var badge: UInt64?
    public private(set) var dot = false

    public init() {}

    /// Applies `frame`; one that does not start with `screen` must follow the last one applied, else nothing changes.
    public mutating func receive(_ frame: OldFrame) throws(ApplyError) {
        let want = seq.map { min($0, .max - 1) + 1 } ?? 0
        var next: Block
        if case .screen(let whole)? = frame.ops.first {
            next = whole.screen
        } else if let screen, frame.seq == want {
            next = screen
        } else {
            throw .gap(want: want, got: frame.seq)
        }
        try next.apply(frame.ops)
        screen = next
        seq = frame.seq
        for op in frame.ops {
            if case .badge(let b) = op { badge = b.count }
            if case .dot(let d) = op { dot = d.on }
        }
    }
}

extension JSONValue {
    fileprivate mutating func apply(_ op: Op) throws(ApplyError) {
        switch op {
        case .merge(let m):
            guard edit(m.id, { .object($0.fields.merging(m.fields) { $1 }) }) else { throw .noBlock(m.id) }
        case .insert(let i):
            try insert(try Self.json(i.block), into: i.into, before: i.before, after: i.after)
        case .move(let m):
            guard let block = take(m.id) else { throw .noBlock(m.id) }
            try insert(block, into: m.into, before: m.before, after: nil)
        case .remove(let r):
            guard take(r.id) != nil else { throw .noBlock(r.id) }
        case .replace(let r):
            let block = try Self.json(r.block)
            guard edit(r.id, { _ in block }) else { throw .noBlock(r.id) }
        case .badge, .dot:
            break
        case .screen(let s):
            self = try Self.json(s.screen)
        case .unknown:
            throw .unknown
        }
    }

    private static func json(_ value: some Encodable) throws(ApplyError) -> Self {
        do { return try Self(value) } catch { throw .shape("\(error)") }
    }

    private mutating func eachList(_ body: (inout [Self]) -> Bool) -> Bool {
        guard case .object(var o) = self else { return false }
        defer { self = .object(o) }
        let keys: [String] =
            switch type {
            case "screen", "sheet", "section": ["blocks"]
            case "list": ["rows"]
            case "card": ["blocks", "buttons"]
            default: []
            }
        for key in keys {
            guard var items = o[key]?.items else { continue }
            let hit = body(&items)
            o[key] = .array(items)
            if hit { return true }
        }
        guard type == "row", var rounds = o["rounds"]?.items else { return false }
        for i in rounds.indices {
            guard case .object(var round) = rounds[i], var blocks = round["blocks"]?.items else { continue }
            let hit = body(&blocks)
            round["blocks"] = .array(blocks)
            rounds[i] = .object(round)
            o["rounds"] = .array(rounds)
            if hit { return true }
        }
        return false
    }

    private mutating func edit(_ id: String, _ change: (Self) -> Self) -> Bool {
        if self.id == id {
            self = change(self)
            return true
        }
        return eachList { list in
            for i in list.indices {
                if list[i].edit(id, change) { return true }
            }
            return false
        }
    }

    private mutating func take(_ id: String) -> Self? {
        var taken: Self?
        _ = eachList { list in
            if let i = list.firstIndex(where: { $0.id == id }) {
                taken = list.remove(at: i)
                return true
            }
            for i in list.indices {
                taken = list[i].take(id)
                if taken != nil { return true }
            }
            return false
        }
        return taken
    }

    private mutating func insert(_ child: Self, into: String, before: String?, after: String?) throws(ApplyError) {
        let hosts = [
            "screen": "blocks", "sheet": "blocks", "section": "blocks", "card": "blocks", "list": "rows",
            "scene": "lanes", "row": "rounds",
        ]
        var fits = true
        let found = edit(into) { host in
            guard let key = hosts[host.type] else {
                fits = false
                return host
            }
            var list = host.list(key)
            let at = { (id: String?) in id.flatMap { id in list.firstIndex { $0.id == id } } }
            list.insert(child, at: at(before) ?? at(after).map { $0 + 1 } ?? list.count)
            return .object(host.fields.merging([key: .array(list)]) { $1 })
        }
        guard found else { throw .noBlock(into) }
        guard fits else { throw .noList(into) }
    }
}
