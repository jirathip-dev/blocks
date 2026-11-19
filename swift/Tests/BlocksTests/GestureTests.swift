import Blocks
import BlocksSnapshot
import Foundation
import XCTest

private func number(_ v: JSONValue?) -> Int? { v?.number.map { Int($0) } }

private func event(_ v: JSONValue) -> GestureEvent<Int> {
    switch v.string("on") {
    case "press": .press
    case "move": .move(number(v["c"]))
    case "release": .release
    case "cancel": .cancel
    case "answer": .answer(ok: v["ok"]?.bool ?? false, why: v.string("why"))
    default: .settled
    }
}

private func phase(_ v: JSONValue) -> Phase<Int> {
    switch v.string("at") {
    case "pressed": .pressed
    case "dragging": .dragging
    case "previewing": .previewing(number(v["c"]) ?? -1)
    case "sent": .sent(number(v["c"]) ?? -1)
    case "confirmed": .confirmed
    case "refused": .refused(v.string("why") ?? "?")
    default: .idle
    }
}

private func effect(_ v: JSONValue) -> Effect<Int>? {
    if v == .string("tap") { return .tap }
    return number(v["send"]).map { .send($0) }
}

private func nudge(_ v: JSONValue) -> Nudge {
    Nudge(Nudge.Dir(rawValue: v.string("dir") ?? "") ?? .left, big: v["big"]?.bool ?? false)
}

final class GestureTests: XCTestCase {
    private func read(_ name: String) throws -> JSONValue {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../../../fixtures/gesture/\(name)")
        return try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))
    }

    func testStepGivesEveryMachineAndSimCaseTheCratesPhasesAndEffects() throws {
        for name in ["machine.json", "sim.json"] {
            let cases = try read(name).list("cases")
            XCTAssertGreaterThanOrEqual(cases.count, 10, name)
            for (i, c) in cases.enumerated() {
                let start = number(c["start"]) ?? 0
                var p = Phase<Int>.idle
                for (e, w) in zip(c.list("events"), c.list("want")) {
                    let (next, fx) = step(p, event(e), start: start)
                    XCTAssertEqual(next, phase(w.items[0]), "\(name) \(i)")
                    XCTAssertEqual(fx, effect(w.items[1]), "\(name) \(i)")
                    p = next
                }
            }
        }
    }

    func testListRulesGiveEveryCaseTheCratesOrderWordsAndSteps() throws {
        let f = try read("list.json")
        let list = try XCTUnwrap(f["block"]).decode(Blocks.List.self)
        for c in f.list("cases") {
            let grab = c.string("grab") ?? ""
            let got: [String]? =
                if let r = number(c["reach"]) {
                    list.candidate(grab, r)
                } else {
                    c.list("nudges").reduce(list.start(grab)) { from, n in from.flatMap { list.nudge(grab, from: $0, by: nudge(n)) } }
                }
            XCTAssertEqual(got, c["want"]?.items.compactMap(\.string).nilIfEmpty, grab)
            XCTAssertEqual(got.map { list.says(grab, $0) }, c.string("says"), grab)
        }
        for (grab, want) in f["steps"]?.fields ?? [:] {
            XCTAssertEqual(list.steps(grab).map(\.0), want.items.compactMap(\.string), grab)
        }
    }

    private func cell(_ v: JSONValue?) -> GridGrab {
        if let id = v?.string { return .row(id) }
        return .cell(row: v?.string("row") ?? "", column: v?.string("column") ?? "")
    }

    func testTableRulesGiveEveryCaseTheCratesCellOrOrderWordsStepsAndWorkedCells() throws {
        let f = try read("table.json")
        let t = try XCTUnwrap(f["block"]).decode(Blocks.Table.self)
        let cases = f.list("cases")
        XCTAssertGreaterThanOrEqual(cases.count, 20)
        for c in cases {
            let g = cell(c["grab"])
            let got: GridChange? =
                if let r = c["reach"] {
                    t.candidate(g, r.string.map(GridReach.text) ?? .rows(Int(r.number ?? 0)))
                } else {
                    c.list("nudges").reduce(t.start(g)) { from, n in from.flatMap { t.nudge(g, from: $0, by: nudge(n)) } }
                }
            let want = c["want"] == .null ? nil : c["want"]
            XCTAssertEqual(got?.json, want, "\(g) \(String(describing: c["reach"]))")
            XCTAssertEqual(got.map { t.says(g, $0) }, c.string("says"), "\(g)")
        }
        for (id, want) in f["steps"]?.fields ?? [:] {
            XCTAssertEqual(t.steps(.row(id)).map(\.0), want.items.compactMap(\.string), id)
        }
        for (id, cells) in f["worked"]?.fields ?? [:] {
            let r = try XCTUnwrap(t.rows.first { $0.id == id })
            let w = t.worked(r)
            for (k, v) in cells.fields { XCTAssertEqual(w.cells[k], .number(v.number ?? -1), "\(id) \(k)") }
            XCTAssertEqual(w.cells["cost"] != nil, r.group != true, id)
        }
    }

    func testACellEditAndARowMoveSendTheSameChangeByKeysAndByANamedAction() throws {
        let t = try XCTUnwrap(try read("table.json")["block"]).decode(Blocks.Table.self)
        var typed = try XCTUnwrap(Driven(t, .cell(row: "v2", column: "qty")))
        typed.on(.press)
        typed.reach(.text("8"))
        XCTAssertEqual(typed.on(.release), .send(.cell(CellEdit(row: "v2", column: "qty", value: .number(8)))))
        var bad = try XCTUnwrap(Driven(t, .cell(row: "v2", column: "qty")))
        bad.on(.press)
        bad.reach(.text("8x"))
        XCTAssertNil(bad.on(.release))
        XCTAssertEqual(bad.phase, .idle)
        var keys = try XCTUnwrap(Driven(t, .row("v1")))
        keys.on(.press)
        keys.nudge(Nudge(.down))
        var named = try XCTUnwrap(Driven(t, .row("v1")))
        let want = Effect<GridChange>.send(.order(["ga", "p1", "p2", "gb", "v2", "v1", "x"]))
        XCTAssertEqual(keys.on(.release), want)
        XCTAssertEqual(named.named(Nudge(.down)), want)
        XCTAssertNil(Driven(t, .row("x")))
        XCTAssertNil(Driven(t, .cell(row: "v2", column: "cost")))
    }

    func testKeysAndANamedActionSendTheSameOrderAsAPointer() throws {
        let list = try XCTUnwrap(try read("list.json")["block"]).decode(Blocks.List.self)
        var pointer = try XCTUnwrap(Driven(list, "b"))
        pointer.on(.press)
        pointer.reach(1)
        var keys = try XCTUnwrap(Driven(list, "b"))
        keys.on(.press)
        keys.nudge(Nudge(.down))
        var named = try XCTUnwrap(Driven(list, "b"))
        let want = Effect<[String]>.send(["a", "c", "b", "d"])
        XCTAssertEqual(pointer.on(.release), want)
        XCTAssertEqual(keys.on(.release), want)
        XCTAssertEqual(named.named(Nudge(.down)), want)
        XCTAssertEqual(named.phase, .sent(["a", "c", "b", "d"]))
        XCTAssertNil(Driven(list, "d"))
    }

    private func grab(_ v: JSONValue?) -> BarGrab {
        if let row = v?.string("row") { return .row(row) }
        return .bar(v?.string("bar") ?? "", BarGrab.Part(rawValue: v?.string("part") ?? "") ?? .body)
    }

    private func span(_ v: JSONValue?) -> DaySpan? {
        guard let v, v != .null else { return nil }
        return try? v.decode(DaySpan.self)
    }

    func testTimelineRulesGiveEveryCaseTheCratesSpanWordsAndSteps() throws {
        let f = try read("timeline.json")
        let t = try XCTUnwrap(f["block"]).decode(Timeline.self)
        XCTAssertGreaterThanOrEqual(f.list("cases").count, 30)
        for c in f.list("cases") {
            let g = grab(c["grab"])
            let got: DaySpan? =
                if let r = c["reach"], r != .null {
                    t.candidate(g, Days(number(r["days"]) ?? 0, from: r.string("from")))
                } else {
                    c.list("nudges").reduce(t.start(g)) { from, n in from.flatMap { t.nudge(g, from: $0, by: nudge(n)) } }
                }
            XCTAssertEqual(got, span(c["want"]), "\(g)")
            XCTAssertEqual(got.map { t.says(g, $0) }, c.string("says"), "\(g)")
        }
        for s in f.list("steps") {
            XCTAssertEqual(t.steps(grab(s["grab"])).map(\.0), s.list("want").compactMap(\.string), "\(grab(s["grab"]))")
        }
    }

    func testATimelinesKeysAndNamedActionSendTheSameSpanAsAPointer() throws {
        let t = try XCTUnwrap(try read("timeline.json")["block"]).decode(Timeline.self)
        for (g, name) in [(BarGrab.bar("b7", .body), "One day later"), (.bar("b7", .end), "End one day later")] {
            var pointer = try XCTUnwrap(Driven(t, g))
            pointer.on(.press)
            pointer.reach(Days(1))
            var keys = try XCTUnwrap(Driven(t, g))
            keys.on(.press)
            keys.nudge(Nudge(.right))
            var named = try XCTUnwrap(Driven(t, g))
            let n = try XCTUnwrap(t.steps(g).first { $0.0 == name }?.1)
            let sent = pointer.on(.release)
            XCTAssertNotNil(sent)
            XCTAssertEqual(keys.on(.release), sent, "\(g)")
            XCTAssertEqual(named.named(n), sent, "\(g)")
        }
        XCTAssertNil(Driven(t, .bar("b8", .body)), "a fixed bar takes no gesture")
    }
}

@MainActor
final class GestureSnapshotTests: XCTestCase {
    func testTheHarnessSendsOneOrderByKeysAndByANamedActionAndDropsAPointer() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../../../fixtures/gesture/list.json")
        let list = try XCTUnwrap(try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))["block"])
        let json = { (s: String) in try JSONDecoder().decode(JSONValue.self, from: Data(s.utf8)) }
        let screen = try JSONValue.object(["type": .string("screen"), "id": .string("s"), "title": .string("A"), "blocks": .array([list])])
            .decode(Block.self)
        let want = try json(#"[{"screen":"s","action":"order","block":"accounts","values":{"accounts":["a","c","b","d"]}}]"#)
        for (via, reach) in [("keys", #"[{"dir":"down"}]"#), ("action", #"["Move down"]"#), ("pointer", "[[0, 50]]")] {
            let step = try json(#"{"gesture":{"id":"accounts","grab":"b","via":"\#(via)","reach":\#(reach)}}"#).decode(Step.self)
            let refuse = try json(#"{"refuse":{"toast":"No"}}"#).decode(Step.self)
            let run = try Snapshot(screen).run([step, refuse])
            XCTAssertEqual(try JSONValue(run.report.sent), via == "pointer" ? .array([]) : want, via)
            XCTAssertEqual(run.report.dropped, via == "pointer" ? ["gesture pointer accounts"] : [], via)
        }
    }
}

@MainActor
final class GridSnapshotTests: XCTestCase {
    func testTheHarnessSendsOneCellEditAndOneOrderByKeysAndByANamedActionAndDropsAPointer() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../../../fixtures/gesture/table.json")
        let table = try XCTUnwrap(try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))["block"])
        let json = { (s: String) in try JSONDecoder().decode(JSONValue.self, from: Data(s.utf8)) }
        let screen = try JSONValue.object(["type": .string("screen"), "id": .string("s"), "title": .string("Q"), "blocks": .array([table])])
            .decode(Block.self)
        let cell = try json(#"[{"screen":"s","action":"set-cell","block":"quote","values":{"cell":{"row":"v2","column":"qty","value":8}}}]"#)
        let order = try json(#"[{"screen":"s","action":"order","block":"quote","values":{"rows":["ga","p1","p2","gb","v2","v1","x"]}}]"#)
        let ways: [(String, String, String, JSONValue)] = [
            ("keys", #"{"row":"v2","column":"qty"}"#, #"["8"]"#, cell), ("action", #"{"row":"v2","column":"qty"}"#, #"["8"]"#, cell),
            ("keys", #""v1""#, #"[{"dir":"down"}]"#, order), ("action", #""v1""#, #"["Move down"]"#, order),
            ("pointer", #""v1""#, "[[0, 50]]", .array([])),
        ]
        for (via, grab, reach, want) in ways {
            let step = try json(#"{"gesture":{"id":"quote","grab":\#(grab),"via":"\#(via)","reach":\#(reach)}}"#).decode(Step.self)
            let run = try Snapshot(screen).run([step])
            XCTAssertEqual(try JSONValue(run.report.sent), want, "\(via) \(grab)")
        }
    }
}

@MainActor
final class TimelineSnapshotTests: XCTestCase {
    func testTheHarnessSendsOneSpanByKeysAndByANamedActionAndDropsAPointer() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../../../fixtures/gesture/timeline.json")
        let plan = try XCTUnwrap(try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))["block"])
        let json = { (s: String) in try JSONDecoder().decode(JSONValue.self, from: Data(s.utf8)) }
        let screen = try JSONValue.object(["type": .string("screen"), "id": .string("s"), "title": .string("P"), "blocks": .array([plan])])
            .decode(Block.self)
        let sent = { (span: String) in
            try json(#"[{"screen":"s","action":"schedule","block":"plan","values":{"bar":\#(span)}}]"#)
        }
        let later = #"{"id":"b7","start":"2026-12-04","end":"2026-12-06"}"#
        let first = #"{"row":"j3","start":"2026-12-01","end":"2026-12-01"}"#
        let cases: [(String, String, String, String?)] = [
            (#"{"bar":"b7","part":"body"}"#, "keys", #"[{"dir":"right"}]"#, later),
            (#"{"bar":"b7","part":"body"}"#, "action", #"["One day later"]"#, later),
            (#"{"row":"j3"}"#, "keys", #"[{"dir":"right"}]"#, first),
            (#"{"row":"j3"}"#, "action", #"["Add a bar"]"#, first),
            (#"{"bar":"b7","part":"body"}"#, "pointer", "[[40, 0]]", nil),
            (#"{"bar":"b8","part":"body"}"#, "keys", #"[{"dir":"right"}]"#, nil),
        ]
        for (grab, via, reach, span) in cases {
            let step = try json(#"{"gesture":{"id":"plan","grab":\#(grab),"via":"\#(via)","reach":\#(reach)}}"#).decode(Step.self)
            let run = try Snapshot(screen).run([step])
            XCTAssertEqual(try JSONValue(run.report.sent), try span.map(sent) ?? .array([]), "\(grab) \(via)")
        }
    }
}

extension Array {
    fileprivate var nilIfEmpty: Self? { isEmpty ? nil : self }
}
