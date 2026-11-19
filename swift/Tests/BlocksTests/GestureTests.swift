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

extension Array {
    fileprivate var nilIfEmpty: Self? { isEmpty ? nil : self }
}
