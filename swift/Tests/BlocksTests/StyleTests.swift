import Blocks
import BlocksUI
import Foundation
import XCTest

final class StyleTests: XCTestCase {
    private let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures/styles")

    private func style(_ name: String) throws -> Style {
        try JSONDecoder().decode(Style.self, from: Data(contentsOf: dir.appendingPathComponent("\(name).json")))
    }

    func testEveryGoodStyleFixtureDecodes() throws {
        let names = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".json") }
        XCTAssertEqual(names.sorted(), ["filled.json", "modern.json", "still.json", "terminal.json"])
        let filled = try style("filled")
        XCTAssertEqual(filled.buttons, .filled)
        XCTAssertEqual(filled.labels["button"]?.apply("Drive now"), "Drive now")
        XCTAssertEqual(try style("modern"), Style.bundled)
        let terminal = try style("terminal")
        XCTAssertEqual(terminal.format, 1)
        XCTAssertNil(terminal.space)
        XCTAssertNil(terminal.buttons)
        XCTAssertEqual(terminal.surface, .dashed)
        XCTAssertEqual(terminal.labels["kind"]?.apply("Row"), "[row]")
        let still = try style("still")
        XCTAssertEqual(still.space, 1.25)
        XCTAssertEqual(still.motion, 0)
    }
}
