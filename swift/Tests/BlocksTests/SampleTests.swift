import Blocks
import Foundation
import XCTest

final class SampleTests: XCTestCase {
    func testTheRustSampleDecodesAndRoundTrips() throws {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().appendingPathComponent("../../../schema/sample.json")
        let frames = try JSONDecoder().decode([Frame].self, from: Data(contentsOf: url))
        XCTAssertEqual(frames.count, 2)
        guard case .snapshot(let screen) = frames.first?.body else { return XCTFail("frame 0 is no snapshot") }
        XCTAssertEqual(screen.rows.first?.block, .text(text: "Hello"))
        guard case .ops(let ops) = frames.last?.body else { return XCTFail("frame 1 carries no ops") }
        XCTAssertEqual(ops.first, .insert(at: 1, row: try JSONDecoder().decode(Row.self, from: Data(#"{"id":"go","block":{"button":{"label":"Go","action":"go"}}}"#.utf8))))
        let again = try JSONDecoder().decode([Frame].self, from: JSONEncoder().encode(frames))
        XCTAssertEqual(again, frames)
    }
}
