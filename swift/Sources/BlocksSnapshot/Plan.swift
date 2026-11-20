import Blocks
import Foundation

/// A plan run the harness could not draw.
public enum PlanError: Error, Equatable, Sendable {
    case size(String)
}

extension Snapshot {
    /// Draws every run of `plan` with the snapshot `make` builds of its screen and size (the app's own look and views), saves each under `<out>/<run>` and what the tree rules saw as `<out>/seen.json`.
    @discardableResult
    public static func plan(_ plan: Plan, make: (PlanRun, Block, CGSize) -> Snapshot = { Snapshot($1, size: $2) }) throws -> [Seen] {
        let out = URL(fileURLWithPath: plan.out)
        var seen: [Seen] = []
        for r in plan.runs {
            let sides = r.size.split(separator: "x").compactMap { Double($0) }
            guard sides.count == 2 else { throw PlanError.size(r.size) }
            let file = URL(fileURLWithPath: r.screen)
            let screen = try JSONDecoder().decode(Block.self, from: Data(contentsOf: file))
            let run = try make(r, screen, CGSize(width: sides[0], height: sides[1]))
                .run(r.steps, name: file.deletingPathExtension().lastPathComponent, check: r.probes)
            try run.save(to: out.appendingPathComponent(r.name))
            seen += run.seen.map {
                var s = $0
                s.run = r.name
                return s
            }
        }
        try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        let json = JSONEncoder()
        json.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        try json.encode(seen).write(to: out.appendingPathComponent("seen.json"))
        return seen
    }
}
