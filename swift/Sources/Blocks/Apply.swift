/// Why an op does not fit the screen it is applied to.
public enum ApplyError: Error, Equatable, Sendable {
    case noBlock(String)
    case noList(String)
    case shape(String)
    case unknown
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

/// What a frame or a key's state did to the key: patched, replaced, dropped, or open the key again (`have`).
public enum Took: String, Sendable {
    case patched, replaced, old, gap
}

/// A stream more than one wire version from the client's: the app or the server needs an update.
public enum Outdated: String, Error, Sendable {
    case app, server
}

/// The ADR's Swift `Mirror`: the epoch, per key opened the rev held and the screen, and the badge and dot.
public struct Replica: Equatable, Sendable {
    private struct Held: Equatable, Sendable {
        var rev: UInt64?
        var screen: Block?
    }

    public let v: UInt8
    private var epoch: String?
    private var outdated: Outdated?
    private var keys: [String: Held] = [:]
    public private(set) var badge: UInt64?
    public private(set) var dot = false

    /// A client at wire version `v` with no key open.
    public init(v: UInt8 = UInt8(blocksSchemaVersion)) { self.v = v }

    /// Takes a stream's `hello`: a new epoch forgets every rev; a version over one apart stops syncing.
    @discardableResult
    public mutating func hello(_ h: Hello) -> Outdated? {
        outdated = h.v > v ? .app : Int(h.v) + 1 < Int(v) ? .server : nil
        if epoch != h.epoch {
            for k in keys.keys { keys[k]?.rev = nil }
            epoch = h.epoch
        }
        return outdated
    }

    /// Mounts key `k`; its first state comes with the next `have`.
    public mutating func open(_ k: String) {
        if keys[k] == nil { keys[k] = Held() }
    }

    /// Unmounts key `k` and forgets its screen.
    public mutating func close(_ k: String) { keys[k] = nil }

    /// The keys to open on the server, each with the rev held; none while outdated.
    public var have: [Have] {
        outdated != nil ? [] : keys.sorted { $0.key < $1.key }.map { Have(k: $0.key, rev: $0.value.rev) }
    }

    /// Key `k`'s screen as of the last frame or state applied.
    public func screen(_ k: String) -> Block? { keys[k]?.screen }

    /// Takes a stream frame: patches on `from` = rev held, drops an old one, asks again on a gap or an unknown op.
    public mutating func frame(_ f: Frame) -> Took {
        guard outdated == nil, let held = keys[f.k], held.rev.map({ f.rev > $0 }) ?? true else { return .old }
        if let screen = f.screen { return take(f.k, f.rev, screen) }
        guard let from = f.from, let rev = held.rev else { return .old }
        return from == rev ? patch(f.k, f.rev, f.ops ?? []) : .gap
    }

    /// Takes a burst of frames in one mutation, so a view that holds the replica redraws once for all of them.
    public mutating func frames(_ fs: [Frame]) -> [Took] { fs.map { frame($0) } }

    /// Takes the answer to the `have` it `sent`: a screen applies, ops only on the rev that was sent.
    public mutating func synced(_ sent: [Have], _ s: Synced) -> [Took] {
        var took: [Took] = []
        for st in s.keys { took.append(state(sent, st)) }
        return took
    }

    private mutating func state(_ sent: [Have], _ st: KeyState) -> Took {
        guard outdated == nil, let held = keys[st.k] else { return .old }
        if st.gone != nil {
            keys[st.k] = nil
            return .old
        }
        guard let rev = st.rev else { return .old }
        if let screen = st.screen { return held.rev.map { rev < $0 } == true ? .old : take(st.k, rev, screen) }
        let asked = sent.first { $0.k == st.k }?.rev
        guard let ops = st.ops, asked != nil, held.rev == asked else { return .old }
        return patch(st.k, rev, ops)
    }

    private mutating func take(_ k: String, _ rev: UInt64, _ screen: Block) -> Took {
        keys[k] = Held(rev: rev, screen: screen)
        return .replaced
    }

    private mutating func patch(_ k: String, _ rev: UInt64, _ ops: [Op]) -> Took {
        guard var next = keys[k]?.screen, (try? next.apply(ops)) != nil else {
            keys[k]?.rev = nil
            return .gap
        }
        keys[k] = Held(rev: rev, screen: next)
        for op in ops {
            if case .badge(let b) = op { badge = b.count }
            if case .dot(let d) = op { dot = d.on }
        }
        return .patched
    }
}

extension JSONValue {
    fileprivate mutating func apply(_ op: Op) throws(ApplyError) {
        switch op {
        case .merge(let m):
            var bent = false
            let merged = edit(m.id) { old in
                let new = Self.object(old.fields.merging(m.fields) { $1 })
                bent = old.fits && !new.fits
                return new
            }
            guard merged else { throw .noBlock(m.id) }
            if bent { throw .shape("block `\(m.id)` no longer fits its kind") }
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
        case .badge(let b):
            if type == "screen", case .object(var o) = self {
                o["badge"] = .number(Double(b.count))
                self = .object(o)
            }
        case .dot:
            break
        case .screen(let s):
            self = try Self.json(s.screen)
        case .unknown:
            throw .unknown
        }
    }

    private var fits: Bool {
        guard Block.tags.contains(type), case .appBlock? = try? decode(Block.self) else { return true }
        return false
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
            case "list", "table": ["rows"]
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
            "scene": "lanes", "row": "rounds", "table": "rows",
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
