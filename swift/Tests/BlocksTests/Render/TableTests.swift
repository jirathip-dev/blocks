import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testATableIsAGridWhenWideAndStackedRowsOnAPhone() throws {
        let table = BlocksView(try fixture("table"), source: .core).environment(\.look, Look(still: true))
        let wide = NSHostingView(rootView: table.frame(width: 1440)).fittingSize.height
        let phone = NSHostingView(rootView: table.frame(width: 390)).fittingSize.height
        XCTAssertGreaterThan(try pixels(BlocksView(try fixture("table"), source: .core)), 0)
        XCTAssertGreaterThan(wide, 6 * 20, "a head, five rows and the totals")
        XCTAssertGreaterThan(phone, wide * 1.4, "each row is a title line and a meta line")
    }

    func testAnEditableGridDrawsGroupsHandlesAndFieldsWideAndASheetRowOnAPhone() throws {
        let grid = BlocksView(try fixture("table-grid"), source: .core).environment(\.look, Look(still: true))
        let wide = NSHostingView(rootView: grid.frame(width: 1440)).fittingSize.height
        let phone = NSHostingView(rootView: grid.frame(width: 390)).fittingSize.height
        XCTAssertGreaterThan(try pixels(BlocksView(try fixture("table-grid"), source: .core)), 0)
        XCTAssertGreaterThan(wide, 11 * 20, "a head, three groups, six items and the totals")
        XCTAssertGreaterThan(phone, wide, "each item is a title line and a meta line")
    }

    func testATableWithMoreAsksForItsNextPageOnceAndARefusalLeavesARetry() async throws {
        var sent: [BlockAction] = []
        let view = BlocksView(try fixture("table-ot"), source: .core, acted: { sent.append($0); return false })
        let host = NSHostingView(rootView: view.frame(width: 1440).environment(\.look, Look(still: true)))
        let window = NSWindow(contentRect: CGRect(x: 0, y: 0, width: 1440, height: 900), styleMask: [], backing: .buffered, defer: false)
        window.contentView = host
        host.layout()
        for _ in 0..<20 where sent.isEmpty { await Task.yield() }
        XCTAssertEqual(sent, [BlockAction(action: "ot-more", block: "ot", values: ["cursor": .string("c:2397")])])
        host.layout()
        for _ in 0..<20 { await Task.yield() }
        XCTAssertEqual(sent.count, 1, "a refusal does not send again by itself")
        let done = try fixture("table-ot")
        guard case .table(var t) = done else { return XCTFail("table-ot is a table") }
        t.more = nil
        let plain = NSHostingView(rootView: BlocksView(.table(t), source: .core).frame(width: 1440).environment(\.look, Look(still: true)))
        XCTAssertGreaterThan(host.fittingSize.height, plain.fittingSize.height + 40, "the retry row sits under the last row")
    }
}
