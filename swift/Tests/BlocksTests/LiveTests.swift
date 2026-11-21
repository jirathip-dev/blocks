import AppKit
import Blocks
import BlocksUI
import Foundation
import SwiftUI
import XCTest

private struct Name: View {
    @State private var text = ""

    var body: some View { SwiftUI.TextField("Name", text: $text) }
}

private final class Keyed: NSWindow {
    override var canBecomeKey: Bool { true }
}

@MainActor
private final class Frames {
    var all: [String: CGRect] = [:]

    func keep(_ blocks: [DrawnBlock], _ proxy: GeometryProxy) -> Color {
        func walk(_ b: DrawnBlock) {
            if let id = b.id { all[id] = proxy[b.bounds] }
            b.children.forEach(walk)
        }
        blocks.forEach(walk)
        return .clear
    }
}

@MainActor
final class LiveTests: XCTestCase {
    private func block(_ json: String) throws -> Block { try JSONDecoder().decode(Block.self, from: Data(json.utf8)) }

    private func hosted(_ view: some View) -> (NSHostingView<AnyView>, NSWindow) {
        let host = NSHostingView(rootView: AnyView(view.frame(width: 390, height: 600).environment(\.look, Look(still: true))))
        let window = Keyed(contentRect: CGRect(x: 0, y: 0, width: 390, height: 600), styleMask: [], backing: .buffered, defer: false)
        window.contentView = host
        window.setFrameOrigin(CGPoint(x: -10_000, y: -10_000))
        window.orderFrontRegardless()
        window.makeKey()
        host.layout()
        return (host, window)
    }

    private func fields(_ view: NSView) -> [NSTextField] {
        view.subviews.flatMap { sub in (sub as? NSTextField).map { [$0] } ?? fields(sub) }
    }

    private func click(_ window: NSWindow, _ frames: Frames, _ id: String) async throws {
        let rect = try XCTUnwrap(frames.all[id], "no block \(id)")
        let at = CGPoint(x: rect.midX, y: window.frame.height - rect.midY)
        for type in [NSEvent.EventType.leftMouseDown, .leftMouseUp] {
            let event = try XCTUnwrap(
                NSEvent.mouseEvent(
                    with: type, location: at, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime, windowNumber: window.windowNumber, context: nil,
                    eventNumber: 0, clickCount: 1, pressure: 1))
            window.sendEvent(event)
            for _ in 0..<10 { await Task.yield() }
        }
    }

    func testATypedFieldKeepsItsTextAndFocusWhenABlockIsInsertedAboveIt() async throws {
        let apps = try AppBlocks(["name": { _ in AnyView(Name()) }])
        let one = try block(#"{"type": "screen", "id": "s", "blocks": [{"type": "name", "id": "who"}]}"#)
        var two = one
        let insert = #"[{"op": "insert", "into": "s", "before": "who", "block": {"type": "text", "id": "t", "text": "New"}}]"#
        try two.apply(try JSONDecoder().decode([Op].self, from: Data(insert.utf8)))
        let (host, window) = hosted(BlocksView(one, source: .core).appBlocks(apps))
        defer { window.orderOut(nil) }
        let field = try XCTUnwrap(fields(host).first)
        XCTAssertTrue(window.makeFirstResponder(field))
        field.currentEditor()?.insertText("Ada")
        for _ in 0..<5 { await Task.yield() }
        host.rootView = AnyView(BlocksView(two, source: .core).appBlocks(apps).frame(width: 390, height: 600).environment(\.look, Look(still: true)))
        host.layout()
        for _ in 0..<5 { await Task.yield() }
        let after = try XCTUnwrap(fields(host).first)
        XCTAssertEqual(after.stringValue, "Ada")
        XCTAssertNotNil(after.currentEditor(), "the field keeps the focus")
    }

    func testATapOpenGoesBesideWhenTheAppSetsItAndAPendingActionsButtonIsDisabled() async throws {
        let screen = try block(
            #"""
            {"type": "screen", "id": "s", "blocks": [
              {"type": "row", "id": "open", "title": "Issue 12", "tap": {"open": "/issues/12"}},
              {"type": "row", "id": "sheet", "title": "Settings", "tap": {"sheet": "/settings"}},
              {"type": "button", "id": "go", "label": "Approve", "action": "approve"},
              {"type": "button", "id": "no", "label": "Reject", "action": "reject"}]}
            """#)
        var (beside, opened, sent) = ([String](), [String](), [String]())
        let view = BlocksView(
            screen, source: .core, act: { sent.append($0.action) }, open: { opened.append($0) }, openBeside: { beside.append($0) },
            pending: ["approve"])
        let frames = Frames()
        let (host, window) = hosted(
            view.frame(width: 390, height: 600, alignment: .topLeading).reportsBlocks()
                .overlayPreferenceValue(DrawnBlocks.self) { blocks in GeometryReader { frames.keep(blocks, $0) } })
        defer { window.orderOut(nil) }
        host.layout()
        for id in ["open", "sheet", "go", "no"] { try await click(window, frames, id) }
        XCTAssertEqual(beside, ["/issues/12"])
        XCTAssertEqual(opened, ["/settings"])
        XCTAssertEqual(sent, ["reject"], "the pending approve does not send again")
    }
}
