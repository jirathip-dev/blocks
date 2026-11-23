extension Block {
    /// Applies a `points` or a block's `merge` on the typed screen, after the JSON ops before it; false when the op goes through the JSON tree.
    package mutating func direct(_ op: Op, after tree: inout [Op]) throws(ApplyError) -> Bool {
        switch op {
        case .points(let p):
            try throughTree(tree)
            tree = []
            var grew = true
            let found = try edit(p.id) { b in
                guard case .plot(var plot) = b, plot.grow(p) else {
                    grew = false
                    return
                }
                b = .plot(plot)
            }
            guard found else { throw .noBlock(p.id) }
            guard grew else { throw .shape("block `\(p.id)` does not take the points") }
            return true
        case .merge(let m):
            try throughTree(tree)
            tree = []
            return try edit(m.id) { b throws(ApplyError) in b = try b.merged(m.id, m.fields) }
        default:
            return false
        }
    }

    /// Changes the block `id` names, reached through the typed lists the JSON walk reaches; false when no block has it.
    package mutating func edit(_ id: String, _ change: (inout Block) throws(ApplyError) -> Void) throws(ApplyError) -> Bool {
        if typeAndID.id == id {
            try change(&self)
            return true
        }
        func walk(_ list: inout [Block]?) throws(ApplyError) -> Bool { try Self.edit(&list, id, change) }
        switch self {
        case .screen(var b):
            self = .appBlock(.null)
            defer { self = .screen(b) }
            return try walk(&b.blocks)
        case .modal(var b), .sheet(var b):
            let sheet = if case .sheet = self { true } else { false }
            self = .appBlock(.null)
            var kids: [Block]? = b.blocks
            defer {
                b.blocks = kids ?? []
                self = sheet ? .sheet(b) : .modal(b)
            }
            return try walk(&kids)
        case .section(var b):
            self = .appBlock(.null)
            var kids: [Block]? = b.blocks
            defer {
                b.blocks = kids ?? []
                self = .section(b)
            }
            return try walk(&kids)
        case .list(var b):
            self = .appBlock(.null)
            var kids: [Block]? = b.rows
            defer {
                b.rows = kids ?? []
                self = .list(b)
            }
            return try walk(&kids)
        case .card(var b):
            self = .appBlock(.null)
            defer { self = .card(b) }
            if try walk(&b.blocks) { return true }
            return try walk(&b.buttons)
        case .message(var b):
            self = .appBlock(.null)
            defer { self = .message(b) }
            return try walk(&b.blocks)
        case .row(var b):
            guard var rounds = b.rounds else { return false }
            self = .appBlock(.null)
            b.rounds = nil
            defer {
                b.rounds = rounds
                self = .row(b)
            }
            for i in rounds.indices where try walk(&rounds[i].blocks) { return true }
            return false
        default:
            return false
        }
    }

    private static func edit(_ list: inout [Block]?, _ id: String, _ change: (inout Block) throws(ApplyError) -> Void) throws(ApplyError) -> Bool {
        guard var kids = list else { return false }
        list = nil
        defer { list = kids }
        for i in kids.indices where try kids[i].edit(id, change) { return true }
        return false
    }

    private func merged(_ id: String, _ fields: [String: JSONValue]) throws(ApplyError) -> Block {
        var bare = self
        var kept: [Trace]?
        if case .plot(var p) = self, fields["series"] == nil {
            kept = p.series
            p.series = p.series.map { Trace(name: $0.name, tone: $0.tone, x: [], y: []) }
            bare = .plot(p)
        }
        do {
            let old = try JSONValue(bare)
            let new = JSONValue.object(old.fields.merging(fields) { $1 })
            var out = try new.decode(Block.self)
            if case .appBlock = out, Block.tags.contains(new.type), Block.tags.contains(old.type) {
                throw ApplyError.shape("block `\(id)` no longer fits its kind")
            }
            if let kept, case .plot(var p) = out {
                p.series = kept
                out = .plot(p)
            }
            return out
        } catch let e as ApplyError {
            throw e
        } catch {
            throw .shape("\(error)")
        }
    }
}
