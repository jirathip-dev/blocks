import Blocks
import BlocksUI
import Foundation
import SwiftUI
import XCTest

extension RenderTests {
    func testFilledButtonsFillThePrimaryInTheLinkToneAndLeaveAPlainButtonUnfilled() throws {
        var filled = Style.bundled
        filled.buttons = .filled
        func drawn(_ json: String, _ style: Style) throws -> some View {
            BlocksView(try block(json), source: .core).environment(\.look, Look(style: style, still: true))
        }
        let plain = #"{"type": "button", "id": "pause", "label": "Pause", "action": "pause"}"#
        let primary = #"{"type": "button", "id": "go", "label": "Drive now", "action": "go", "style": "primary"}"#
        let (ghost, tinted) = (try pixels(drawn(plain, filled)), try pixels(drawn(plain, .bundled)))
        XCTAssertLessThan(ghost * 3, tinted, "a plain button is a ghost: no fill behind its label")
        let link = try near(Look(still: true).palette.link)
        XCTAssertGreaterThan(try pixels(drawn(primary, filled), link), 5000, "the primary is filled in the link tone")
    }
}
