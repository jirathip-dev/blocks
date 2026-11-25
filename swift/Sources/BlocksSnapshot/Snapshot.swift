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
        let checks = check ? Check(expect: expect, ids: ids, measure: measure, width: size.width, look: look) : nil
        let clock = ContinuousClock()
        let start = clock.now
        var run = try Run(screen, check: checks, draw: draw)
        let paint = ms(clock.now - start)
        for step in steps {
            let begun = clock.now
            switch step {
            case .tap(let on): try run.tap(on)
            case .type(let typing): try run.type(typing)
            case .scroll(let on): run.scroll(on)
            case .frame(let frame): try run.frame(frame)
            case .answer(let answer): try run.answer(answer)
            case .shot(let shot): try run.take(shot.name)
            case .gesture(let g): try run.gesture(g)
            case .refuse(let refuse): run.refuse(refuse)
            case .file(let f): try run.file(f)
            case .slide(let s): try run.slide(s)
            case .unknown(let value): run.unknown(value)
            }
            run.out.times.append(ms(clock.now - begun))
        }
        if run.out.shots.isEmpty {
            let begun = clock.now
            try run.take(name)
            run.out.times.append(ms(clock.now - begun))
        }
        return try run.report(paint: paint)
    }

    private func wrapped(_ wrap: @escaping @MainActor (AnyView) -> AnyView) -> Self {
        var copy = self
        copy.wraps.append(wrap)
        return copy
    }

    private func ms(_ d: Duration) -> Double {
        Double(d.components.seconds) * 1000 + Double(d.components.attoseconds) / 1e15
    }

    private func draw(_ run: Run) -> Drawn {
        let seen = Drawn()
        var view = AnyView(
            BlocksView(run.screen, source: .core, state: run.edits).padding(BlocksView.inset)
                .frame(width: size.width, height: size.height, alignment: .topLeading))
        for wrap in wraps { view = wrap(view) }
        let root = view.opened(run.opened).fileRows(run.picks.rows).onFile { _, about in FileRef(about.name) }.islands(["x-echo": Self.echo]).hearsIslands { seen.heard[$0] = ($1, $2) }.reportsBlocks().background(look.palette.background).environment(\.look, look)
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

    internal static func png(_ image: CGImage) -> Data {
        let data = NSMutableData()
        guard let out = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
            return Data()
        }
        CGImageDestinationAddImage(out, image, nil)
        return CGImageDestinationFinalize(out) ? data as Data : Data()
    }
}
