import Blocks
import BlocksUI
import Foundation
import SwiftUI

@MainActor
struct Run {
    var screen: Block
    var edits = BlockState()
    var picks = Picks()
    var opened = Set<String>()
    var seen = Drawn()
    var out = Out()
    let key: String
    let check: Check?
    let draw: @MainActor (Run) -> Drawn

    init(_ screen: Block, check: Check?, draw: @escaping @MainActor (Run) -> Drawn) throws {
        self.screen = screen
        self.key = try JSONValue(screen).id ?? ""
        self.check = check
        self.draw = draw
        redraw()
    }

    mutating func redraw() {
        seen = draw(self)
        for (id, (name, values)) in seen.heard.sorted(by: { $0.key < $1.key }) {
            if let values {
                out.sent.append(.object(["screen": .string(key), "action": .string(name), "block": .string(id), "values": .object(values)]))
            } else {
                out.dropped.append("event \(id) \(name)")
            }
        }
    }

    mutating func take(_ shot: String) throws {
        let tree = try seen.tree.decode(TreeNode.self)
        out.pngs[shot] = seen.png
        out.trees[shot] = tree
        out.shots.append(shot)
        guard let check else { return }
        let (found, faults) = try check.faults(seen, tree, shot)
        out.found += found
        out.faults += faults
    }

    func report(paint: Double) throws -> SnapshotRun {
        let report = try JSONValue.object([
            "shots": .array(out.shots.map(JSONValue.string)), "sent": .array(out.sent),
            "dropped": .array(out.dropped.map(JSONValue.string)),
            "timings": .object(["first_paint_ms": .number(paint), "steps_ms": .array(out.times.map(JSONValue.number))]),
        ]).decode(Report.self)
        return SnapshotRun(report: report, pngs: out.pngs, trees: out.trees, seen: out.found, faults: out.faults)
    }

    static func find(_ b: JSONValue, _ id: String) -> JSONValue? { first(b) { $0.id == id } }

    static func first(_ b: JSONValue, _ hit: (JSONValue) -> Bool) -> JSONValue? {
        if hit(b) { return b }
        let kids = b.list("blocks") + b.list("rows") + b.list("buttons") + b.list("rounds").flatMap { $0.list("blocks") }
        for kid in kids { if let found = first(kid, hit) { return found } }
        return nil
    }
}

struct Out {
    var shots: [String] = [], sent: [JSONValue] = [], dropped: [String] = [], times: [Double] = []
    var pngs: [String: Data] = [:], trees: [String: TreeNode] = [:], found: [Seen] = [], faults: [String] = []
}

@MainActor
final class Drawn {
    var tree: JSONValue = .null
    var taps: [String: BlockAction] = [:]
    var heard: [String: (String, [String: JSONValue]?)] = [:]
    var png = Data()
    var drawnIds = DrawnIdList(blocks: [], actions: [])

    func keep(_ ids: [String]) -> Color {
        let of = { (kind: String) in ids.filter { $0.hasPrefix(kind) }.map { String($0.dropFirst(kind.count)) } }
        drawnIds = DrawnIdList(blocks: of("block:"), actions: of("action:"))
        return .clear
    }

    func keep(_ blocks: [DrawnBlock], _ proxy: GeometryProxy) -> Color {
        tree = blocks.first.map { node($0, proxy) } ?? .null
        return .clear
    }

    private func node(_ b: DrawnBlock, _ proxy: GeometryProxy) -> JSONValue {
        let r = proxy[b.bounds]
        if let id = b.id, let tap = b.tap, !b.hidden, taps[id] == nil { taps[id] = tap }
        return .object([
            "kind": .string(b.kind), "id": b.id.map(JSONValue.string) ?? .null,
            "variant": b.variant.map(JSONValue.string) ?? .null, "drawn": .string(b.hidden ? "hidden" : b.native ? "native" : "fallback"),
            "role": .string(b.role), "name": .string(b.name),
            "rect": .array([r.minX, r.minY, r.width, r.height].map { .number(Double($0)) }),
            "children": .array(b.children.map { node($0, proxy) }),
        ])
    }
}
