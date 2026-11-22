import Blocks
import BlocksUI
import Foundation

@MainActor
struct Check {
    let expect: TreeNode?
    let ids: DrawnIdList?
    let measure: Bool
    let width: CGFloat
    let look: Look

    func faults(_ seen: Drawn, _ tree: TreeNode, _ shot: String) throws -> ([Seen], [String]) {
        var faults: [String] = []
        if let expect { Self.same(expect, tree, shot, &faults) }
        let probed = try Self.probe(tree, width).map {
            try JSONValue.object(["rule": .string($0), "at": .string($1), "detail": .string($2), "shot": .string(shot)]).decode(Seen.self)
        }
        faults += probed.map { "\(shot): \($0.rule) \($0.at): \($0.detail)" }
        if measure { faults += Snapshot.measure(seen.png, tree, look: look).map { "\(shot): \($0)" } }
        if let ids, ids != seen.drawnIds {
            faults.append("\(shot): drew ids \(seen.drawnIds), expected \(ids)")
        }
        return (probed, faults)
    }

    private static func who(_ n: TreeNode) -> String { n.kind + (n.id.map { "#\($0)" } ?? "") }

    private static func same(_ want: TreeNode, _ got: TreeNode?, _ at: String, _ out: inout [String]) {
        guard let got, want.kind == got.kind, want.id == got.id, want.drawn == got.drawn else {
            let drew = got.map { "\(who($0)) \($0.drawn.rawValue)" } ?? "nothing"
            return out.append("\(at): drew \(drew), expected \(who(want)) \(want.drawn.rawValue)")
        }
        let here = "\(at)/\(who(got))"
        if want.role != got.role || want.name != got.name {
            out.append("\(here): drew \(got.role) \"\(got.name)\", expected \(want.role) \"\(want.name)\"")
        }
        if want.children.count != got.children.count {
            out.append("\(here): \(got.children.count) children, expected \(want.children.count)")
        }
        for (i, child) in want.children.enumerated() {
            same(child, got.children.indices.contains(i) ? got.children[i] : nil, here, &out)
        }
    }

    private static func probe(_ tree: TreeNode, _ width: CGFloat) -> [(String, String, String)] {
        func walk(_ n: TreeNode, _ at: String) -> [(TreeNode, String)] {
            [(n, at)] + n.children.indices.flatMap { walk(n.children[$0], "\(at)/\(step(n.children, $0))") }
        }
        let blocks = walk(tree, step([tree], 0))
        let px = { (v: CGFloat) in String(format: "%g", v) }
        let unnamed = blocks.filter { $0.0.role.isEmpty || $0.0.name.isEmpty }.map {
            ("render/no-name", $0.1, $0.0.role.isEmpty ? "the block has no role" : "the block has no name")
        }
        let sizeless = blocks.filter { $0.0.drawn != .hidden }.map { ($0.1, rect($0.0)) }.filter { !($1.width > 0 && $1.height > 0) }.map {
            ("render/no-size", $0, "\(px($1.width)) by \(px($1.height)) px")
        }
        let outside = blocks.map { ($0.1, rect($0.0)) }.filter { $1.minX < -0.5 || $1.maxX > width + 0.5 }.map {
            ("render/overflow", $0, "the block spans \(px($1.minX.rounded())) to \(px($1.maxX.rounded())) px in a \(px(width)) px screen")
        }
        let wide = blocks.map { rect($0.0).maxX }.max() ?? 0
        let page = wide > width + 0.5 ? [("render/overflow", "", "the page is \(px(wide.rounded())) px wide in a \(px(width)) px screen")] : []
        let covered = blocks.flatMap { n, at in
            let kids = n.children.indices.filter { n.children[$0].drawn != .hidden }
            return kids.enumerated().flatMap { i, a in
                kids.dropFirst(i + 1).filter { b in
                    let both = rect(n.children[a]).intersection(rect(n.children[b]))
                    return !both.isNull && both.width > 0.5 && both.height > 0.5
                }.map { ("render/overlap", "\(at)/\(step(n.children, a))", "it covers \(step(n.children, $0))") }
            }
        }
        return unnamed + sizeless + outside + page + covered
    }

    private static func step(_ sibs: [TreeNode], _ i: Int) -> String {
        let n = sibs[i]
        if let id = n.id { return "\(n.kind)#\(id)" }
        return "\(n.kind)~\(sibs[..<i].filter { $0.id == nil && $0.kind == n.kind }.count)"
    }

    private static func rect(_ n: TreeNode) -> CGRect {
        guard let r = n.rect, r.count == 4 else { return .zero }
        return CGRect(x: r[0], y: r[1], width: r[2], height: r[3])
    }
}
