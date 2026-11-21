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

    func testRowOpsChangeAddAndRemoveATablesRows() throws {
        let table = """
            {"type": "screen", "id": "s", "blocks": [{"type": "table", "id": "t", "columns": [{"id": "n", "label": "N", "kind": "number"}],
              "rows": [{"id": "a", "cells": {"n": 1}}, {"id": "b", "cells": {"n": 2}}]}]}
            """
        let screen = try applied(
            #"""
            [{"op": "merge", "id": "a", "fields": {"cells": {"n": 5}}}, {"op": "remove", "id": "b"},
             {"op": "insert", "into": "t", "before": "a", "block": {"id": "c", "cells": {"n": 3}}}]
            """#, to: table)
        guard case .screen(let s) = screen, case .table(let t)? = s.blocks?.first else { return XCTFail("no table") }
        XCTAssertEqual(t.rows.map(\.id), ["c", "a"])
        XCTAssertEqual(t.rows.last?.cells["n"], .number(5))
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

    func testMergeReplaceAndRemoveReachALaneAndARound() throws {
        let queue = """
            {"type": "screen", "id": "s", "blocks": [
              {"type": "scene", "id": "sc", "lanes": [{"id": "l-722", "title": "#722", "state": "idle"},
                {"id": "l-708", "title": "#708", "state": "idle"}]},
              {"type": "row", "id": "q", "title": "#722", "rounds": [{"id": "r-722-impl", "name": "impl", "state": "working"},
                {"id": "r-722-rev", "name": "rev", "state": "idle"}]}]}
            """
        let merged = try JSONValue(
            try applied(
                #"""
                [{"op": "merge", "id": "l-722", "fields": {"state": "working"}},
                 {"op": "merge", "id": "r-722-impl", "fields": {"state": "done"}},
                 {"op": "replace", "id": "l-708", "block": {"id": "l-708", "title": "#708", "state": "done"}},
                 {"op": "replace", "id": "r-722-rev", "block": {"id": "r-722-rev", "name": "rev", "state": "needs"}}]
                """#, to: queue))
        XCTAssertEqual(merged.list("blocks")[0].list("lanes").compactMap { $0.string("state") }, ["working", "done"])
        XCTAssertEqual(merged.list("blocks")[1].list("rounds").compactMap { $0.string("state") }, ["done", "needs"])
        let removed = try JSONValue(
            try applied(#"[{"op": "remove", "id": "l-722"}, {"op": "remove", "id": "r-722-impl"}]"#, to: queue))
        XCTAssertEqual(removed.list("blocks")[0].list("lanes").compactMap(\.id), ["l-708"])
        XCTAssertEqual(removed.list("blocks")[1].list("rounds").compactMap(\.id), ["r-722-rev"])
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

    func testBadgeSetsTheScreensBadgeAndDotLeavesTheScreenAsItIs() throws {
        guard case .screen(var s) = try applied(#"[{"op": "badge", "count": 3}, {"op": "dot", "on": true}]"#) else {
            return XCTFail("no screen")
        }
        XCTAssertEqual(s.badge, 3)
        s.badge = nil
        XCTAssertEqual(Block.screen(s), try block(base))
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

    func testAppendGrowsAProseBlockAsEachAppendFixtureSays() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")
        let dir = root.appendingPathComponent("fixtures/append")
        let names = try FileManager.default.contentsOfDirectory(atPath: dir.path)
            .filter { $0.hasSuffix(".json") && !$0.hasPrefix("thread.") }.sorted()
        XCTAssertGreaterThanOrEqual(names.count, 10)
        for name in names {
            let c = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: dir.appendingPathComponent(name)))
            let prose = JSONValue.object(["type": .string("prose"), "id": .string("p"), "parts": c["parts"] ?? .array([])])
            let start = try JSONValue.object(["type": .string("screen"), "id": .string("s"), "blocks": .array([prose])]).decode(Block.self)
            var screen = start
            do {
                try screen.apply([try c["op"].map { try $0.decode(Op.self) } ?? .unknown])
                XCTAssertEqual(try JSONValue(screen).list("blocks").first?["parts"], c["want"], name)
            } catch {
                XCTAssertEqual(c["want"], .null, "\(name): \(error)")
                XCTAssertEqual(screen, start, name)
            }
        }
    }

    func testAppendToABlockThatIsNoProseDoesNotFit() throws {
        guard case .shape = try failure(#"[{"op": "append", "id": "t", "text": "x"}]"#) else { return XCTFail("a text took an append") }
        XCTAssertEqual(try failure(#"[{"op": "append", "id": "nope", "text": "x"}]"#), .noBlock("nope"))
    }

    func testInsertMergeAndRemoveReachAMessagesBlocks() throws {
        let thread = """
            {"type": "screen", "id": "s", "blocks": [{"type": "message", "id": "m", "role": "agent", "name": "Scout",
              "blocks": [{"type": "tool", "id": "a", "name": "Read", "state": "running"}, {"type": "text", "id": "b", "text": "hi"}]}]}
            """
        let ops = """
            [{"op": "merge", "id": "a", "fields": {"state": "done"}}, {"op": "remove", "id": "b"},
             {"op": "insert", "into": "m", "block": {"type": "prose", "id": "c", "parts": [], "streaming": true}},
             {"op": "append", "id": "c", "keep": 0, "parts": [{"part": "para", "spans": [{"text": "Hi"}]}]}]
            """
        let kids = try JSONValue(try applied(ops, to: thread)).list("blocks")[0].list("blocks")
        XCTAssertEqual(kids.compactMap(\.id), ["a", "c"])
        XCTAssertEqual(kids[0].string("state"), "done")
        XCTAssertEqual(kids[1].list("parts").first?.list("spans").first?.string("text"), "Hi")
    }

    private func decode<T: Decodable>(_ type: T.Type, _ value: JSONValue?) throws -> T {
        try JSONDecoder().decode(type, from: JSONEncoder().encode(value ?? .null))
    }

    private func run(_ path: URL) throws -> [String] {
        let fixture = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: path))
        guard case .object(let c) = fixture, case .array(let steps)? = c["steps"] else { return ["no steps"] }
        var replica = Replica(v: try decode(UInt8.self, c["v"]))
        var bad: [String] = []
        for (i, step) in steps.enumerated() {
            guard case .object(let s) = step else { return ["step \(i): no object"] }
            let check = { (what: String, got: JSONValue, want: JSONValue?) in
                if got != want ?? .null { bad.append("step \(i): \(what) \(got), want \(String(describing: want))") }
            }
            if let h = s["hello"] {
                check("outdated", replica.hello(try decode(Hello.self, h)).map { .string($0.rawValue) } ?? .null, s["outdated"])
            } else if let k = s["open"]?.string {
                replica.open(k)
            } else if let k = s["close"]?.string {
                replica.close(k)
            } else if let want = s["have"] {
                XCTAssertEqual(replica.have, try decode([Have].self, want), "step \(i): have")
            } else if let f = s["frame"] {
                check("took", .string(replica.frame(try decode(Frame.self, f)).rawValue), s["took"])
            } else if let synced = s["synced"] {
                let took = replica.synced(try decode([Have].self, s["sent"]), try decode(Synced.self, synced))
                check("took", .array(took.map { .string($0.rawValue) }), s["took"])
            } else if case .object(var a)? = s["action"] {
                a["screen"] = nil
                check("action", try JSONValue(try decode(BlockAction.self, .object(a))), .object(a))
            } else {
                bad.append("step \(i): no such step")
            }
        }
        guard case .object(let screens)? = c["screens"] else { return bad + ["no screens"] }
        for (k, want) in screens where replica.screen(k) != (try decode(Block?.self, want)) {
            bad.append("screen \(k): \(String(describing: replica.screen(k)))")
        }
        return bad
    }

    func testTheReplicaRunsEveryProtocolFixture() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")
        let dir = root.appendingPathComponent("fixtures/protocol")
        let names = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".json") }
        XCTAssertGreaterThanOrEqual(names.count, 8)
        for name in names {
            XCTAssertEqual(try run(dir.appendingPathComponent(name)), [], name)
        }
    }

    func testTheReplicaKeepsTheBadgeAndDotOfThePatchesItApplies() throws {
        let frame = { (json: String) in try JSONDecoder().decode(Frame.self, from: Data(json.utf8)) }
        var replica = Replica()
        replica.hello(try JSONDecoder().decode(Hello.self, from: Data(#"{"v": 1, "sid": "s", "epoch": "e", "keys": 16}"#.utf8)))
        replica.open("k")
        XCTAssertEqual(replica.frame(try frame(#"{"k": "k", "rev": 1, "screen": \#(base)}"#)), .replaced)
        let marks = #"[{"op": "badge", "count": 2}, {"op": "dot", "on": true}]"#
        XCTAssertEqual(replica.frame(try frame(#"{"k": "k", "from": 2, "rev": 3, "ops": \#(marks)}"#)), .gap)
        XCTAssertEqual([replica.badge], [nil])
        XCTAssertFalse(replica.dot)
        XCTAssertEqual(replica.frame(try frame(#"{"k": "k", "from": 1, "rev": 2, "ops": \#(marks)}"#)), .patched)
        XCTAssertEqual(replica.badge, 2)
        XCTAssertTrue(replica.dot)
        guard case .screen(let s) = replica.screen("k") else { return XCTFail("no screen") }
        XCTAssertEqual(s.badge, 2)
    }

    func testABurstOfFramesChangesTheReplicaOnceAndEndsAsEachFrameInTurnWould() throws {
        let frame = { (json: String) in try JSONDecoder().decode(Frame.self, from: Data(json.utf8)) }
        var one = Replica()
        one.hello(try JSONDecoder().decode(Hello.self, from: Data(#"{"v": 1, "sid": "s", "epoch": "e", "keys": 16}"#.utf8)))
        one.open("k")
        _ = one.frame(try frame(#"{"k": "k", "rev": 1, "screen": \#(base)}"#))
        let burst = try (1...3).map { i in
            try frame(#"{"k": "k", "from": \#(i), "rev": \#(i + 1), "ops": [{"op": "merge", "id": "a", "fields": {"title": "A\#(i)"}}]}"#)
        }
        var changes = 0
        var replica = one {
            didSet { changes += 1 }
        }
        let took = replica.frames(burst)
        XCTAssertEqual(took, [.patched, .patched, .patched])
        XCTAssertEqual(changes, 1)
        for f in burst { _ = one.frame(f) }
        XCTAssertEqual(replica, one)
        XCTAssertEqual(try JSONValue(XCTUnwrap(replica.screen("k"))).list("blocks").first?.list("rows").first?.string("title"), "A3")
    }
}
