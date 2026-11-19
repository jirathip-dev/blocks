import Blocks
import Foundation
import XCTest

final class SampleTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func again<T: Codable & Equatable>(_ type: T.Type, _ data: Data, _ name: String) throws {
        let value = try JSONDecoder().decode(type, from: data)
        XCTAssertEqual(try JSONDecoder().decode(type, from: JSONEncoder().encode(value)), value, name)
    }

    func testTheRustSampleDecodesAndRoundTrips() throws {
        let data = try Data(contentsOf: root.appendingPathComponent("schema/sample.json"))
        let frames = try JSONDecoder().decode([OldFrame].self, from: data)
        guard case .screen(let first) = frames.first?.ops.first, case .screen(let screen) = first.screen else {
            return XCTFail("frame 0 is no screen")
        }
        guard case .composer(let say) = screen.blocks?.last else { return XCTFail("the screen ends in no composer") }
        XCTAssertEqual(say.chips?.first?.cur, nil)
        let ops = frames.last?.ops ?? []
        guard case .insert(let before) = ops.first, case .insert(let after) = ops.dropFirst().first else {
            return XCTFail("frame 1 starts with no inserts")
        }
        XCTAssertEqual([before.before, after.after], ["a", "a"])
        guard case .dot(let dot) = ops.last else { return XCTFail("frame 1 ends in no dot") }
        XCTAssertTrue(dot.on)
        try again([OldFrame].self, data, "sample.json")
    }

    func testEveryScreenFixtureDecodesAndRoundTrips() throws {
        let dir = root.appendingPathComponent("fixtures/screens")
        var count = 0
        for app in ["cooee", "drover"] {
            for name in try FileManager.default.contentsOfDirectory(atPath: dir.appendingPathComponent(app).path) {
                let data = try Data(contentsOf: dir.appendingPathComponent(app).appendingPathComponent(name))
                let items: [JSONValue]
                switch try JSONDecoder().decode(JSONValue.self, from: data) {
                case .array(let all): items = all
                case let one: items = [one]
                }
                for item in items {
                    let one = try JSONEncoder().encode(item)
                    guard case .object(let o) = item else { return XCTFail("\(name): no object") }
                    if o["type"] != nil {
                        try again(Block.self, one, name)
                    } else if o["ops"] != nil {
                        try again([Op].self, try JSONEncoder().encode(o["ops"]), name)
                    } else if let block = o["block"] {
                        try again(Block.self, try JSONEncoder().encode(block), name)
                    } else {
                        XCTFail("\(name): neither a block nor ops")
                    }
                }
                count += 1
            }
        }
        XCTAssertGreaterThanOrEqual(count, 40)
    }
}
