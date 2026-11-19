import Blocks
import BlocksSnapshot
import Foundation
import XCTest

private struct Case: Decodable {
    let expr: JSONValue
    let want: Lit
    let state: BlockState?
}

private struct File: Decodable {
    let state: BlockState
    let cases: [Case]
    let screen: JSONValue?
    let view: Shown?
}

private struct Shown: Decodable {
    let hidden: [String]
    let disabled: [String]
    let says: [String: String]
}

@MainActor
final class BehaveTests: XCTestCase {
    private let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures/behave")

    private func file(_ name: String) throws -> File {
        try JSONDecoder().decode(File.self, from: Data(contentsOf: dir.appendingPathComponent(name)))
    }

    func testEvalGivesEveryFixturesBehaveCaseTheCratesValue() throws {
        var (bad, n) = ([String](), 0)
        for name in try FileManager.default.contentsOfDirectory(atPath: dir.path).sorted() {
            let f = try file(name)
            for c in f.cases {
                n += 1
                let got = try c.expr.decode(Expr.self).eval(c.state ?? f.state)
                if got != c.want { bad.append("\(name): \(c.expr) gave \(got), not \(c.want)") }
            }
        }
        XCTAssertGreaterThanOrEqual(n, 50)
        XCTAssertEqual(bad, [])
    }

    func testViewGivesTheViewFixtureTheCratesViewAndStateItsStart() throws {
        let f = try file("view.json")
        let screen = try XCTUnwrap(f.screen)
        let want = try XCTUnwrap(f.view)
        let v = Behaviour(screen, state: f.state)
        XCTAssertEqual(v.hidden.sorted(), want.hidden)
        XCTAssertEqual(v.disabled.sorted(), want.disabled)
        XCTAssertEqual(v.says, want.says)
        let start = Behaviour.state(screen)
        XCTAssertEqual([start["more"], start["plan"], start["email"]], [.bool(false), .string("free"), .null])
        XCTAssertEqual(Behaviour(screen, state: start).says["email"], "Enter an email")
    }

    func testScriptedTypingAndTapsChangeLocalState() throws {
        let screen = try XCTUnwrap(try file("view.json").screen).decode(Block.self)
        let steps = try JSONDecoder().decode(
            [Step].self,
            from: Data(
                """
                [{"shot": {"name": "start"}}, {"type": {"id": "join", "text": "ada@"}}, {"tap": {"id": "join"}},
                 {"type": {"id": "join", "text": "ada@example.org"}}, {"tap": {"id": "join"}},
                 {"tap": {"id": "more"}}, {"shot": {"name": "more"}}, {"tap": {"id": "more"}}]
                """.utf8))
        let run = try Snapshot(screen).run(steps)
        let drawn = { (shot: String) in
            Dictionary(uniqueKeysWithValues: (run.trees[shot]?.children ?? []).map { ($0.id ?? "", $0.drawn.rawValue) })
        }
        XCTAssertEqual(drawn("start")["plans"], "hidden")
        XCTAssertEqual(drawn("start")["box"], "hidden")
        XCTAssertEqual(drawn("start")["later"], "native")
        XCTAssertEqual(drawn("more")["plans"], "native")
        XCTAssertEqual(drawn("more")["box"], "native")
        XCTAssertEqual(run.report.dropped, ["tap join", "tap more"])
        let sent = try JSONValue(run.report.sent)
        XCTAssertEqual(sent.items.map { $0.string("action") }, ["join"])
        XCTAssertEqual(sent.items.first?["values"]?.string("email"), "ada@example.org")
    }
}
