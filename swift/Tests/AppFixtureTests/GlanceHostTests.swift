import AppIntents
import AppKit
import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import WidgetKit
import XCTest

struct StopIntent: AppIntent {
    static let title: LocalizedStringResource = "Stop"
    @Parameter(title: "Thread") var thread: String

    init() {}

    init(thread: String) {
        self.thread = thread
    }

    func perform() async throws -> some IntentResult { .result() }
}

enum Host {
    static let file = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.app")?
        .appendingPathComponent("glance.json")

    static func link(_ tap: Tap) -> URL? { tap.thread.flatMap { URL(string: "app://thread/\($0)") } }

    static func intent(_ sent: BlockAction) -> (any AppIntent)? {
        sent.action == "stop" ? StopIntent(thread: sent.values["thread"]?.string ?? "") : nil
    }
}

extension View {
    func hosted(_ palette: BlocksUI.Palette) -> some View {
        blocksLook(BlocksUI.Look(palette: palette)).glanceTaps(link: Host.link, intent: Host.intent)
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let screen: Block?
}

struct Feed: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, screen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(entry) }
    func getTimeline(in context: Context, completion: @escaping (WidgetKit.Timeline<Entry>) -> Void) {
        completion(WidgetKit.Timeline(entries: [entry], policy: .never))
    }

    private var entry: Entry {
        let data = Host.file.flatMap { try? Data(contentsOf: $0) }
        return Entry(date: .now, screen: data.flatMap { try? JSONDecoder().decode(Block.self, from: $0) })
    }
}

struct NeedsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "needs", provider: Feed()) { entry in Card(glance: entry.screen?.glance("needs")) }
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct Card: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let glance: Glance?

    var body: some View {
        let palette: BlocksUI.Palette = scheme == .dark ? .defaultDark : .defaultLight
        Group {
            if let glance { GlanceView(glance, family == .systemMedium ? .medium : .small) }
        }
        .hosted(palette).widgetURL(glance?.tap.flatMap(Host.link))
        .containerBackground(palette.background, for: .widget)
    }
}

struct Notch: View {
    @State private var open = false
    let glance: Glance
    let gap: CGFloat

    var body: some View {
        Group {
            if open {
                GlanceView(glance, .expanded).padding(BlocksView.inset)
            } else {
                HStack(spacing: gap) {
                    GlanceView(glance, .leading)
                    GlanceView(glance, .trailing)
                }
            }
        }
        .hosted(.defaultDark).background(BlocksUI.Palette.defaultDark.background).onHover { open = $0 }
    }
}

@MainActor func notch(_ glance: Glance, over frame: NSRect, gap: CGFloat) -> NSPanel {
    let panel = NSPanel(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.level = .statusBar
    panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
    panel.contentView = NSHostingView(rootView: Notch(glance: glance, gap: gap))
    panel.orderFrontRegardless()
    return panel
}

@MainActor
final class GlanceHostTests: XCTestCase {
    private var root: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..") }

    func testTheDocsHostHandsTheStopActToItsIntentAndTheTapToItsLink() throws {
        let data = try Data(contentsOf: root.appendingPathComponent("fixtures/blocks/glance.json"))
        guard case .glance(let turn) = try JSONDecoder().decode(Block.self, from: data) else { return XCTFail("no glance") }
        let stop = try XCTUnwrap(turn.expanded?.acts?.first)
        let sent = BlockAction(action: try XCTUnwrap(stop.action), block: turn.id, values: stop.values ?? [:])
        XCTAssertEqual((Host.intent(sent) as? StopIntent)?.thread, "t-42")
        XCTAssertEqual(turn.tap.flatMap(Host.link), URL(string: "app://thread/t-42"))
        let panel = notch(turn, over: NSRect(x: 0, y: 0, width: 400, height: 32), gap: 200)
        XCTAssertGreaterThan(try XCTUnwrap(panel.contentView).fittingSize.width, 200)
        panel.close()
    }
}
