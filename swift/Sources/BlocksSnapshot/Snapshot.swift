import Blocks
import BlocksUI
import Foundation
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

/// A harness run: each shot's PNG and tree, the report, what the tree rules saw and the checks that failed.
public struct SnapshotRun: Sendable {
    public let report: Report
    public let pngs: [String: Data]
    public let trees: [String: TreeNode]
    public let seen: [Seen]
    public let faults: [String]

    /// Writes each shot's PNG and tree and the report into `dir`.
    public func save(to dir: URL) throws {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let json = JSONEncoder()
        json.outputFormatting = [.prettyPrinted, .sortedKeys]
        for name in report.shots {
            try pngs[name]?.write(to: dir.appendingPathComponent("\(name).png"))
            try json.encode(trees[name]).write(to: dir.appendingPathComponent("\(name).tree.json"))
        }
        try json.encode(report).write(to: dir.appendingPathComponent("report.json"))
    }
}

/// The block ids and action ids a screen draws, in drawn order: a `fixtures/ids` file.
public struct DrawnIdList: Codable, Equatable, Sendable {
    public let blocks: [String]
    public let actions: [String]

    public init(blocks: [String], actions: [String]) {
        self.blocks = blocks
        self.actions = actions
    }
}

/// Draws a screen with `ImageRenderer` at scale 2, runs scripted steps and checks the drawn tree.
@MainActor
public struct Snapshot {
    private var screen: Block
    private let size: CGSize
    private let look: Look
    private var wraps: [@MainActor (AnyView) -> AnyView] = []

    public init(_ screen: Block, size: CGSize = CGSize(width: 390, height: 844), look: Look = Look(still: true)) {
        self.screen = screen
        self.size = size
        self.look = look
    }

    /// Wraps every block of `type` in `style`, as `View.blockStyle` does in an app.
    public func blockStyle(_ type: String, _ style: some BlockStyle) -> Self {
        wrapped { AnyView($0.blockStyle(type, style)) }
    }

    /// Draws the app's own kinds with `blocks`, as `View.appBlocks` does in an app.
    public func appBlocks(_ blocks: AppBlocks) -> Self {
        wrapped { AnyView($0.appBlocks(blocks)) }
    }

    /// Draws each island with the app's view of its name, as `View.islands` does in an app.
    public func islands(_ views: [String: IslandDraw]) -> Self {
        wrapped { AnyView($0.islands(views)) }
    }

    /// The harness's test island: it draws its props and sends them back as `echo` each time it gets them.
    public static let echo: IslandDraw = { props, send in
        send("echo", props.fields)
        return AnyView(Text(String(decoding: (try? JSONEncoder().encode(props)) ?? Data(), as: UTF8.self)))
    }

    /// Runs `steps` (a shot named `name` at the end when they take none); `check` compares each tree with `expect`, its ids with `ids`, and `measure` its PNG with the look.
    public func run(
        _ steps: [Step], name: String = "shot", expect: TreeNode? = nil, ids: DrawnIdList? = nil, check: Bool = false,
        measure: Bool = false
    ) throws
        -> SnapshotRun
    {
        var screen = self.screen
        let key = try JSONValue(screen).id ?? ""
        var edits: BlockState = [:]
        var (shots, sent, dropped, times) = ([String](), [JSONValue](), [String](), [Double]())
        func hear(_ seen: Drawn) -> Drawn {
            for (id, (name, values)) in seen.heard.sorted(by: { $0.key < $1.key }) {
                if let values {
                    sent.append(.object(["screen": .string(key), "action": .string(name), "block": .string(id), "values": .object(values)]))
                } else {
                    dropped.append("event \(id) \(name)")
                }
            }
            return seen
        }
        let clock = ContinuousClock()
        let start = clock.now
        var seen = hear(draw(screen, edits))
        let paint = ms(clock.now - start)
        var (pngs, trees, found, faults) = ([String: Data](), [String: TreeNode](), [Seen](), [String]())
        func take(_ shot: String) throws {
            let tree = try seen.tree.decode(TreeNode.self)
            pngs[shot] = seen.png
            trees[shot] = tree
            shots.append(shot)
            if check, let expect { Self.same(expect, tree, shot, &faults) }
            if check {
                let probed = try Self.probe(tree, size.width).map {
                    try JSONValue.object(["rule": .string($0), "at": .string($1), "detail": .string($2), "shot": .string(shot)]).decode(Seen.self)
                }
                found += probed
                faults += probed.map { "\(shot): \($0.rule) \($0.at): \($0.detail)" }
            }
            if check, measure { faults += Self.measure(seen.png, tree, look: look).map { "\(shot): \($0)" } }
            if check, let ids, ids != seen.drawnIds {
                faults.append("\(shot): drew ids \(seen.drawnIds), expected \(ids)")
            }
        }
        for step in steps {
            let begun = clock.now
            switch step {
            case .tap(let on):
                let json = try JSONValue(screen)
                let state = Behaviour.state(json, edits: edits)
                let off = Behaviour(json, state: state).disabled.contains(on.id)
                let block = Self.find(json, on.id)
                let sets = (try? block?["tap"]?["set"]?.decode([SetState].self)) ?? []
                let set = Behaviour.tap(sets, state: state)
                edits.merge(set) { $1 }
                if !off, let tap = seen.taps[on.id] {
                    let names = Set(block?.list("fields").compactMap { $0.string("name") } ?? [])
                    let typed = edits.filter { names.contains($0.key) }.mapValues(\.json)
                    sent.append(
                        .object([
                            "screen": .string(key), "action": .string(tap.action), "block": .string(on.id),
                            "values": .object(tap.values.merging(typed) { $1 }),
                        ]))
                } else if off || set.isEmpty {
                    dropped.append("tap \(on.id)")
                }
                if !off, !set.isEmpty { seen = hear(draw(screen, edits)) }
            case .type(let typing):
                let json = try JSONValue(screen)
                let field = Self.find(json, typing.id).flatMap { $0.list("fields").first?.string("name") ?? $0.string("name") }
                let view = Behaviour(json, state: Behaviour.state(json, edits: edits))
                if let field, !view.hidden.contains(field), !view.disabled.contains(field) {
                    edits[field] = .string(typing.text)
                    seen = hear(draw(screen, edits))
                } else {
                    dropped.append("type \(typing.id)")
                }
            case .scroll(let on): dropped.append("scroll \(on.id)")
            case .frame(let frame):
                if let new = frame.screen { screen = new } else { try screen.apply(frame.ops ?? []) }
                seen = hear(draw(screen, edits))
            case .answer(let answer):
                try screen.apply(answer.ops ?? [])
                seen = hear(draw(screen, edits))
            case .shot(let shot): try take(shot.name)
            case .gesture(let g):
                let block = try? Self.find(try JSONValue(screen), g.id)?.decode(Block.self)
                let ways = Self.gestured(block, g).map { Self.sent(key, g.id, $0) }
                if ways.isEmpty { dropped.append("gesture \(g.via.rawValue) \(g.id)") } else { sent += ways }
            case .refuse: seen = hear(draw(screen, edits))
            case .unknown(let value): dropped.append("unknown \(value)")
            }
            times.append(ms(clock.now - begun))
        }
        if shots.isEmpty {
            let begun = clock.now
            try take(name)
            times.append(ms(clock.now - begun))
        }
        let report = try JSONValue.object([
            "shots": .array(shots.map(JSONValue.string)), "sent": .array(sent),
            "dropped": .array(dropped.map(JSONValue.string)),
            "timings": .object(["first_paint_ms": .number(paint), "steps_ms": .array(times.map(JSONValue.number))]),
        ]).decode(Report.self)
        return SnapshotRun(report: report, pngs: pngs, trees: trees, seen: found, faults: faults)
    }

    private func wrapped(_ wrap: @escaping @MainActor (AnyView) -> AnyView) -> Self {
        var copy = self
        copy.wraps.append(wrap)
        return copy
    }

    private func ms(_ d: Duration) -> Double {
        Double(d.components.seconds) * 1000 + Double(d.components.attoseconds) / 1e15
    }

    private static func gestured(_ block: Block?, _ g: StepGesture) -> [(Blocks.Gesture, JSONValue)] {
        if case .timeline(let t)? = block { return timed(t, g) }
        guard case .list(let l)? = block, let reorder = l.reorder, let grab = g.grab.string else { return [] }
        return ways(l, grab, g).map { (reorder, .array($0.map(JSONValue.string))) }
    }

    private static func timed(_ t: Timeline, _ g: StepGesture) -> [(Blocks.Gesture, JSONValue)] {
        let part = g.grab.string("part").flatMap(BarGrab.Part.init(rawValue:))
        let (grab, gesture): (BarGrab?, Blocks.Gesture?) =
            if let row = g.grab.string("row") { (.row(row), t.draw) } else if let bar = g.grab.string("bar"), let part {
                (.bar(bar, part), part == .body ? t.move : t.stretch)
            } else { (nil, nil) }
        guard let grab, let gesture else { return [] }
        return ways(t, grab, g).compactMap { span in (try? JSONValue(span)).map { (gesture, $0) } }
    }

    private static func ways<R: Rules>(_ rules: R, _ grab: R.Grab, _ g: StepGesture) -> [R.Change] {
        guard var d = Driven(rules, grab) else { return [] }
        switch g.via {
        case .keys:
            d.on(.press)
            for r in g.reach {
                if let dir = r.string("dir").flatMap(Nudge.Dir.init(rawValue:)) { d.nudge(Nudge(dir, big: r["big"]?.bool ?? false)) }
            }
            guard case .send(let c)? = d.on(.release) else { return [] }
            return [c]
        case .action:
            let steps = rules.steps(grab)
            return g.reach.compactMap { name in
                guard var one = Driven(rules, grab), let n = steps.first(where: { $0.0 == name.string })?.1,
                    case .send(let c)? = one.named(n)
                else { return nil }
                return c
            }
        default: return []
        }
    }

    private static func sent(_ screen: String, _ id: String, _ way: (Blocks.Gesture, JSONValue)) -> JSONValue {
        .object([
            "screen": .string(screen), "action": .string(way.0.action), "block": .string(id),
            "values": .object([way.0.name: way.1]),
        ])
    }

    private static func find(_ b: JSONValue, _ id: String) -> JSONValue? {
        if b.id == id { return b }
        let kids = b.list("blocks") + b.list("rows") + b.list("buttons") + b.list("rounds").flatMap { $0.list("blocks") }
        return kids.lazy.compactMap { find($0, id) }.first
    }

    private func draw(_ screen: Block, _ edits: BlockState) -> Drawn {
        let seen = Drawn()
        var view = AnyView(
            BlocksView(screen, source: .core, state: edits).padding(BlocksView.inset)
                .frame(width: size.width, height: size.height, alignment: .topLeading))
        for wrap in wraps { view = wrap(view) }
        let root = view.islands(["x-echo": Self.echo]).hearsIslands { seen.heard[$0] = ($1, $2) }.reportsBlocks().background(look.palette.background).environment(\.look, look)
            .environment(\.colorScheme, look.palette.dark ? .dark : .light)
            .overlayPreferenceValue(DrawnBlocks.self) { blocks in
                GeometryReader { proxy in seen.keep(blocks, proxy) }
            }
            .overlayPreferenceValue(DrawnIds.self) { ids in seen.keep(ids) }
        let renderer = ImageRenderer(content: root)
        renderer.scale = 2
        if let image = renderer.cgImage { seen.png = Self.png(image) }
        return seen
    }

    private static func png(_ image: CGImage) -> Data {
        let data = NSMutableData()
        guard let out = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
            return Data()
        }
        CGImageDestinationAddImage(out, image, nil)
        return CGImageDestinationFinalize(out) ? data as Data : Data()
    }

    private static func who(_ n: TreeNode) -> String { n.kind + (n.id.map { "#\($0)" } ?? "") }

    private static func same(_ want: TreeNode, _ got: TreeNode?, _ at: String, _ out: inout [String]) {
        guard let got, want.kind == got.kind, want.id == got.id, want.drawn == got.drawn else {
            let drew = got.map { "\(who($0)) \($0.drawn.rawValue)" } ?? "nothing"
            return out.append("\(at): drew \(drew), expected \(who(want)) \(want.drawn.rawValue)")
        }
        let here = "\(at)/\(who(got))"
        if want.role != got.role || want.name != got.name {
            out.append("\(here): drew \(got.role) \"\(got.name)\", expected \(want.role) \"\(want.name)\"")
        }
        if want.children.count != got.children.count {
            out.append("\(here): \(got.children.count) children, expected \(want.children.count)")
        }
        for (i, child) in want.children.enumerated() {
            same(child, got.children.indices.contains(i) ? got.children[i] : nil, here, &out)
        }
    }

    private static func probe(_ tree: TreeNode, _ width: CGFloat) -> [(String, String, String)] {
        func walk(_ n: TreeNode, _ at: String) -> [(TreeNode, String)] {
            [(n, at)] + n.children.indices.flatMap { walk(n.children[$0], "\(at)/\(step(n.children, $0))") }
        }
        let blocks = walk(tree, step([tree], 0))
        let px = { (v: CGFloat) in String(format: "%g", v) }
        let unnamed = blocks.filter { $0.0.role.isEmpty || $0.0.name.isEmpty }.map {
            ("render/no-name", $0.1, $0.0.role.isEmpty ? "the block has no role" : "the block has no name")
        }
        let sizeless = blocks.filter { $0.0.drawn != .hidden }.map { ($0.1, rect($0.0)) }.filter { !($1.width > 0 && $1.height > 0) }.map {
            ("render/no-size", $0, "\(px($1.width)) by \(px($1.height)) px")
        }
        let outside = blocks.map { ($0.1, rect($0.0)) }.filter { $1.minX < -0.5 || $1.maxX > width + 0.5 }.map {
            ("render/overflow", $0, "the block spans \(px($1.minX.rounded())) to \(px($1.maxX.rounded())) px in a \(px(width)) px screen")
        }
        let wide = blocks.map { rect($0.0).maxX }.max() ?? 0
        let page = wide > width + 0.5 ? [("render/overflow", "", "the page is \(px(wide.rounded())) px wide in a \(px(width)) px screen")] : []
        let covered = blocks.flatMap { n, at in
            let kids = n.children.indices.filter { n.children[$0].drawn != .hidden }
            return kids.enumerated().flatMap { i, a in
                kids.dropFirst(i + 1).filter { b in
                    let both = rect(n.children[a]).intersection(rect(n.children[b]))
                    return !both.isNull && both.width > 0.5 && both.height > 0.5
                }.map { ("render/overlap", "\(at)/\(step(n.children, a))", "it covers \(step(n.children, $0))") }
            }
        }
        return unnamed + sizeless + outside + page + covered
    }

    private static func step(_ sibs: [TreeNode], _ i: Int) -> String {
        let n = sibs[i]
        if let id = n.id { return "\(n.kind)#\(id)" }
        return "\(n.kind)~\(sibs[..<i].filter { $0.id == nil && $0.kind == n.kind }.count)"
    }

    private static func rect(_ n: TreeNode) -> CGRect {
        guard let r = n.rect, r.count == 4 else { return .zero }
        return CGRect(x: r[0], y: r[1], width: r[2], height: r[3])
    }
}

@MainActor
private final class Drawn {
    var tree: JSONValue = .null
    var taps: [String: BlockAction] = [:]
    var heard: [String: (String, [String: JSONValue]?)] = [:]
    var png = Data()
    var drawnIds = DrawnIdList(blocks: [], actions: [])

    func keep(_ ids: [String]) -> Color {
        let of = { (kind: String) in ids.filter { $0.hasPrefix(kind) }.map { String($0.dropFirst(kind.count)) } }
        drawnIds = DrawnIdList(blocks: of("block:"), actions: of("action:"))
        return .clear
    }

    func keep(_ blocks: [DrawnBlock], _ proxy: GeometryProxy) -> Color {
        tree = blocks.first.map { node($0, proxy) } ?? .null
        return .clear
    }

    private func node(_ b: DrawnBlock, _ proxy: GeometryProxy) -> JSONValue {
        let r = proxy[b.bounds]
        if let id = b.id, let tap = b.tap, !b.hidden, taps[id] == nil { taps[id] = tap }
        return .object([
            "kind": .string(b.kind), "id": b.id.map(JSONValue.string) ?? .null,
            "variant": b.variant.map(JSONValue.string) ?? .null, "drawn": .string(b.hidden ? "hidden" : b.native ? "native" : "fallback"),
            "role": .string(b.role), "name": .string(b.name),
            "rect": .array([r.minX, r.minY, r.width, r.height].map { .number(Double($0)) }),
            "children": .array(b.children.map { node($0, proxy) }),
        ])
    }
}
