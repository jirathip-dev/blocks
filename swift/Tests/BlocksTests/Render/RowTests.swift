import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testSolidFillsARowButtonInItsFullToneWithItsTextInTheBackground() throws {
        let palette = Look(still: true).palette
        func near(_ color: Color) throws -> (UInt8, UInt8, UInt8, UInt8) -> Bool {
            let rgb = try XCTUnwrap(NSColor(color).usingColorSpace(.sRGB))
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return { r, g, b, a in a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 6 } }
        }
        var solid = Style.bundled
        solid.fills = .solid
        let row = try block(#"{"type": "row", "title": "Build", "button": {"label": "Ship", "action": "ship", "tone": "ok"}}"#)
        func drawn(_ style: Style) -> some View {
            BlocksView(row, source: .core).environment(\.look, Look(style: style, still: true))
        }
        let green = try near(palette.green)
        let (tinted, filled) = (try pixels(drawn(.bundled), green), try pixels(drawn(solid), green))
        XCTAssertGreaterThan(filled, tinted + 500, "the pill is the full tone")
        let ink = try near(palette.background)
        let label = (try pixels(drawn(.bundled), columns: 0.7...1, ink), try pixels(drawn(solid), columns: 0.7...1, ink))
        XCTAssertGreaterThan(label.1, label.0, "its label is in the background colour")
    }
}
