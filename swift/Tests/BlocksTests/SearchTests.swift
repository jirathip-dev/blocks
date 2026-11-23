import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import XCTest

@MainActor
final class SearchTests: XCTestCase {
    private let admin = """
        {"type": "screen", "id": "admin", "blocks": [
          {"type": "form", "id": "find", "fields": [{"type": "search", "name": "who", "label": "Search people", "value": "anong", "filters": "people"}]},
          {"type": "list", "id": "people", "rows": [
            {"type": "row", "id": "p-1", "title": "Anong Srisuk"}, {"type": "row", "id": "p-2", "title": "Somchai Ops"},
            {"type": "row", "id": "p-3", "title": "Anong Chai", "subtitle": "Ops"}, {"type": "row", "id": "p-4", "title": "Niran Fleet"}]}]}
        """

    func testASearchKeepsTheRowsThatHoldEveryTypedWordInAnyCase() throws {
        let screen = try JSONDecoder().decode(JSONValue.self, from: Data(admin.utf8))
        let seen = { (s: Seek?) in s.map { "\($0.name) \($0.q) \($0.n) of \($0.m)" } }
        XCTAssertEqual(seen(seeks(screen, state: Behaviour.state(screen, edits: [:]))["people"]), "who anong 2 of 4")
        XCTAssertEqual(seen(seeks(screen, state: ["who": .string("OPS anong")])["people"]), "who OPS anong 1 of 4")
        XCTAssertEqual(seeks(screen, state: ["who": .string("hanoi")])["people"]?.n, 0)
    }

    func testTheListDrawsOnlyTheRowsItsSearchKeeps() throws {
        let block = try JSONDecoder().decode(Block.self, from: Data(admin.utf8))
        let steps = try JSONDecoder().decode([Step].self, from: Data(#"[{"shot": {"name": "start"}}, {"type": {"id": "find", "text": "chai"}}, {"shot": {"name": "chai"}}]"#.utf8))
        let run = try Snapshot(block).run(steps, name: "search")
        let rows = { (shot: String) in run.trees[shot]?.children.last?.children.compactMap(\.id) }
        XCTAssertEqual(rows("start"), ["p-1", "p-3"])
        XCTAssertEqual(rows("chai"), ["p-2", "p-3"])
        XCTAssertEqual(run.report.sent, [])
    }
}
