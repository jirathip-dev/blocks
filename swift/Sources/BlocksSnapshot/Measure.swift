import Blocks
import BlocksUI
import Foundation
import ImageIO
import SwiftUI

extension Snapshot {
    /// The facts a look's tiles and palette promise, measured on a kinds page's rects and its PNG: seam, corner, edge, fill, page and dot grid.
    public static func measure(_ png: Data, _ tree: TreeNode, look: Look, scale: CGFloat = 2) -> [String] {
        guard let tiles = look.tiles, let at = Pixels(png, scale: scale), let pair = rows(tree), tree.children.count > 1
        else { return ["look: no tiles, PNG, two sibling rows or two sections to measure"] }
        let (a, b, s0, s1) = (box(pair.0), box(pair.1), box(tree.children[0]), box(tree.children[1]))
        let (size, gap) = (tiles.dotSize, tiles.dotGap)
        let (bg, card, edge, dot) = (rgb(look.palette.background), rgb(look.palette.card), rgb(look.palette.edge), rgb(look.palette.token(tiles.dot)))
        func ground(_ x: CGFloat, _ y: CGFloat) -> [Int] {
            x.truncatingRemainder(dividingBy: gap) >= gap - size && y.truncatingRemainder(dividingBy: gap) >= gap - size ? dot : bg
        }
        let yd = ((s0.maxY + 1 + size) / gap).rounded(.up) * gap - size / 2
        let xd = (s0.width * 0.75 / gap).rounded(.down) * gap - size / 2
        let facts: [(String, CGFloat, CGFloat, [Int])] = [
            ("the corner", a.minX, a.minY, tiles.radius == 0 ? edge : ground(a.minX, a.minY)),
            ("the edge", a.minX, a.midY, edge),
            ("inside the 1px edge", a.minX + 1, a.midY, card),
            ("the fill", a.minX + 4, a.midY, card),
            ("the page in the seam", a.midX, a.maxY + tiles.seam / 2, ground(a.midX, a.maxY + tiles.seam / 2)),
            ("a grid dot", xd, yd, dot),
            ("the page between dots", xd - gap / 2, yd, bg),
        ]
        var out = facts.compactMap { what, x, y, want in
            let got = at.rgb(x, y)
            return got.count == 3 && zip(got, want).allSatisfy({ abs($0 - $1) <= 2 })
                ? nil : "look: \(what) at \(x),\(y) is rgb\(got), expected rgb\(want)"
        }
        if abs(b.minY - a.maxY - tiles.seam) > 0.5 { out.append("look: the seam is \(b.minY - a.maxY), the token says \(tiles.seam)") }
        if (s1.minY - s0.maxY).truncatingRemainder(dividingBy: gap) != 0 {
            out.append("look: the section gap \(s1.minY - s0.maxY) is no multiple of the dot gap \(gap)")
        }
        return out
    }

    private static func rows(_ n: TreeNode) -> (TreeNode, TreeNode)? {
        let rows = n.children.filter { $0.kind == "row" }
        return rows.count > 1 ? (rows[0], rows[1]) : n.children.lazy.compactMap(Self.rows).first
    }

    private static func box(_ n: TreeNode) -> CGRect {
        guard let r = n.rect, r.count == 4 else { return .zero }
        return CGRect(x: r[0], y: r[1], width: r[2], height: r[3])
    }

    private static func rgb(_ color: Color) -> [Int] {
        let c = color.resolve(in: EnvironmentValues())
        return [c.red, c.green, c.blue].map { Int(($0 * 255).rounded()) }
    }
}

private struct Pixels {
    let bytes: [UInt8]
    let width: Int
    let height: Int
    let scale: CGFloat

    init?(_ png: Data, scale: CGFloat) {
        guard let source = CGImageSourceCreateWithData(png as CFData, nil),
            let image = CGImageSourceCreateImageAtIndex(source, 0, nil), let space = CGColorSpace(name: CGColorSpace.sRGB)
        else { return nil }
        let (width, height) = (image.width, image.height)
        var bytes = [UInt8](repeating: 0, count: width * height * 4)
        let drawn = bytes.withUnsafeMutableBytes { buffer in
            guard
                let context = CGContext(
                    data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                    space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
            else { return false }
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard drawn else { return nil }
        (self.bytes, self.width, self.height, self.scale) = (bytes, width, height, scale)
    }

    func rgb(_ x: CGFloat, _ y: CGFloat) -> [Int] {
        let (px, py) = (Int(x * scale), Int(y * scale))
        guard px >= 0, py >= 0, px < width, py < height else { return [] }
        let i = (py * width + px) * 4
        return bytes[i..<i + 3].map(Int.init)
    }
}
