import Blocks
@testable import BlocksUI
import Foundation
import XCTest

final class ComposerTests: XCTestCase {
    @MainActor func testAFailedSendRepeatsItsNonceAndTheNextSendGetsAFreshOne() throws {
        var outbox = Outbox()
        let first = outbox.values("hi", picks: ["model": .string("m1")], q: nil)
        guard case .string(let a) = first["nonce"] else { return XCTFail("a send without a nonce: \(first)") }
        XCTAssertNotNil(UUID(uuidString: a))
        XCTAssertEqual(first.filter { $0.key != "nonce" }, ["model": .string("m1"), "text": .string("hi")])
        outbox.settle(false)
        XCTAssertEqual(outbox.values("hi", picks: ["model": .string("m1")], q: nil)["nonce"], .string(a))
        outbox.settle(true)
        let next = outbox.values("hi", picks: ["model": .string("m1")], q: nil)
        guard case .string(let b) = next["nonce"] else { return XCTFail("a send without a nonce") }
        XCTAssertNotEqual(a, b)
        outbox.settle(false)
        outbox.edited()
        XCTAssertNotEqual(outbox.values("hi!", picks: [:], q: nil)["nonce"], .string(b))
    }

    @MainActor func testAQueueCarriesANonceWithItsQ() throws {
        var outbox = Outbox()
        let queued = outbox.values("later", picks: [:], q: 2)
        XCTAssertEqual(queued["q"], .number(2))
        guard case .string(let c) = queued["nonce"] else { return XCTFail("a queue without a nonce") }
        XCTAssertNotNil(UUID(uuidString: c))
    }
}
