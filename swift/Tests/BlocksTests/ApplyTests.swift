import Blocks
import Foundation
import XCTest

final class ApplyTests: XCTestCase {
    private let base = """
        {"type": "screen", "id": "s", "title": "Queue", "blocks": [
          {"type": "list", "id": "l", "rows": [{"type": "row", "id": "a", "title": "A"}, {"type": "row", "id": "b", "title": "B"}]},
          {"type": "card", "id": "c", "title": "Card", "buttons": [{"type": "button", "id": "go", "label": "Go"}]},
          {"type": "scene", "id": "sc", "lanes": []},
          {"type": "text", "id": "t", "text": "hi"}
        ]}
        """

    private func block(_ json: String) throws -> Block { try JSONDecoder().decode(Block.self, from: Data(json.utf8)) }

    private func applied(_ ops: String, to json: String? = nil) throws -> Block {
        var screen = try block(json ?? base)
        try screen.apply(try JSONDecoder().decode([Op].self, from: Data(ops.utf8)))
        return screen
    }

    private func failure(_ ops: String) throws -> ApplyError? {
        var screen = try block(base)
        do {
            try screen.apply(try JSONDecoder().decode([Op].self, from: Data(ops.utf8)))
        } catch let error as ApplyError {
            XCTAssertEqual(screen, try block(base), "a failed apply leaves the screen as it was")
            return error
        }
        return nil
    }

    private func rows(_ screen: Block) throws -> [String] {
        try JSONValue(screen).list("blocks").first?.list("rows").compactMap(\.id) ?? []
    }

    func testMergeSetsFieldsOnANestedBlock() throws {
        let screen = try applied(#"[{"op": "merge", "id": "b", "fields": {"title": "Bee", "subtitle": "new"}}]"#)
        let row = try JSONValue(screen).list("blocks").first?.list("rows").last
        XCTAssertEqual(row?.string("title"), "Bee")
        XCTAssertEqual(row?.string("subtitle"), "new")
    }

    func testInsertGoesBeforeAfterOrAtTheEnd() throws {
        let row = { (id: String) in #"{"type": "row", "id": "\#(id)", "title": "\#(id)"}"# }
        let ops = """
            [{"op": "insert", "into": "l", "before": "a", "block": \(row("x"))},
             {"op": "insert", "into": "l", "after": "a", "block": \(row("y"))},
             {"op": "insert", "into": "l", "block": \(row("z"))},
             {"op": "insert", "into": "l", "before": "gone", "block": \(row("w"))}]
            """
        XCTAssertEqual(try rows(try applied(ops)), ["x", "a", "y", "b", "z", "w"])
    }

    func testInsertAddsALaneToASceneAndARoundToARow() throws {
        let ops = """
            [{"op": "insert", "into": "sc", "block": {"id": "l1", "title": "Lane", "state": "working"}},
             {"op": "insert", "into": "a", "block": {"id": "r1", "name": "Round", "state": "done"}}]
            """
        let screen = try JSONValue(try applied(ops))
        XCTAssertEqual(screen.list("blocks")[2].list("lanes").compactMap(\.id), ["l1"])
        XCTAssertEqual(screen.list("blocks")[0].list("rows")[0].list("rounds").compactMap(\.id), ["r1"])
    }

    func testMoveTakesABlockOutAndPutsItBeforeAnother() throws {
        XCTAssertEqual(try rows(try applied(#"[{"op": "move", "id": "b", "into": "l", "before": "a"}]"#)), ["b", "a"])
        let out = try JSONValue(try applied(#"[{"op": "move", "id": "go", "into": "l"}]"#))
        XCTAssertEqual(out.list("blocks")[0].list("rows").compactMap(\.id), ["a", "b", "go"])
        XCTAssertEqual(out.list("blocks")[1].list("buttons"), [])
    }

    func testRemoveDropsABlockFromACardsButtons() throws {
        let out = try JSONValue(try applied(#"[{"op": "remove", "id": "go"}, {"op": "remove", "id": "a"}]"#))
        XCTAssertEqual(out.list("blocks")[1].list("buttons"), [])
        XCTAssertEqual(out.list("blocks")[0].list("rows").compactMap(\.id), ["b"])
    }

    func testReplaceSwapsTheWholeBlock() throws {
        let out = try applied(#"[{"op": "replace", "id": "t", "block": {"type": "stat", "id": "t", "label": "Up"}}]"#)
        guard case .screen(let s) = out, case .stat(let stat) = s.blocks?.last else { return XCTFail("no stat") }
        XCTAssertEqual(stat.label, "Up")
    }

    func testBadgeAndDotLeaveTheScreenAsItIs() throws {
        XCTAssertEqual(try applied(#"[{"op": "badge", "count": 3}, {"op": "dot", "on": true}]"#), try block(base))
    }

    func testScreenReplacesTheRoot() throws {
        let out = try applied(#"[{"op": "screen", "screen": {"type": "screen", "id": "n", "title": "New"}}]"#)
        XCTAssertEqual(out, try block(#"{"type": "screen", "id": "n", "title": "New"}"#))
    }

    func testAFailingOpLeavesTheScreenAsItWas() throws {
        XCTAssertEqual(try failure(#"[{"op": "remove", "id": "a"}, {"op": "remove", "id": "nope"}]"#), .noBlock("nope"))
        XCTAssertEqual(try failure(#"[{"op": "merge", "id": "nope", "fields": {}}]"#), .noBlock("nope"))
        XCTAssertEqual(try failure(#"[{"op": "move", "id": "a", "into": "nope"}]"#), .noBlock("nope"))
        let row = #"{"type": "row", "id": "x", "title": "x"}"#
        XCTAssertEqual(try failure(#"[{"op": "insert", "into": "t", "block": \#(row)}]"#), .noList("t"))
        XCTAssertEqual(try failure(#"[{"op": "fly", "id": "a"}]"#), .unknown)
        guard case .shape = try failure(#"[{"op": "merge", "id": "a", "fields": {"title": 7}}]"#) else {
            return XCTFail("a merge that breaks the row's shape is no shape error")
        }
    }

    func testReplicaFollowsFramesInOrderAndAsksAgainOnAGap() throws {
        let frames = try JSONDecoder().decode(
            [OldFrame].self,
            from: Data(
                """
                [{"seq": 0, "ops": [{"op": "screen", "screen": \(base)}]},
                 {"seq": 1, "ops": [{"op": "remove", "id": "a"}, {"op": "badge", "count": 2}, {"op": "dot", "on": true}]},
                 {"seq": 3, "ops": [{"op": "remove", "id": "b"}]},
                 {"seq": 2, "ops": [{"op": "remove", "id": "zz"}]}]
                """.utf8))
        var replica = Replica()
        XCTAssertThrowsError(try replica.receive(frames[1])) { XCTAssertEqual($0 as? ApplyError, .gap(want: 0, got: 1)) }
        try replica.receive(frames[0])
        try replica.receive(frames[1])
        XCTAssertEqual(try rows(XCTUnwrap(replica.screen)), ["b"])
        XCTAssertEqual([replica.seq, replica.badge], [1, 2])
        XCTAssertTrue(replica.dot)
        XCTAssertThrowsError(try replica.receive(frames[2])) { XCTAssertEqual($0 as? ApplyError, .gap(want: 2, got: 3)) }
        XCTAssertThrowsError(try replica.receive(frames[3])) { XCTAssertEqual($0 as? ApplyError, .noBlock("zz")) }
        XCTAssertEqual(replica.seq, 1)
        try replica.receive(frames[0])
        XCTAssertEqual(try rows(XCTUnwrap(replica.screen)), ["a", "b"])
    }

    func testTheRustSampleFramesApplyInOrder() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")
        let data = try Data(contentsOf: root.appendingPathComponent("schema/sample.json"))
        var replica = Replica()
        for frame in try JSONDecoder().decode([OldFrame].self, from: data) { try replica.receive(frame) }
        XCTAssertTrue(replica.dot)
    }
}
