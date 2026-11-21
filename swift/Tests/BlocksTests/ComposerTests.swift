import Blocks
@testable import BlocksUI
import Foundation
import XCTest

final class ComposerTests: XCTestCase {
    @MainActor func testEachSendCarriesAFreshNonceAndAQueueCarriesOneWithItsQ() throws {
        let first = ComposerBlock.sending("hi", picks: ["model": .string("m1")], q: nil)
        let next = ComposerBlock.sending("hi", picks: ["model": .string("m1")], q: nil)
        guard case .string(let a) = first["nonce"], case .string(let b) = next["nonce"] else {
            return XCTFail("a send without a nonce: \(first)")
        }
        XCTAssertNotNil(UUID(uuidString: a))
        XCTAssertNotEqual(a, b)
        XCTAssertEqual(first.filter { $0.key != "nonce" }, ["model": .string("m1"), "text": .string("hi")])
        let queued = ComposerBlock.sending("later", picks: [:], q: 2)
        XCTAssertEqual(queued["q"], .number(2))
        guard case .string(let c) = queued["nonce"] else { return XCTFail("a queue without a nonce") }
        XCTAssertNotNil(UUID(uuidString: c))
    }
}
