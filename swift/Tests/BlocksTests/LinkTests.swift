import Blocks
import Foundation
import XCTest

final class LinkTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    func testALinkThatIsNotHttpHttpsMailtoOrRelativeIsRefused() throws {
        let data = try Data(contentsOf: root.appendingPathComponent("fixtures/links/screen.json"))
        let f = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        for u in try XCTUnwrap(f["safe"] as? [String]) { XCTAssertTrue(linkable(u), u) }
        for u in try XCTUnwrap(f["unsafe"] as? [String]) { XCTAssertFalse(linkable(u), u) }
    }
}
