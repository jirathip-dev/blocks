import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testAWorkingComposerShowsItsStopInRed() throws {
        let rgb = try XCTUnwrap(NSColor(Look(still: true).palette.red).usingColorSpace(.sRGB))
        let red = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 24 }
        }
        let idle = #"{"type": "composer", "action": "say", "acts": {"stop": "halt"}, "queued": []}"#
        let busy = #"{"type": "composer", "action": "say", "acts": {"stop": "halt"}, "working": {"since": "2026-01-01T00:00:00Z"}}"#
        XCTAssertEqual(try pixels(BlocksView(block(idle), source: .core), red), 0)
        XCTAssertGreaterThan(try pixels(BlocksView(block(busy), source: .core), red), 0)
    }
}
