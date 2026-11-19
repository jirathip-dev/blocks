import Blocks
import Foundation
import XCTest

final class SimTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func got(_ c: JSONValue) throws -> JSONValue {
        let state = try (c["state"] ?? .object([:])).decode(BlockState.self)
        if let ops = c["ops"] {
            var screen = try (c["screen"] ?? .null).decode(Block.self)
            do { try screen.apply(try ops.decode([Op].self)) } catch { return .null }
            return try JSONValue(screen)
        }
        if let e = c["expr"] { return try e.decode(Expr.self).eval(state).json }
        let v = Behaviour(c["screen"] ?? .null, state: state)
        let ids = { (s: Set<String>) in JSONValue.array(s.sorted().map(JSONValue.string)) }
        return .object(["hidden": ids(v.hidden), "disabled": ids(v.disabled), "says": .object(v.says.mapValues(JSONValue.string))])
    }

    private func shortest(_ path: URL) throws -> String? {
        guard case .array(let cases)? = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: path))["cases"] else {
            return "no cases"
        }
        let bad = try cases.compactMap { c -> (String, JSONValue, JSONValue)? in
            let want = c["after"] ?? c["value"] ?? c["view"] ?? .null
            let g = (try? got(c)) ?? .string("unreadable")
            return g == want ? nil : (String(decoding: try JSONEncoder().encode(c), as: UTF8.self), c["seed"] ?? .null, g)
        }.sorted { $0.0.count < $1.0.count }
        guard let (s, seed, g) = bad.first, case .number(let n) = seed else { return nil }
        return "\(bad.count) of \(cases.count) cases differ; the shortest, seed \(Int(n)): \(s)\n  gave \(g)"
    }

    func testTheForcedMismatchCorpusNamesItsShortestDifferingSeed() throws {
        let out = try shortest(root.appendingPathComponent("fixtures/sim/mismatch.json"))
        XCTAssertTrue(out?.hasPrefix("3 of 4 cases differ; the shortest, seed 7:") ?? false, out ?? "no mismatch seen")
    }

    func testTheNightlyCorpusGivesSwiftTheCratesScreensValuesAndViews() throws {
        guard let path = ProcessInfo.processInfo.environment["BLOCKS_SIM_CORPUS"] else {
            throw XCTSkip("the nightly corpus: `just sim` writes it")
        }
        let url = path.hasPrefix("/") ? URL(fileURLWithPath: path) : root.appendingPathComponent(path)
        XCTAssertNil(try shortest(url))
    }
}
