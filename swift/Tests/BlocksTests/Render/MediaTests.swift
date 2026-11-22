import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testMediaAndHeroKeepTheMediaBoxBeforeThePictureLoads() throws {
        XCTAssertGreaterThanOrEqual(height(BlocksView(try fixture("media"), source: .core)), 390 * 360 / 640)
        XCTAssertGreaterThan(height(BlocksView(try fixture("hero"), source: .core)), 390 * 360 / 640 + 60)
    }
}
