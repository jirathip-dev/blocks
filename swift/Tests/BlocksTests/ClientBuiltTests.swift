import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import XCTest

private struct Sent: Codable {
    let action: Action
    let answer: Answer
}

@MainActor
final class ClientBuiltTests: XCTestCase {
    private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures/client")

    private func fixture<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
        try JSONDecoder().decode(type, from: Data(contentsOf: fixtures.appendingPathComponent("\(name).json")))
    }

    private func ids(_ n: TreeNode?) -> [String] {
        guard let n else { return [] }
        return (n.id.map { [$0] } ?? []) + n.children.flatMap(ids)
    }

    func testTheLocalScreenDrawsSendsItsActionAndTakesTheOps() throws {
        let sent = try fixture("send", as: Sent.self)
        let screen = try fixture("screen", as: Block.self)
        let answer = String(decoding: try JSONEncoder().encode(sent.answer), as: UTF8.self)
        let steps = try JSONDecoder().decode(
            [Step].self,
            from: Data(#"[{"shot": {"name": "before"}}, {"tap": {"id": "send"}}, {"answer": \#(answer)}, {"shot": {"name": "after"}}]"#.utf8))
        let run = try Snapshot(screen).run(steps, check: true)
        let got = try XCTUnwrap(run.report.sent.first)
        XCTAssertEqual([got.screen, got.block, got.action], [sent.action.screen, sent.action.block, sent.action.action])
        XCTAssertFalse(ids(run.trees["before"]).contains("send-0"))
        XCTAssertTrue(ids(run.trees["after"]).contains("send-0"), "the inserted row is drawn")
        XCTAssertEqual(run.faults, [])
        var applied = screen
        try applied.apply(sent.answer.ops ?? [])
        XCTAssertEqual(try Snapshot(applied).run([], name: "after").trees["after"], run.trees["after"])
    }
}
