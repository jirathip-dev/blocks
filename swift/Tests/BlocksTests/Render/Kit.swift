import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    var root: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../..") }

    func pixels(
        _ view: some View, columns: ClosedRange<Double> = 0...1,
        _ match: (UInt8, UInt8, UInt8, UInt8) -> Bool = { $3 > 0 }
    ) throws -> Int {
        let host = NSHostingView(rootView: view.frame(width: 390).environment(\.look, Look(still: true)))
        host.frame.size = host.fittingSize
        host.layout()
        let rep = try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in: host.bounds))
        host.cacheDisplay(in: host.bounds, to: rep)
        let image = try XCTUnwrap(rep.cgImage)
        let (w, h) = (image.width, image.height)
        var data = [UInt8](repeating: 0, count: w * h * 4)
        let info = CGImageAlphaInfo.premultipliedLast.rawValue
        let space = CGColorSpaceCreateDeviceRGB()
        data.withUnsafeMutableBytes { bytes in
            let context = CGContext(
                data: bytes.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space,
                bitmapInfo: info)
            context?.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        let across = Int(columns.lowerBound * Double(w))...Int(columns.upperBound * Double(w))
        return stride(from: 0, to: data.count, by: 4).filter {
            across.contains($0 / 4 % w) && match(data[$0], data[$0 + 1], data[$0 + 2], data[$0 + 3])
        }
        .count
    }

    func block(_ json: String) throws -> Block { try JSONDecoder().decode(Block.self, from: Data(json.utf8)) }

    func height(_ view: some View) -> CGFloat {
        NSHostingView(rootView: view.frame(width: 390).environment(\.look, Look(still: true))).fittingSize.height
    }

    func fixture(_ kind: String) throws -> Block {
        try JSONDecoder().decode(
            Block.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/blocks/\(kind).json")))
    }

    func near(_ colour: Color) throws -> (UInt8, UInt8, UInt8, UInt8) -> Bool {
        let rgb = try XCTUnwrap(NSColor(colour).usingColorSpace(.sRGB))
        let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
        return { r, g, b, a in a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 12 } }
    }
}
