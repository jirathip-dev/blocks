import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import XCTest

@MainActor
final class MeasuredLookTests: XCTestCase {
    private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../fixtures")

    private func load<T: Decodable>(_ type: T.Type, _ path: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(contentsOf: fixtures.appendingPathComponent(path)))
    }

    private func looks() throws -> [(String, Look)] {
        let names = try FileManager.default.contentsOfDirectory(atPath: fixtures.appendingPathComponent("styles").path)
            .filter { $0.hasSuffix(".json") }.sorted()
        var rounded = Tiles.default
        rounded.radius = 6
        var out: [(String, Look)] = []
        for (mode, palette) in [("light", Palette.defaultLight), ("dark", Palette.defaultDark)] {
            out.append(("default \(mode)", Look(palette: palette, still: true)))
            for name in names {
                let style = try load(Style.self, "styles/\(name)")
                out.append(("\(name) \(mode)", Look(palette: palette, style: style, still: true)))
                out.append(("\(name) rounded \(mode)", Look(palette: palette, style: style, still: true, tiles: rounded)))
            }
        }
        return out
    }

    func testEveryLookMeasuresAsItsTilesAndPaletteSayAt390And1440() throws {
        let kinds = try load(Block.self, "look/kinds.json")
        for (name, look) in try looks() {
            for size in [CGSize(width: 390, height: 844), CGSize(width: 1440, height: 900)] {
                let run = try Snapshot(kinds, size: size, look: look).run([], name: "kinds", check: true, measure: true)
                XCTAssertEqual(run.faults, [], "\(name) \(size)")
            }
        }
    }

    func testAForcedDefectFailsTheFactItBreaks() throws {
        let kinds = try load(Block.self, "look/kinds.json")
        let good = Look(palette: .defaultLight, still: true)
        var (seam, corner, fill, grid) = (good, good, good, good)
        seam.tiles?.seam = 0
        corner.tiles?.radius = 8
        fill.palette.card = Color(red: 1, green: 0.94, blue: 0.94)
        grid.tiles?.dotGap = 0
        for (fact, drawn) in [("the seam is 0", seam), ("the corner", corner), ("the fill", fill), ("a grid dot", grid)] {
            let run = try Snapshot(kinds, look: drawn).run([])
            let faults = Snapshot.measure(run.pngs["shot"] ?? Data(), try XCTUnwrap(run.trees["shot"]), look: good)
            XCTAssertTrue(faults.contains { $0.hasPrefix("look: \(fact)") }, "\(fact): \(faults)")
        }
    }
}

