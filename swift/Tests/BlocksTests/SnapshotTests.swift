import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import XCTest

private struct Red: BlockStyle {
    func body(content: Content) -> some View { content.background(Color(red: 1, green: 0, blue: 0)) }
}

@MainActor
final class SnapshotTests: XCTestCase {
    private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures")

    private func load<T: Decodable>(_ type: T.Type, _ path: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(contentsOf: fixtures.appendingPathComponent(path)))
    }

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    private func shape(_ n: TreeNode) -> String {
        "\(n.kind)#\(n.id ?? "")(\(n.variant ?? ""))\(n.role):\(n.name)[\(n.children.map(shape).joined(separator: ","))]"
    }

    func testEveryFixtureBlockPassesCheckAndItsTreeHasTheHTMLTreesShape() throws {
        let kinds = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("blocks").path)
            .map { String($0.dropLast(5)) }.sorted()
        XCTAssertEqual(kinds.count, 27)
        for kind in kinds {
            let expect = try load(TreeNode.self, "trees/swift/\(kind).json")
            let run = try Snapshot(try load(Block.self, "blocks/\(kind).json")).run(
                [], name: kind, expect: expect, check: true)
            XCTAssertEqual(run.faults, [], kind)
            XCTAssertEqual(run.report.shots, [kind])
            XCTAssertGreaterThan(run.pngs[kind]?.count ?? 0, 0, kind)
            let tree = try XCTUnwrap(run.trees[kind])
            XCTAssertEqual(shape(tree), shape(try load(TreeNode.self, "trees/\(kind).json")), kind)
        }
    }

    func testEachIdsFixtureIsTheBlockAndActionIdsItsScreenDraws() throws {
        let names = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("ids").path)
            .map { String($0.dropLast(5)) }.sorted()
        XCTAssertEqual(names, ["button", "screen"])
        for name in names {
            let ids = try load(DrawnIdList.self, "ids/\(name).json")
            let run = try Snapshot(try load(Block.self, "blocks/\(name).json")).run([], name: name, ids: ids, check: true)
            XCTAssertEqual(run.faults, [], name)
        }
    }

    func testCheckFailsWhenTheDrawnIdsAreNotTheExpectedOnes() throws {
        let run = try Snapshot(try load(Block.self, "blocks/button.json")).run(
            [], name: "button", ids: try load(DrawnIdList.self, "ids/screen.json"), check: true)
        XCTAssertEqual(
            run.faults,
            [
                #"button: drew ids DrawnIdList(blocks: ["save"], actions: ["save"]), expected DrawnIdList(blocks: ["home", "hint"], actions: [])"#
            ])
    }

    func testCheckFailsWhenTheDrawnTreeIsNotTheExpectedOne() throws {
        let run = try Snapshot(try load(Block.self, "blocks/list.json")).run(
            [], name: "list", expect: try load(TreeNode.self, "trees/swift/card.json"), check: true)
        XCTAssertEqual(run.faults, ["list: drew list#rows native, expected card#card native"])
    }

    func testCheckFailsANodeWhoseRoleOrNameIsNotTheExpectedOneOrThatHasNoName() throws {
        var want = try load(TreeNode.self, "trees/swift/button.json")
        (want.role, want.name) = ("link", "Send")
        let run = try Snapshot(try load(Block.self, "blocks/button.json")).run([], name: "button", expect: want, check: true)
        XCTAssertEqual(run.faults, [#"button/button#save: drew button "Save", expected link "Send""#])
        let bare = try decode(Block.self, #"{"type": "screen", "id": "bare", "blocks": [{"type": ""}]}"#)
        XCTAssertEqual(try Snapshot(bare).run([], name: "bare", check: true).faults, ["bare/screen#bare/: has no name"])
    }

    func testATapSendsTheButtonsActionAndAnAnswersOpsAreDrawn() throws {
        let steps = try decode(
            [Step].self,
            #"""
            [{"tap": {"id": "save"}}, {"tap": {"id": "nothing"}}, {"shot": {"name": "before"}},
             {"answer": {"ops": [{"op": "merge", "id": "save", "fields": {"label": "Saved"}}]}},
             {"shot": {"name": "saved"}}]
            """#)
        let run = try Snapshot(try load(Block.self, "blocks/button.json")).run(steps, check: true)
        let sent = try decode([Action].self, #"[{"screen": "save", "action": "save", "block": "save", "values": {}}]"#)
        XCTAssertEqual(run.report.sent, sent)
        XCTAssertEqual(run.report.dropped, ["tap nothing"])
        XCTAssertEqual(run.report.shots, ["before", "saved"])
        XCTAssertEqual(run.report.timings.steps_ms.count, 5)
        XCTAssertEqual(run.faults, [])
        XCTAssertNotEqual(run.pngs["before"], run.pngs["saved"])
    }

    private func island(_ name: String, events: String) throws -> Block {
        try decode(
            Block.self,
            #"{"type": "island", "id": "e", "name": "\#(name)", "props": {"zoom": 3}, "events": \#(events), "fallback": {"title": "No map"}}"#)
    }

    func testAnIslandGetsItsPropsAndItsNamedEventIsSentAsAnAction() throws {
        let run = try Snapshot(try island("x-echo", events: #"["echo"]"#)).run([])
        let sent = try decode([Action].self, #"[{"screen": "e", "action": "echo", "block": "e", "values": {"zoom": 3}}]"#)
        XCTAssertEqual(run.report.sent, sent)
        XCTAssertEqual(run.report.dropped, [])
        XCTAssertEqual(run.trees["shot"]?.drawn, .native)
    }

    func testAnIslandsUnnamedEventIsDroppedAndAnUnregisteredOneDrawsItsFallback() throws {
        let unnamed = try Snapshot(try island("x-echo", events: "[]")).run([])
        XCTAssertEqual(unnamed.report.sent, [])
        XCTAssertEqual(unnamed.report.dropped, ["event e echo"])
        let none = try Snapshot(try island("x-none", events: #"["echo"]"#)).run([])
        XCTAssertEqual(none.report.sent, [])
        XCTAssertEqual(none.report.dropped, [])
        XCTAssertEqual(none.trees["shot"]?.drawn, .fallback)
        let own = try Snapshot(try island("x-none", events: #"["echo"]"#)).islands(["x-none": Snapshot.echo]).run([])
        XCTAssertEqual(own.trees["shot"]?.drawn, .native)
        XCTAssertEqual(own.report.sent.map(\.action), ["echo"])
    }

    func testABlockStyleIsDrawn() throws {
        let button = try load(Block.self, "blocks/button.json")
        let plain = try Snapshot(button).run([])
        let red = try Snapshot(button).blockStyle("button", Red()).run([])
        XCTAssertNotEqual(plain.pngs["shot"], red.pngs["shot"])
    }
}
