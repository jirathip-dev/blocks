import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

private struct Red: BlockStyle {
    func body(content: Content) -> some View { content.background(Color(red: 1, green: 0, blue: 0)) }
}

@MainActor
final class RenderTests: XCTestCase {
    private static let core = [
        "screen", "sheet", "section", "list", "row", "card", "choice", "form", "config", "secret", "run", "button",
        "chips", "stat", "text", "images", "web", "diff", "editor", "scene", "diagram", "composer",
    ]
    private static let content = ["prose", "hero", "media", "nav"]
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func pixels(
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

    private func block(_ json: String) throws -> Block { try JSONDecoder().decode(Block.self, from: Data(json.utf8)) }

    private func samples() throws -> [String: Block] {
        var found: [String: Block] = [:]
        func walk(_ value: JSONValue) throws {
            if !value.type.isEmpty, AppBlocks.isCore(value.type), found[value.type] == nil {
                found[value.type] = try value.decode(Block.self)
            }
            for key in ["blocks", "rows", "buttons", "block", "screen", "ops"] {
                if let child = value[key] { try walk(child) }
            }
            for item in value.items { try walk(item) }
        }
        let dir = root.appendingPathComponent("fixtures/screens")
        for app in try FileManager.default.contentsOfDirectory(atPath: dir.path).sorted() {
            let folder = dir.appendingPathComponent(app)
            for name in try FileManager.default.contentsOfDirectory(atPath: folder.path).sorted() {
                try walk(JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: folder.appendingPathComponent(name))))
            }
        }
        return found
    }

    func testEveryCoreKindInTheFixturesDraws() throws {
        let found = try samples()
        XCTAssertEqual(Set(found.keys), Set(Self.core))
        for (kind, sample) in found.sorted(by: { $0.key < $1.key }) {
            XCTAssertGreaterThan(try pixels(BlocksView(sample, source: .core)), 0, "\(kind) draws nothing")
        }
    }

    private func height(_ view: some View) -> CGFloat {
        NSHostingView(rootView: view.frame(width: 390).environment(\.look, Look(still: true))).fittingSize.height
    }

    private func fixture(_ kind: String) throws -> Block {
        try JSONDecoder().decode(
            Block.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/blocks/\(kind).json")))
    }

    func testEveryContentKindDrawsItsOwnView() throws {
        for kind in Self.content {
            XCTAssertGreaterThan(try pixels(BlocksView(fixture(kind), source: .core)), 0, "\(kind) draws nothing")
        }
        XCTAssertGreaterThan(height(BlocksView(try fixture("prose"), source: .core)), 150, "every part laid out")
    }

    func testMediaAndHeroKeepTheMediaBoxBeforeThePictureLoads() throws {
        XCTAssertGreaterThanOrEqual(height(BlocksView(try fixture("media"), source: .core)), 390 * 360 / 640)
        XCTAssertGreaterThan(height(BlocksView(try fixture("hero"), source: .core)), 390 * 360 / 640 + 60)
    }

    func testNavPutsTheBrandLeftAndTheLinksRightOnABareBar() throws {
        let nav = BlocksView(try fixture("nav"), source: .core)
        XCTAssertLessThan(height(nav), 60)
        XCTAssertGreaterThan(try pixels(nav, columns: 0...0.25), 0, "the brand")
        XCTAssertGreaterThan(try pixels(nav, columns: 0.75...1), 0, "the links")
        XCTAssertLessThan(try pixels(nav), 390 * 48 / 4, "text only, no filled row")
    }

    func testAWorkingComposerShowsItsStopInRed() throws {
        let rgb = try XCTUnwrap(NSColor(Look(still: true).palette.red).usingColorSpace(.sRGB))
        let red = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in
            let want = [rgb.redComponent, rgb.greenComponent, rgb.blueComponent].map { Int($0 * 255) }
            return a > 200 && zip([r, g, b].map(Int.init), want).allSatisfy { abs($0 - $1) < 24 }
        }
        let idle = #"{"type": "composer", "action": "say", "acts": {"stop": "halt"}, "queued": []}"#
        let busy = #"{"type": "composer", "action": "say", "acts": {"stop": "halt"}, "working": {"since": "2026-01-01T00:00:00Z"}}"#
        XCTAssertEqual(try pixels(BlocksView(block(idle), source: .core), red), 0)
        XCTAssertGreaterThan(try pixels(BlocksView(block(busy), source: .core), red), 0)
    }

    func testAnAppKindDrawsItsRegisteredViewElseItsFallback() throws {
        let pinned = try block(#"{"type": "pinned", "fallback": {"title": "3 pinned"}}"#)
        let red = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in r > 200 && g < 40 && b < 40 && a > 200 }
        let blocks = try AppBlocks([
            "pinned": { _ in AnyView(Color(red: 1, green: 0, blue: 0).frame(width: 20, height: 20)) }
        ])
        XCTAssertEqual(try pixels(BlocksView(pinned, source: .core).appBlocks(blocks), red), 400)
        XCTAssertEqual(try pixels(BlocksView(pinned, source: .core), red), 0)
        XCTAssertGreaterThan(try pixels(BlocksView(pinned, source: .core)), 0, "no fallback drawn")
    }

    func testAnAppKindNamedLikeACoreKindIsRefused() {
        for kind in Self.core + Self.content {
            XCTAssertThrowsError(try AppBlocks([kind: { _ in AnyView(EmptyView()) }])) {
                XCTAssertEqual($0 as? AppBlocksError, .clash(kind))
            }
        }
        XCTAssertNoThrow(try AppBlocks(["pinned": { _ in AnyView(EmptyView()) }]))
    }

    func testABlockStyleWrapsOnlyItsKind() throws {
        let red = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in r > 200 && g < 40 && b < 40 && a > 200 }
        let screen = try block(#"{"type": "section", "blocks": [{"type": "text", "text": "hello"}]}"#)
        XCTAssertGreaterThan(try pixels(BlocksView(screen, source: .core).blockStyle("text", Red()), red), 0)
        XCTAssertEqual(try pixels(BlocksView(screen, source: .core).blockStyle("row", Red()), red), 0)
    }

    func testSlotViewDrawsAResolvedLayoutsNodesThroughTheAppsClosure() throws {
        let layout = try Blocks.Layout(json: layoutFixture("cooee.json"), contract: cooeeContract)
        let tint = { (r: UInt8, g: UInt8, b: UInt8) in
            { (pr: UInt8, pg: UInt8, pb: UInt8, a: UInt8) in
                a > 200 && (pr > 200) == (r > 0) && (pg > 200) == (g > 0) && (pb > 200) == (b > 0)
            }
        }
        func drawn(_ size: SizeClass) -> some View {
            SlotView(layout.resolved(for: size)) { node in
                switch node.content {
                case .component("sidebar"): Color(red: 1, green: 0, blue: 0).frame(width: 20, height: 20)
                case .screen(_, path: "/screens/home"): Color(red: 0, green: 1, blue: 0).frame(width: 20, height: 20)
                default: Color(red: 0, green: 0, blue: 1).frame(width: 20, height: 20)
                }
            }
        }
        XCTAssertEqual(try pixels(drawn(.wide), tint(1, 0, 0)), 400, "the sidebar column")
        XCTAssertEqual(try pixels(drawn(.wide), tint(0, 1, 0)), 400, "home, the first main node")
        XCTAssertEqual(try pixels(drawn(.wide), tint(0, 0, 1)), 0, "chat and the menu stay the app's to open")
        XCTAssertEqual(try pixels(drawn(.compact), tint(1, 0, 0)), 0, "the sidebar is a menu row on compact")
        XCTAssertEqual(try pixels(drawn(.compact), tint(0, 1, 0)), 400)
    }
}
