import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testNavPutsTheBrandLeftAndTheLinksRightOnABareBar() throws {
        let nav = BlocksView(try fixture("nav"), source: .core)
        XCTAssertLessThan(height(nav), 60)
        XCTAssertGreaterThan(try pixels(nav, columns: 0...0.25), 0, "the brand")
        XCTAssertGreaterThan(try pixels(nav, columns: 0.75...1), 0, "the links")
        XCTAssertLessThan(try pixels(nav), 390 * 48 / 4, "text only, no filled row")
    }
}
