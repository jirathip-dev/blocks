import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testPagesFrameEachPageAtItsSizeFittedToTheWidthAndSayNoPagesYetWhenEmpty() throws {
        let three = height(BlocksView(try fixture("pages"), source: .core))
        let page = (390 - 32) * 1754.0 / 1240
        XCTAssertGreaterThan(three, 3 * page, "three pages at fit, each at its aspect")
        XCTAssertLessThan(three, 3 * page + 200, "and only the head, the note and the gaps besides")
        let empty = height(BlocksView(try block(#"{"type": "pages", "id": "e", "title": "Report", "pages": []}"#), source: .core))
        XCTAssertGreaterThan(empty, 44)
        XCTAssertLessThan(empty, 200)
    }
}
