import Blocks
import Foundation
import XCTest

let cooeeContract = Blocks.Layout.Contract(
    components: [
        .init(kind: "sidebar", slots: ["top", "list"], config: ["width", "pinned"]),
        .init(kind: "chat", slots: ["strip", "cards"], config: ["composer", "stop", "back"]),
        .init(kind: "composer", config: ["attach", "queue", "hint"]),
        .init(kind: "terminal", config: ["rows", "cols", "machine"]),
        .init(kind: "scanner"),
        .init(kind: "menu-host", slots: ["rows"]),
        .init(kind: "settings", config: ["pages"]),
    ],
    locked: ["/screens/pairing", "/screens/reset-layout"])

let layoutsDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    .appendingPathComponent("../../../fixtures/layouts")

func layoutFixture(_ name: String) throws -> Data { try Data(contentsOf: layoutsDir.appendingPathComponent(name)) }

final class LayoutTests: XCTestCase {
    func testEachBadFixtureIsRefusedWithTheRustReason() throws {
        let refused = try JSONDecoder().decode([String: String].self, from: layoutFixture("refused.json"))
        let files = try FileManager.default.contentsOfDirectory(atPath: layoutsDir.appendingPathComponent("bad").path)
        XCTAssertEqual(files.map { $0.replacingOccurrences(of: ".json", with: "") }.sorted(), refused.keys.sorted())
        XCTAssertEqual(files.count, 12)
        for (name, why) in refused {
            let json = try layoutFixture("bad/\(name).json")
            do {
                _ = try Blocks.Layout(json: json, contract: cooeeContract)
                XCTFail("\(name) passed")
            } catch {
                XCTAssertEqual(error.why, why, name)
            }
        }
    }

    func testCooeesDefaultPassesWithCooeesContractAndResolvesPerSize() throws {
        let layout = try Blocks.Layout(json: layoutFixture("cooee.json"), contract: cooeeContract)
        let wide = layout.resolved(for: .wide)
        let compact = layout.resolved(for: .compact)
        XCTAssertEqual(wide.content, .component("nav"))
        XCTAssertEqual(wide.slots["side"]?.map(\.place), [.column])
        XCTAssertEqual(compact.slots["side"]?.map(\.place), [.menu])
        XCTAssertEqual(wide.slots["main"]?.map(\.id), ["home", "chat"])
        XCTAssertEqual(wide.slots["main"]?.map(\.place), [.panel, .push])
        XCTAssertEqual(wide.slots["main"]?.last?.config["composer"], .bool(true))
        XCTAssertEqual(wide.slots["main"]?.first?.content, .screen(source: "core", path: "/screens/home"))
    }

    func testTheLimitsAreRefused() {
        func why(_ json: String) -> String? {
            do {
                _ = try Blocks.Layout(json: Data(json.utf8), contract: cooeeContract)
                return nil
            } catch {
                return error.why
            }
        }
        let rows = (0..<200).map { #"{"type": "screen", "source": "core", "path": "/screens/r\#($0)"}"# }
        XCTAssertEqual(
            why(#"{"format": 1, "root": {"type": "nav", "slots": {"main": [\#(rows.joined(separator: ","))]}}}"#),
            "over 200 nodes")
        XCTAssertEqual(why(String(repeating: " ", count: 64 * 1024 + 1)), "over 65536 bytes")
        XCTAssertEqual(
            why(#"{"format": 1, "root": {"type": "nav", "place": {"compact": "hidden"}}}"#), "root: may not be hidden")
    }
}
