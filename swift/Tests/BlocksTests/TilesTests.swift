import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import XCTest

@MainActor
final class TilesTests: XCTestCase {
    private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures")

    private func load<T: Decodable>(_ type: T.Type, _ path: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(contentsOf: fixtures.appendingPathComponent(path)))
    }

    func testTheDefaultTilesAreTheGeneratedStyleTokens() {
        let t = Tiles.default
        XCTAssertEqual([t.radius, t.seam, t.dotSize, t.dotGap, t.rise], [0, 2, 2, 16, 8])
        XCTAssertEqual(t.dot, "--edge")
        XCTAssertEqual([t.settle, t.stagger, t.build, t.enter], [0.16, 0.04, 0.2, 0.16], accuracy: 1e-9)
        XCTAssertEqual(t.ease, [0.2, 0, 0, 1])
        XCTAssertEqual(Look().tiles, t)
    }

    func testTheBuildUpStartsEveryTileByTheBuildTimeInReadingOrder() {
        let t = Tiles.default
        XCTAssertEqual(t.starts(4), [0, 0.04, 0.08, 0.12], accuracy: 1e-9)
        XCTAssertEqual(t.starts(11).last ?? 0, 0.2, accuracy: 1e-9)
        XCTAssertEqual(t.starts(11)[1], 0.02, accuracy: 1e-9)
        XCTAssertEqual(t.starts(26).last ?? 0, 0.2, accuracy: 1e-9)
        XCTAssertEqual(t.starts(1), [0])
    }

    func testAStillStyleWithItsOwnCornersTurnsTheBuildUpOff() throws {
        let still = try load(Style.self, "styles/still.json")
        var own = Tiles.default
        own.radius = 6
        XCTAssertTrue(Look().buildsUp(reduceMotion: false))
        XCTAssertFalse(Look().buildsUp(reduceMotion: true))
        XCTAssertFalse(Look(still: true).buildsUp(reduceMotion: false))
        XCTAssertFalse(Look(style: still, tiles: own).buildsUp(reduceMotion: false))
        XCTAssertFalse(Look(tiles: nil).buildsUp(reduceMotion: false))
        let kinds = try load(Block.self, "look/kinds.json")
        let square = try Snapshot(kinds).run([])
        let round = try Snapshot(kinds, look: Look(style: still, still: true, tiles: own)).run([])
        XCTAssertNotEqual(square.pngs["shot"], round.pngs["shot"])
    }

    func testTheKindsPageDrawsTheTreeTheHTMLHarnessDraws() throws {
        let expect = try load(TreeNode.self, "look/kinds.tree.json")
        for size in [CGSize(width: 390, height: 844), CGSize(width: 1440, height: 900)] {
            let run = try Snapshot(try load(Block.self, "look/kinds.json"), size: size).run(
                [], name: "kinds", expect: expect, check: true)
            XCTAssertEqual(run.faults, [], "\(size)")
        }
    }
}

private func XCTAssertEqual(
    _ a: [Double], _ b: [Double], accuracy: Double, file: StaticString = #filePath, line: UInt = #line
) {
    XCTAssertEqual(a.count, b.count, file: file, line: line)
    for (x, y) in zip(a, b) { XCTAssertEqual(x, y, accuracy: accuracy, file: file, line: line) }
}
