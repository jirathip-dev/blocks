import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testAFoldedCardDrawsItsLineInItsFleetColour() throws {
        let rgb = try XCTUnwrap(NSColor(Look(still: true).palette.amber).usingColorSpace(.sRGB))
        let amber = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 24 }
        }
        let card = { (color: String) in
            #"{"type": "card", "id": "c", "title": "Deploy", "color": "\#(color)", "fold": {"line": "paused: waiting on the owner"}}"#
        }
        XCTAssertEqual(try pixels(BlocksView(block(card("x")), source: .core), amber), 0)
        XCTAssertGreaterThan(try pixels(BlocksView(block(card("a")), source: .core), amber), 0)
    }
}
