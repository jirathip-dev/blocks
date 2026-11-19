import Blocks
import BlocksUI
import Foundation
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

/// A harness run: each shot's PNG and tree, the report and the checks that failed.
public struct SnapshotRun: Sendable {
    public let report: Report
    public let pngs: [String: Data]
    public let trees: [String: TreeNode]
    public let faults: [String]
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

    /// Runs `steps` (a shot named `name` at the end when they take none); `check` compares each tree with `expect`, its ids with `ids`.
    public func run(
        _ steps: [Step], name: String = "shot", expect: TreeNode? = nil, ids: DrawnIdList? = nil, check: Bool = false
    ) throws
        -> SnapshotRun
    {
        var screen = self.screen
        let key = try JSONValue(screen).id ?? ""
        var edits: BlockState = [:]
        var (shots, sent, dropped, times) = ([String](), [JSONValue](), [String](), [Double]())
        func hear(_ seen: Seen) -> Seen {
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
        var (pngs, trees, faults) = ([String: Data](), [String: TreeNode](), [String]())
        func take(_ shot: String) throws {
            let tree = try seen.tree.decode(TreeNode.self)
            pngs[shot] = seen.png
            trees[shot] = tree
            shots.append(shot)
            if check, let expect { Self.same(expect, tree, shot, &faults) }
            if check { Self.fit(tree, size.width, shot, &faults) }
            if check { Self.named(tree, shot, &faults) }
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
        return SnapshotRun(report: report, pngs: pngs, trees: trees, faults: faults)
    }

    private func wrapped(_ wrap: @escaping @MainActor (AnyView) -> AnyView) -> Self {
        var copy = self
        copy.wraps.append(wrap)
        return copy
    }

    private func ms(_ d: Duration) -> Double {
        Double(d.components.seconds) * 1000 + Double(d.components.attoseconds) / 1e15
    }

    private static func find(_ b: JSONValue, _ id: String) -> JSONValue? {
        if b.id == id { return b }
        let kids = b.list("blocks") + b.list("rows") + b.list("buttons") + b.list("rounds").flatMap { $0.list("blocks") }
        return kids.lazy.compactMap { find($0, id) }.first
    }

    private func draw(_ screen: Block, _ edits: BlockState) -> Seen {
        let seen = Seen()
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

    private static func named(_ n: TreeNode, _ at: String, _ out: inout [String]) {
        let here = "\(at)/\(who(n))"
        if n.role.isEmpty { out.append("\(here): has no role") }
        if n.name.isEmpty { out.append("\(here): has no name") }
        for child in n.children { named(child, here, &out) }
    }

    private static func fit(_ n: TreeNode, _ width: CGFloat, _ at: String, _ out: inout [String]) {
        let here = "\(at)/\(who(n))"
        let r = rect(n)
        if !(r.width > 0 && r.height > 0) { out.append("\(here): has no size") }
        if r.minX < -0.5 || r.maxX > width + 0.5 { out.append("\(here): leaves the screen's width") }
        let kids = n.children.filter { $0.drawn != .hidden }
        for (i, a) in kids.enumerated() {
            for b in kids.dropFirst(i + 1) {
                let both = rect(a).intersection(rect(b))
                if !both.isNull, both.width > 0.5, both.height > 0.5 { out.append("\(here): \(who(a)) overlaps \(who(b))") }
            }
        }
        for child in kids { fit(child, width, here, &out) }
    }

    private static func rect(_ n: TreeNode) -> CGRect {
        guard let r = n.rect, r.count == 4 else { return .zero }
        return CGRect(x: r[0], y: r[1], width: r[2], height: r[3])
    }
}

@MainActor
private final class Seen {
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
