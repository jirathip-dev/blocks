import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testStepsFillsInkByValueTicksItsToneAndDrawsItsFallbackWhenUnplaced() throws {
        let palette = Look(still: true).palette
        func near(_ color: Color) throws -> (UInt8, UInt8, UInt8, UInt8) -> Bool {
            let rgb = try XCTUnwrap(NSColor(color).usingColorSpace(.sRGB))
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return { r, g, b, a in a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 6 } }
        }
        let (ink, amber) = (try near(palette.lead), try near(palette.amber))
        func bar(_ value: Int, _ tone: String = "") throws -> some View {
            let toned = tone.isEmpty ? "" : #", "tone": "\#(tone)""#
            return BlocksView(
                try block(#"{"type": "steps", "bars": [{"label": "Fire", "value": \#(value)\#(toned)}]}"#), source: .core)
        }
        let (empty, half, full) = (try pixels(bar(0), ink), try pixels(bar(50), ink), try pixels(bar(130), ink))
        XCTAssertGreaterThan(half, empty + 500, "half a bar of ink")
        XCTAssertGreaterThan(full, half + 500, "130 fills the whole bar")
        XCTAssertEqual(try pixels(bar(62), amber), 0)
        XCTAssertGreaterThan(try pixels(bar(62, "warn"), amber), 0, "the tick and the number")
        let steps = #""steps": [{"id": "a", "label": "Stop"}, {"id": "b", "label": "Lines"}]"#
        let first = try pixels(BlocksView(block(#"{"type": "steps", "current": "a", \#(steps)}"#), source: .core), ink)
        let done = try pixels(BlocksView(block(#"{"type": "steps", "done": true, \#(steps)}"#), source: .core), ink)
        XCTAssertGreaterThan(done, first + 400, "a done step is an ink square")
        let fallback = #""fallback": {"title": "No steps yet"}"#
        let unplaced = try block(#"{"type": "steps", "current": "z", \#(steps), \#(fallback)}"#)
        let row = try block(#"{"type": "pinned", \#(fallback)}"#)
        XCTAssertEqual(height(BlocksView(unplaced, source: .core)), height(BlocksView(row, source: .core)))
        XCTAssertEqual(try pixels(BlocksView(unplaced, source: .core)), try pixels(BlocksView(row, source: .core)))
    }
}
