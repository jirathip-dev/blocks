import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testAToastTicksItsToneCutsLongTextAtThreeLinesAndDrawsDoneWhenEmpty() throws {
        let palette = Look(still: true).palette
        func near(_ color: Color) throws -> (UInt8, UInt8, UInt8, UInt8) -> Bool {
            let rgb = try XCTUnwrap(NSColor(color).usingColorSpace(.sRGB))
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return { r, g, b, a in a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 6 } }
        }
        func toast(_ fields: String) throws -> some View {
            BlocksView(try block(#"{"type": "toast", \#(fields)}"#), source: .core)
        }
        let (green, red) = (try near(palette.green), try near(palette.red))
        XCTAssertGreaterThan(try pixels(toast(#""title": "Archived", "tone": "ok""#), green), 0, "the ok tick and glyph")
        XCTAssertEqual(try pixels(toast(#""title": "Archived""#), green), 0, "no tone: an ink tick")
        XCTAssertGreaterThan(try pixels(toast(#""title": "Declined", "tone": "bad""#), red), 0)
        let one = height(try toast(#""title": "Archived""#))
        let long = height(try toast(#""title": "\#(String(repeating: "a long line that wraps ", count: 40))""#))
        XCTAssertGreaterThan(long, one, "long text wraps")
        XCTAssertLessThan(long, one + 3 * 20, "and stops at 3 lines")
        let empty = try toast(#""title": """#)
        let done = BlocksView(try block(#"{"type": "row", "title": "Done"}"#), source: .core)
        XCTAssertEqual(height(empty), height(done))
        XCTAssertEqual(try pixels(empty), try pixels(done))
    }
}
