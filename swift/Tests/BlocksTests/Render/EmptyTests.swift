import Blocks
import BlocksUI
import Foundation
import SwiftUI
import XCTest

extension RenderTests {
    func testAnEmptyListDrawsATileOnItsOwnAndPlainTextInsideACard() throws {
        let list = { (empty: String) in #"{"type": "list", "id": "l", "rows": []\#(empty)}"# }
        let card = { (inner: String) in #"{"type": "card", "id": "c", "title": "Fleets", "blocks": [\#(inner)]}"# }
        let said = #", "empty": "No fleets yet""#
        let grown = { (json: (String) -> String) throws -> CGFloat in
            try self.height(BlocksView(self.block(json(list(said))), source: .core))
                - self.height(BlocksView(self.block(json(list(""))), source: .core))
        }
        XCTAssertGreaterThanOrEqual(try grown { $0 }, 44, "on its own the text sits on a tile one row high")
        XCTAssertLessThan(try grown(card), 44, "inside a card the text sits in the card with no tile")
    }
}
