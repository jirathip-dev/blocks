import Foundation

/// The two widths a layout places for: iPhone is `compact`, iPad and Mac are `wide`.
public enum SizeClass: Sendable {
    case compact, wide
}

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
