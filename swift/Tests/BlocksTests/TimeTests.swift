import Blocks
@testable import BlocksUI
import Foundation
import XCTest

final class TimeTests: XCTestCase {
    private struct Labels: Decodable {
        let now: String
        let cases: [Case]
    }

    private struct Case: Decodable {
        let value: Shown
        let want: String
    }

    func testALabelledTimeGivesTheTextOfTheTimesFixtureAtItsClock() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")
        let data = try Data(contentsOf: root.appendingPathComponent("fixtures/times/labels.json"))
        let labels = try JSONDecoder().decode(Labels.self, from: data)
        let now = try XCTUnwrap(labels.now.date)
        XCTAssertGreaterThanOrEqual(labels.cases.count, 6)
        for c in labels.cases {
            XCTAssertEqual(c.value.text(at: now, [:]), c.want, "\(c.value)")
        }
    }
}
