import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import XCTest

private struct Red: BlockStyle {
    func body(content: Content) -> some View { content.background(Color(red: 1, green: 0, blue: 0)) }
}

private struct Squash: BlockStyle {
    func body(content: Content) -> some View { content.frame(height: 0).clipped() }
}

private struct Shove: BlockStyle {
    func body(content: Content) -> some View { content.frame(width: 300).padding(.leading, 200) }
}

private struct Pin: BlockStyle {
    func body(content: Content) -> some View { content.frame(width: 340, alignment: .leading) }
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

    private func find(_ n: TreeNode?, _ id: String) -> TreeNode? {
        guard let n else { return nil }
        return n.id == id ? n : n.children.lazy.compactMap { self.find($0, id) }.first
    }

    func testTheThreadScriptKeepsTheOpenedToolOpenAndDrawsTheScreenTheOpsMake() throws {
        let screen = try load(Block.self, "append/thread.screen.json")
        let steps = try load([Step].self, "append/thread.steps.json")
        let run = try Snapshot(screen).run(steps, check: true)
        XCTAssertEqual(run.faults, [])
        XCTAssertEqual(run.report.dropped, [])
        var applied = screen
        for case .frame(let frame) in steps { try applied.apply(frame.ops ?? []) }
        let open = try Snapshot(applied).run(
            try decode([Step].self, #"[{"tap": {"id": "t7-b"}}, {"shot": {"name": "after"}}]"#))
        let folded = try Snapshot(applied).run([], name: "after")
        XCTAssertEqual(run.trees["after"], open.trees["after"])
        let height = { (r: SnapshotRun) in self.find(r.trees["after"], "t7-b")?.rect?[3] ?? 0 }
        XCTAssertGreaterThan(height(run), height(folded) + 20, "the body of t7-b is still open")
    }

    func testEveryFixtureBlockPassesCheckAndItsTreeHasTheHTMLTreesShape() throws {
        let kinds = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("blocks").path)
            .map { String($0.dropLast(5)) }.sorted()
        XCTAssertEqual(kinds.count, 42)
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

    func testEachFieldsFixtureDrawsAndSwiftRecordsTheHTMLFieldsTreeUploadIncluded() throws {
        let names = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("fields").path)
            .filter { $0.hasSuffix(".json") }.map { String($0.dropLast(5)) }.sorted()
        XCTAssertTrue(names.contains("upload"))
        for name in names {
            let run = try Snapshot(try load(Block.self, "fields/\(name).json")).run([], name: name, check: true)
            XCTAssertEqual(run.faults, [], name)
            let swift = try Data(contentsOf: fixtures.appendingPathComponent("trees/swift/fields/\(name).json"))
            XCTAssertEqual(swift, try Data(contentsOf: fixtures.appendingPathComponent("fields/trees/\(name).json")), name)
            let form = try XCTUnwrap(try load(TreeNode.self, "trees/swift/fields/\(name).json").children.first)
            XCTAssertEqual(Set(form.fields?.map { "\($0.type) \($0.drawn.rawValue)" } ?? []), ["\(name) native"], name)
        }
    }

    func testEachFilesFixtureCaseSendsAndDropsWhatBlocksShotDoes() throws {
        struct Case: Decodable {
            let name: String
            let steps: [Step]
            let sent: [Action]
            let dropped: [String]
        }
        struct Cases: Decodable {
            let screen: String
            let cases: [Case]
        }
        let all = try load(Cases.self, "files/upload.json")
        XCTAssertEqual(all.cases.map(\.name), ["taken", "busy", "gone"])
        for c in all.cases {
            let run = try Snapshot(try load(Block.self, all.screen)).run(c.steps, name: c.name)
            XCTAssertEqual(run.report.sent, c.sent, c.name)
            XCTAssertEqual(run.report.dropped, c.dropped, c.name)
        }
    }

    func testAnUploadRefusesBeforeTheHandlerAndItsSubmitSaysWhyItWaits() throws {
        let screen = try load(Block.self, "fields/upload.json")
        guard case .screen(let s) = screen, case .form(let form)? = s.blocks?.first, case .upload(let field)? = form.fields.dropFirst().first
        else { return XCTFail("fields/upload.json has no photos field") }
        let pick = { (name: String, size: UInt64, mime: String) in FileRow(key: name, name: name, size: size, mime: mime) }
        let rows = field.picked(field.held, [pick("big.jpg", 20_971_520, "image/jpeg")])
        XCTAssertEqual(rows.map(field.status), ["", "refused: 20.0 MB is over 10 MB"])
        let next = field.picked(rows, [pick("note.pdf", 900, "application/pdf"), pick("door.jpg", 3000, "image/jpeg")])
        XCTAssertEqual(next.map(field.status), ["", "refused: only images", "uploading 0 %"])
        XCTAssertEqual(next.waits, "waiting for 1 upload")
        XCTAssertEqual((next + [FileRow(key: "x", name: "x.jpg", size: 2000, mime: "image/jpeg", state: .failed)]).waits, "an upload failed: retry or remove it")
        XCTAssertEqual(field.pick(next), "add photos")
        XCTAssertEqual(field.hint(on: true), "images · up to 10 MB each")
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
        XCTAssertEqual(try Snapshot(bare).run([], name: "bare", check: true).faults, ["bare: render/no-name screen#bare/~0: the block has no name"])
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

    func testAFoldedCardDrawsItsLineAndMainActionAsTheHTMLDoes() throws {
        let card = try decode(
            Block.self,
            #"{"type": "card", "id": "c", "title": "acme · paused", "fold": {"line": "acme · paused · 2 queued", "main": {"block": "q", "action": "resume", "label": "resume"}}, "blocks": [{"type": "choice", "id": "q", "action": "answer", "options": [{"value": "a", "label": "a"}]}]}"#)
        let run = try Snapshot(card).run([], ids: DrawnIdList(blocks: ["c"], actions: ["resume"]), check: true)
        XCTAssertEqual(run.faults, [])
        guard case .card(var open) = card else { return XCTFail("a card") }
        open.fold = nil
        let full = try Snapshot(.card(open)).run([], ids: DrawnIdList(blocks: ["c", "q"], actions: ["answer"]), check: true)
        XCTAssertEqual(full.faults, [])
    }

    func testABlockStyleIsDrawn() throws {
        let button = try load(Block.self, "blocks/button.json")
        let plain = try Snapshot(button).run([])
        let red = try Snapshot(button).blockStyle("button", Red()).run([])
        XCTAssertNotEqual(plain.pngs["shot"], red.pngs["shot"])
    }

    private func plan(_ name: String, _ screens: [String]) throws -> (URL, Plan) {
        let out = URL(fileURLWithPath: ProcessInfo.processInfo.environment["DROVER_SCRATCH_TARGET"] ?? NSTemporaryDirectory())
            .appendingPathComponent("snap-\(name)-\(UUID().uuidString)")
        let runs = screens.map {
            #"{"name": "\#(URL(fileURLWithPath: $0).deletingPathExtension().lastPathComponent)", "screen": "\#(fixtures.appendingPathComponent($0).path)", "size": "390x844", "css": [], "scripts": [], "kinds": [], "steps": [], "probes": true}"#
        }
        return (out, try decode(Plan.self, #"{"out": "\#(out.path)", "runs": [\#(runs.joined(separator: ","))]}"#))
    }

    func testThePlanRunnerSeesNothingOnEveryFixtureBlockAndWritesEachRunAndAnEmptySeenJson() throws {
        let kinds = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("blocks").path).sorted()
        let (out, plan) = try plan("blocks", kinds.map { "blocks/\($0)" })
        XCTAssertEqual(try Snapshot.plan(plan), [])
        XCTAssertEqual(try JSONDecoder().decode([Seen].self, from: Data(contentsOf: out.appendingPathComponent("seen.json"))), [])
        for kind in kinds.map({ String($0.dropLast(5)) }) {
            XCTAssertTrue(FileManager.default.fileExists(atPath: out.appendingPathComponent("\(kind)/\(kind).png").path), kind)
        }
    }

    func testThePlanRunnerSeesWhatBlocksShotSeesForTheFourTreeRulesOnTheBadFixtures() throws {
        let bad = ["no-name", "no-size", "overflow", "overlap"]
        let (out, plan) = try plan("bad", bad.map { "guard/bad/render/\($0).json" })
        var look = Look(still: true)
        look.tiles?.dotGap = -15
        try Snapshot.plan(plan) { run, screen, size in
            switch run.name {
            case "no-size": Snapshot(screen, size: size).blockStyle("text", Squash())
            case "overflow": Snapshot(screen, size: size).blockStyle("text", Shove()).blockStyle("screen", Pin())
            case "overlap": Snapshot(screen, size: size, look: look)
            default: Snapshot(screen, size: size)
            }
        }
        let seen = try JSONDecoder().decode([Seen].self, from: Data(contentsOf: out.appendingPathComponent("seen.json")))
        let want = try load([[String: String]].self, "guard/seen.json")
        XCTAssertEqual(seen.map { ["rule": $0.rule, "run": $0.run ?? "", "at": $0.at] }, want)
    }
}
