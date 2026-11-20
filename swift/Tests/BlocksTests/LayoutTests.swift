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

    func testDropsGiveFixturesLayoutsEditsTheCratesEditsOnBothSizeClasses() throws {
        struct Edits: Decodable {
            let slots: [String: [String]]
            let locked: Set<String>
            let layout: JSONValue
            let drops: [String: [LayoutEdit]]
        }
        let f = try JSONDecoder().decode(Edits.self, from: layoutFixture("edits.json"))
        let contract = Blocks.Layout.Contract(
            components: f.slots.filter { $0.key != "nav" }.map { .init(kind: $0.key, slots: Set($0.value)) }, locked: f.locked)
        let layout = try Blocks.Layout(json: JSONEncoder().encode(f.layout), contract: contract)
        XCTAssertEqual(f.drops.count, 3)
        for size in SizeClass.all {
            let tree = layout.resolved(for: size)
            for (grabbed, want) in f.drops { XCTAssertEqual(tree.drops(f.slots, grabbed: grabbed), want, grabbed) }
        }
        let rules = LayoutRules(tree: layout.resolved(for: .wide), held: f.slots)
        let inbox = try XCTUnwrap(f.drops["inbox"])
        var keys = try XCTUnwrap(Driven(rules, "inbox"))
        keys.on(.press)
        keys.nudge(Nudge(.up))
        XCTAssertEqual(keys.on(.release), .send(inbox[18]))
        var named = try XCTUnwrap(Driven(rules, "inbox"))
        XCTAssertEqual(named.named(Nudge(.left)), .send(inbox[15]))
        XCTAssertNil(named.named(Nudge(.right)))
        XCTAssertEqual([rules.candidate("inbox", -1), rules.candidate("inbox", 1)], [inbox[18], inbox[19]])
        XCTAssertEqual(rules.says("inbox", inbox[18]), "before pane in list of bar")
        XCTAssertNil(Driven(rules, "root"))
    }
}
