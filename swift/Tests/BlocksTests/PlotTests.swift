import Blocks
import Foundation
import XCTest

final class PlotTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func cases(_ prefix: String) throws -> [(String, JSONValue)] {
        let dir = root.appendingPathComponent("fixtures/plot")
        return try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasPrefix(prefix) }.sorted().map {
            ($0, try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: dir.appendingPathComponent($0))))
        }
    }

    private func screen(_ blocks: [JSONValue]) throws -> Block {
        try JSONValue.object(["type": .string("screen"), "id": .string("s"), "blocks": .array(blocks)]).decode(Block.self)
    }

    func testPointsRunsEveryOpCase() throws {
        let all = try cases("op-")
        XCTAssertGreaterThanOrEqual(all.count, 7)
        for (name, c) in all {
            let plot = c["plot"] ?? .null
            let start = try screen([plot])
            var got = start
            do {
                try got.apply([try (c["op"] ?? .null).decode(Op.self)])
                let want = JSONValue.object(plot.fields.merging(["series": c["want"] ?? .null]) { $1 })
                XCTAssertEqual(got, try screen([want]), name)
            } catch {
                XCTAssertEqual(c["want"], .null, "\(name): \(error)")
                XCTAssertEqual(got, start, name)
            }
        }
    }

    func testDrawnGivesEveryCaseTheCratesRangesTicksLinesAndReadouts() throws {
        let all = try cases("drawn-")
        XCTAssertGreaterThanOrEqual(all.count, 7)
        for (name, c) in all {
            let plot = try (c["plot"] ?? .null).decode(Plot.self)
            XCTAssertEqual(plot.drawn, try (c["drawn"] ?? .null).decode(PlotDrawn.self), name)
        }
    }

    private struct Stream: Decodable {
        let start: Block
        let frames: [Frame]
        let end: Block
    }

    private func stream() throws -> Stream {
        try JSONDecoder().decode(Stream.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/plot/stream.json")))
    }

    func testTheStreamAppliesToTheCratesEndScreenThroughAReplica() throws {
        let s = try stream()
        var r = Replica()
        r.open("/live")
        XCTAssertEqual(r.frame(Frame(k: "/live", rev: 0, screen: s.start)), .replaced)
        XCTAssertEqual(Set(r.frames(s.frames)), [.patched])
        XCTAssertEqual(r.screen("/live"), s.end)
    }

    private func ids(_ v: JSONValue, _ out: inout [String]) {
        for key in ["blocks", "rows", "buttons", "rounds", "lanes"] {
            for item in v.list(key) {
                if let id = item.id, Block.tags.contains(item.type) { out.append(id) }
                ids(item, &out)
            }
        }
    }

    func testTheTypedWalkReachesEveryBlockTheJSONWalkReaches() throws {
        let every = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/built/every.json")))
        var found: [String] = []
        ids(every, &found)
        XCTAssertGreaterThan(found.count, 40)
        var s = try every.decode(Block.self)
        for id in found {
            var seen: String?
            XCTAssertTrue(try s.edit(id) { seen = $0.typeAndID.id }, id)
            XCTAssertEqual(seen, id)
        }
        XCTAssertFalse(try s.edit("no such block") { _ in })
    }

    func testAMergeOnAPlotKeepsItsPointsAndOneThatBreaksItsShapeDoesNotFit() throws {
        let plot = #"{"type": "plot", "id": "p", "title": "P", "series": [{"name": "A", "x": [0, 1], "y": [2, 3]}]}"#
        var s = try JSONDecoder().decode(Block.self, from: Data(#"{"type": "screen", "id": "s", "blocks": [\#(plot)]}"#.utf8))
        try s.apply([try JSONDecoder().decode(Op.self, from: Data(#"{"op": "merge", "id": "p", "fields": {"title": "Q"}}"#.utf8))])
        guard case .screen(let sc) = s, case .plot(let p)? = sc.blocks?.first else { return XCTFail("no plot") }
        XCTAssertEqual(p.title, "Q")
        XCTAssertEqual(p.series.first?.x, [0, 1])
        let bad = try JSONDecoder().decode(Op.self, from: Data(#"{"op": "merge", "id": "p", "fields": {"series": 7}}"#.utf8))
        XCTAssertThrowsError(try s.apply([bad]))
        XCTAssertEqual(p.series.first?.y, [2, 3])
    }

    func testEachFrameOf80PointsASecondWithAStatAndThePeakMergedAppliesIn2Ms() throws {
        let stat = #"{"type": "stat", "id": "now", "label": "Now", "value": "0 kg"}"#
        let plot = #"{"type": "plot", "id": "pull", "title": "Pull", "y": {"min": 0, "max": 60}, "peak": {"y": 0, "label": "Peak"}, "series": [{"name": "Force", "x": [], "y": []}]}"#
        let stats = (0..<6).map { stat.replacingOccurrences(of: "\"now\"", with: "\"s\($0)\"") }.joined(separator: ", ")
        var s = try JSONDecoder().decode(Block.self, from: Data(#"{"type": "screen", "id": "live", "blocks": [\#(stats), \#(plot)]}"#.utf8))
        let clock = ContinuousClock()
        var (n, worst) = (0, Duration.zero)
        for i in 0..<3600 {
            let k = i % 3 == 2 ? 2 : 1
            let xs = (0..<k).map { Double(n + $0) / 80 }, ys = (0..<k).map { 30 + 12 * sin(Double(n + $0) / 40) }
            n += k
            let ops: [Op] = [
                .merge(OpMerge(fields: ["value": .string("\(ys[0]) kg")], id: "s0")),
                .merge(OpMerge(fields: ["peak": .object(["y": .number(ys[0]), "label": .string("Peak")])], id: "pull")),
                .points(OpPoints(id: "pull", series: "Force", x: xs, y: ys)),
            ]
            let took = try (0..<3).map { _ in
                var copy = s
                return try clock.measure { try copy.apply(ops) }
            }.min() ?? .zero
            try s.apply(ops)
            worst = max(worst, took)
        }
        guard case .screen(let sc) = s, case .plot(let p)? = sc.blocks?.last else { return XCTFail("no plot") }
        XCTAssertEqual(p.series.first?.x.count, 4800)
        XCTAssertLessThanOrEqual(worst, .milliseconds(2), "the slowest frame took \(worst)")
    }
}
