import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testASecondMessageBySameSpeakerDrawsNoHead() throws {
        let pair = { (second: String) in
            try self.block(
                #"{"type": "section", "id": "s", "blocks": [{"type": "message", "id": "a", "role": "agent", "name": "Scout", "blocks": [{"type": "text", "id": "x", "text": "hi"}]}, {"type": "message", "id": "b", "role": "agent", "name": "\#(second)", "blocks": [{"type": "text", "id": "y", "text": "hi"}]}]}"#)
        }
        let same = height(BlocksView(try pair("Scout"), source: .core))
        let other = height(BlocksView(try pair("Mira"), source: .core))
        XCTAssertGreaterThan(other, same + 10)
    }
}
