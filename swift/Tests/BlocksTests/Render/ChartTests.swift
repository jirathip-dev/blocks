import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testAChartDrawsItsBarsInInkAndItsWarnLineInAmberAndAnEmptyOneNeither() throws {
        let palette = Look(still: true).palette
        let (ink, amber) = (try near(palette.lead), try near(palette.amber))
        let chart = BlocksView(try fixture("chart"), source: .core)
        XCTAssertGreaterThan(try pixels(chart, ink), 2000, "six revenue bars")
        XCTAssertGreaterThan(try pixels(chart, amber), 150, "the target line")
        let empty = try block(
            #"{"type": "chart", "title": "Revenue", "chart": "combo", "x": [], "series": [], "empty": "None yet"}"#)
        XCTAssertLessThan(try pixels(BlocksView(empty, source: .core), ink), 300, "no bars, text only")
        XCTAssertEqual(try pixels(BlocksView(empty, source: .core), amber), 0)
        let donut = try block(
            #"{"type": "chart", "title": "Spend", "chart": "donut", "x": ["a", "b"], "series": [{"name": "s", "values": [3, 1]}]}"#)
        XCTAssertGreaterThan(try pixels(BlocksView(donut, source: .core), ink), 2000, "the biggest slice in ink")
    }
}
