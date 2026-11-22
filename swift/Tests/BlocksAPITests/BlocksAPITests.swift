import Blocks
import Foundation
import XCTest

final class BlocksAPITests: XCTestCase {
    private let fixture = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures/typed/screen.json")

    func testATypedScreenEncodesToItsFixture() throws {
        let screen = Screen(
            blocks: [
                .stat(Stat(id: "open", label: "open", value: .number(3))),
                .row(Row(id: "build", subtitle: .string("green"), title: "Build", value: .string("2m"))),
                .chart(
                    Chart(
                        chart: .bar, id: "sends", series: [Series(name: "Sent", values: [4, 7])], title: "Sends",
                        x: ["Mon", "Tue"])),
            ],
            id: "today",
            title: "Today")
        let built = try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(Block.screen(screen)))
        let want = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: fixture))
        XCTAssertEqual(built, want)
    }
}
