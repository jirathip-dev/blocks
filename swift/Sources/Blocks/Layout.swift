import Foundation

/// A node's place on each size class; a size the file leaves out inherits the other.
public struct Placement: Sendable, Equatable {
    public let compact: LayoutPlace
    public let wide: LayoutPlace

    /// The place on one size class.
    public func on(_ size: SizeClass) -> LayoutPlace { size == .compact ? compact : wide }
}

/// What a node draws: a screen of blocks from a source, or a component.
public enum LayoutContent: Sendable, Equatable {
    case screen(source: String, path: String)
    case component(String)
}

/// One node of the tree: placed by `Placement` as checked, by `LayoutPlace` once resolved.
public struct LayoutNode<Place: Sendable & Equatable>: Sendable, Equatable {
    public let id: String
    public let content: LayoutContent
    public let label: String?
    public let place: Place
    public let transition: LayoutTransition
    public let config: [String: JSONValue]
    public let slots: [String: [Self]]
}

/// Why a layout was refused: the rule it breaks, worded as the Rust reader words it.
public struct LayoutBroken: Error, Equatable {
    public let why: String
}

/// The owner's `layout.json`, checked against an app's `Contract` by the same rules as `blocks::layout::check`.
public struct Layout: Sendable, Equatable {
    /// A component an app draws: the slots it holds and the config keys it reads.
    public struct Component: Sendable {
        public let kind: String
        public let slots: Set<String>
        public let config: Set<String>

        public init(kind: String, slots: Set<String> = [], config: Set<String> = []) {
            (self.kind, self.slots, self.config) = (kind, slots, config)
        }
    }

    /// The app's part: its components beside `nav`, and the screens no file may place, replace or hide.
    public struct Contract: Sendable {
        public let components: [Component]
        public let locked: Set<String>

        public init(components: [Component], locked: Set<String>) {
            (self.components, self.locked) = (components, locked)
        }

        fileprivate func component(_ kind: String) -> Component? {
            kind == Layout.nav.kind ? Layout.nav : components.first { $0.kind == kind }
        }
    }

    fileprivate static let nav = Component(kind: "nav", slots: ["side", "main", "menu"])
    fileprivate static let maxBytes = 64 * 1024

    public let format: Int
    public let theme: String?
    public let root: LayoutNode<Placement>

    /// `json` as a layout, refused by the first rule it breaks.
    public init(json: Data, contract: Contract) throws(LayoutBroken) {
        guard json.count <= Self.maxBytes else { throw LayoutBroken(why: "over \(Self.maxBytes) bytes") }
        guard let file = try? JSONDecoder().decode(JSONValue.self, from: json) else {
            throw LayoutBroken(why: "not JSON")
        }
        guard file["format"]?.number == 1 else { throw LayoutBroken(why: "format: this reader takes 1") }
        let rootJSON = file["root"] ?? .null
        guard rootJSON.type == Self.nav.kind else { throw LayoutBroken(why: "root: not a nav") }
        var reader = Reader(contract: contract)
        let root = try reader.node(rootJSON, at: "root", depth: 1)
        guard root.place.compact != .hidden, root.place.wide != .hidden else {
            throw LayoutBroken(why: "root: may not be hidden")
        }
        (format, theme, self.root) = (1, file.string("theme"), root)
    }

    /// The tree with one place per node for `size`.
    public func resolved(for size: SizeClass) -> LayoutNode<LayoutPlace> { Self.resolve(root, size) }

    private static func resolve(_ n: LayoutNode<Placement>, _ size: SizeClass) -> LayoutNode<LayoutPlace> {
        LayoutNode(
            id: n.id, content: n.content, label: n.label, place: n.place.on(size), transition: n.transition,
            config: n.config, slots: n.slots.mapValues { $0.map { resolve($0, size) } })
    }
}

private struct Reader {
    private static let maxDepth = 6
    private static let maxNodes = 200
    let contract: Layout.Contract
    private var ids: Set<String> = []
    private var count = 0

    init(contract: Layout.Contract) { self.contract = contract }

    mutating func node(_ n: JSONValue, at path: String, depth: Int) throws(LayoutBroken) -> LayoutNode<Placement> {
        func fail(_ what: String, _ bad: String) -> LayoutBroken { LayoutBroken(why: "\(path): \(what) \"\(bad)\"") }
        guard depth <= Self.maxDepth else { throw LayoutBroken(why: "\(path): over \(Self.maxDepth) deep") }
        count += 1
        guard count <= Self.maxNodes else { throw LayoutBroken(why: "over \(Self.maxNodes) nodes") }
        let (kind, source, screen) = (n.type, n.string("source") ?? "", n.string("path") ?? "")
        let content: LayoutContent
        var component: Layout.Component?
        if kind == "screen" {
            guard !source.isEmpty, screen.hasPrefix("/screens/") else {
                throw fail("a screen needs a source and a path under /screens/, not", screen)
            }
            guard !contract.locked.contains(screen) else { throw fail("a locked screen can't be placed:", screen) }
            content = .screen(source: source, path: screen)
        } else {
            guard let found = contract.component(kind) else { throw fail("unknown type", kind) }
            (content, component) = (.component(kind), found)
        }
        let id = n.string("id") ?? (kind == "screen" ? "\(source):\(screen)" : kind)
        guard ids.insert(id).inserted else { throw LayoutBroken(why: "\(path): id \"\(id)\" is taken") }
        let place = try Self.placement(n["place"]) { bad throws(LayoutBroken) in throw fail("unknown place", bad) }
        var transition = LayoutTransition.push
        if let t = n["transition"] {
            let name = t.string ?? ""
            guard LayoutTransition.all.contains(LayoutTransition(rawValue: name)) else {
                throw fail("unknown transition", name)
            }
            transition = LayoutTransition(rawValue: name)
        }
        let config = n["config"]?.fields ?? [:]
        if let key = config.keys.sorted().first(where: { !(component?.config ?? []).contains($0) }) {
            throw fail("unknown config", key)
        }
        let slots = n["slots"]?.fields ?? [:]
        var children: [String: [LayoutNode<Placement>]] = [:]
        for name in slots.keys.sorted() {
            guard component?.slots.contains(name) == true else { throw fail("unknown slot", name) }
            var list: [LayoutNode<Placement>] = []
            for (i, child) in (slots[name]?.items ?? []).enumerated() {
                list.append(try node(child, at: "\(path).slots.\(name)[\(i)]", depth: depth + 1))
            }
            children[name] = list
        }
        return LayoutNode(
            id: id, content: content, label: n.string("label"), place: place, transition: transition,
            config: config, slots: children)
    }

    private static func placement(
        _ json: JSONValue?, _ fail: (String) throws(LayoutBroken) -> Never
    ) throws(LayoutBroken) -> Placement {
        let (compact, wide): (String?, String?)
        switch json {
        case nil: (compact, wide) = ("inline", "inline")
        case .string(let both)?: (compact, wide) = (both, both)
        case let sizes?: (compact, wide) = (sizes.string("compact") ?? sizes.string("wide"), sizes.string("wide") ?? sizes.string("compact"))
        }
        func one(_ raw: String?) throws(LayoutBroken) -> LayoutPlace {
            let place = LayoutPlace(rawValue: raw ?? "")
            guard LayoutPlace.all.contains(place) else { try fail(raw ?? "") }
            return place
        }
        return Placement(compact: try one(compact), wide: try one(wide))
    }
}

extension LayoutNode {
    private var kids: [Self] { slots.keys.sorted().flatMap { slots[$0] ?? [] } }
    private var height: Int { 1 + (kids.map(\.height).max() ?? 0) }

    private func path(to id: String) -> [String]? {
        if self.id == id { return [id] }
        return kids.lazy.compactMap { $0.path(to: id).map { [self.id] + $0 } }.first
    }

    fileprivate func find(_ id: String) -> Self? { self.id == id ? self : kids.lazy.compactMap { $0.find(id) }.first }

    /// Where a grabbed node is now, as the move that leaves it there; nil for the root.
    public func stay(_ grabbed: String) -> LayoutEdit? {
        for slot in slots.keys.sorted() {
            let list = slots[slot] ?? []
            if let i = list.firstIndex(where: { $0.id == grabbed }) {
                let next = list.indices.contains(i + 1) ? list[i + 1].id : nil
                return .move(LayoutEditMove(before: next, id: grabbed, into: id, slot: slot))
            }
        }
        return kids.lazy.compactMap { $0.stay(grabbed) }.first
    }

    /// Every place a grabbed node can go, where it is now included, in reading order: the list the arrow keys walk.
    public func places(_ held: [String: [String]], grabbed: String) -> [LayoutEdit] {
        guard let at = path(to: grabbed), at.count > 1, let g = find(grabbed) else { return [] }
        let (h, depth, above) = (g.height, at.count, Set(at.dropLast()))
        var out: [LayoutEdit] = []
        func walk(_ host: Self, _ d: Int) {
            guard case .component(let kind) = host.content else { return }
            let fits = d + h <= 6
            for slot in (held[kind] ?? []).sorted() {
                for k in host.slots[slot] ?? [] where k.id != grabbed {
                    if fits { out.append(.move(LayoutEditMove(before: k.id, id: grabbed, into: host.id, slot: slot))) }
                    if fits, !above.contains(k.id), depth + k.height <= 7 {
                        out.append(.swap(LayoutEditSwap(a: grabbed, b: k.id)))
                    }
                    walk(k, d + 1)
                }
                if fits { out.append(.move(LayoutEditMove(before: nil, id: grabbed, into: host.id, slot: slot))) }
            }
        }
        walk(self, 1)
        return out
    }

    /// Every edit a grabbed node can end in, in reading order, as the crate's `layout::drops`.
    public func drops(_ held: [String: [String]], grabbed: String) -> [LayoutEdit] {
        let now = stay(grabbed)
        return places(held, grabbed: grabbed).filter { $0 != now }
    }
}

extension LayoutEdit {
    /// How node `id` shows on `size`.
    public static func showing(_ id: String, on size: SizeClass, as place: LayoutPlace) -> Self {
        .show(LayoutEditShow(id: id, place: place, size: size))
    }
}

extension Gesture {
    /// A layout's edit: what the edit mode's driver sends, to the host's `save` and never to a source.
    public static let layout = Gesture(action: "layout", enabled: nil, name: "edit")
}

/// The edit mode's rules for one resolved tree: a grab is a node's id, a reach is a count of places, a change is an edit.
public struct LayoutRules: Rules {
    public let tree: LayoutNode<LayoutPlace>
    public let held: [String: [String]]

    public init(tree: LayoutNode<LayoutPlace>, held: [String: [String]]) { (self.tree, self.held) = (tree, held) }

    private func name(_ id: String) -> String { tree.find(id)?.label ?? id }

    private func slot(_ e: LayoutEdit) -> String {
        if case .move(let m) = e { return "\(m.into)\n\(m.slot)" }
        return ""
    }

    private func walk(_ g: String, _ from: LayoutEdit, _ step: Int, _ ok: (LayoutEdit) -> Bool) -> LayoutEdit? {
        let all = tree.places(held, grabbed: g)
        guard let i = all.firstIndex(of: from) else { return nil }
        return stride(from: i + step, to: step < 0 ? -1 : all.count, by: step).lazy.map { all[$0] }.first(where: ok)
    }

    public func word(_ grab: String) -> Word? { tree.stay(grab) == nil ? nil : .move }
    public func start(_ grab: String) -> LayoutEdit? { tree.stay(grab) }

    public func candidate(_ grab: String, _ reach: Int) -> LayoutEdit? {
        let all = tree.places(held, grabbed: grab)
        guard let s = tree.stay(grab), let i = all.firstIndex(of: s) else { return nil }
        return all.indices.contains(i + reach) ? all[i + reach] : nil
    }

    public func nudge(_ grab: String, from: LayoutEdit, by: Nudge) -> LayoutEdit? {
        let step = by.dir == .up || by.dir == .left ? -1 : 1
        if by.dir == .left || by.dir == .right {
            return walk(grab, from, step) { if case .swap = $0 { true } else { false } }
        }
        return walk(grab, from, step) { e in
            if case .move = e { !by.big || slot(e) != slot(from) } else { false }
        }
    }

    public func steps(_ grab: String) -> [(String, Nudge)] {
        [
            ("Move earlier", Nudge(.up)), ("Move later", Nudge(.down)), ("Swap with the previous", Nudge(.left)),
            ("Swap with the next", Nudge(.right)), ("Move to the previous slot", Nudge(.up, big: true)),
            ("Move to the next slot", Nudge(.down, big: true)),
        ]
    }

    public func says(_ grab: String, _ change: LayoutEdit) -> String {
        switch change {
        case .swap(let s): "swapped with \(name(s.b))"
        case .move(let m): "\(m.before.map { "before \(name($0))" } ?? "last") in \(m.slot) of \(name(m.into))"
        case .show(let s): s.place.rawValue
        case .unknown: ""
        }
    }
}
