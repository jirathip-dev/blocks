import Blocks
import Foundation
import XCTest

final class LinkTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    func testALinkThatIsNotHttpHttpsMailtoOrRelativeOpensNothing() throws {
        let data = try Data(contentsOf: root.appendingPathComponent("fixtures/links/screen.json"))
        let f = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        for u in try XCTUnwrap(f["safe"] as? [String]) { XCTAssertNotNil(linkable(u), u) }
        for u in try XCTUnwrap(f["unsafe"] as? [String]) { XCTAssertNil(linkable(u), u) }
    }
}
