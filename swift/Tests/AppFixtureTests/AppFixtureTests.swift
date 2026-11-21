import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import XCTest

struct Palette {
    var ink: Color
    var paper: Color
}

struct Style {
    var bold: Bool
}

struct Look {
    var palette: Palette
    var style: Style
}

extension EnvironmentValues {
    @Entry var look = Look(palette: Palette(ink: .blue, paper: .white), style: Style(bold: true))
}

struct Tally: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var card
    let block: JSONValue

    var body: some View {
        let acts = (try? (block["acts"] ?? .array([])).decode([Act].self)) ?? []
        let blocks = (try? (block["blocks"] ?? .array([])).decode([Block].self)) ?? []
        VStack(alignment: .leading) {
            ActButton(source: Source(action: block.string("action"))) {
                RelativeValue { "\(block.string("title") ?? "") \(Calendar.current.component(.year, from: $0) > 2000)" }
            }
            .foregroundStyle(card.tint ?? look.palette.ink)
            BlockStack(blocks: blocks, spacing: 4)
        }
        .contextMenu { MenuItems(acts: acts) { _ in } }
    }
}

struct PosterArt: View {
    @Environment(\.card) private var card

    var body: some View {
        if case .plugin("res") = card.poster { Color(red: 1, green: 0, blue: 1).frame(width: 16, height: 16) }
    }
}

@MainActor
final class AppFixtureTests: XCTestCase {
    private func block(_ json: String) throws -> Block {
        try JSONDecoder().decode(Block.self, from: Data(json.utf8))
    }

    private func names(_ node: TreeNode) -> [String] {
        [node.name] + node.children.flatMap(names)
    }

    func testAnAppBlockBuiltFromPublicPiecesDrawsItsChildren() throws {
        let screen = try block(
            #"""
            {"type": "screen", "id": "home", "title": "Home", "blocks": [
              {"type": "tally", "id": "t", "title": "Tally", "action": "count",
               "acts": [{"label": "Reset", "action": "reset"}],
               "blocks": [{"type": "text", "id": "inner", "text": "Inside the tally"}]}]}
            """#)
        let tally = try AppBlocks(["tally": { AnyView(Tally(block: $0).environment(\.card, CardContext(tint: .red))) }])
        let run = try Snapshot(screen).appBlocks(tally).run([])
        let tree = try XCTUnwrap(run.trees["shot"])
        let tallied = try XCTUnwrap(tree.children.first { $0.id == "t" })
        XCTAssertEqual(tallied.children.map(\.kind), ["text"])
        XCTAssertEqual(tallied.children.map(\.id), ["inner"])
    }

    private static let red = BlocksUI.Palette(
        background: .white, card: .white, edge: Color(red: 1, green: 0, blue: 0), line: Color(red: 1, green: 0, blue: 0),
        foreground: .black, mute: .gray, lead: .black, link: .black, green: .green, amber: .orange, red: .red,
        purple: .purple, cyan: .cyan, dark: false)

    private func dots(_ look: BlocksUI.Look) throws -> Int {
        let screen = try block(#"{"type": "screen", "id": "home", "title": "Home", "blocks": []}"#)
        let view = BlocksView(screen, source: .core).padding(BlocksView.inset).frame(width: 390, height: 400)
            .background(Color.white).blocksLook(look)
            .environment(\.look, Look(palette: Palette(ink: .red, paper: .black), style: Style(bold: false)))
        let renderer = ImageRenderer(content: view)
        let image = try XCTUnwrap(renderer.cgImage)
        let (w, h) = (image.width, image.height)
        var data = [UInt8](repeating: 0, count: w * h * 4)
        let context = try XCTUnwrap(
            CGContext(
                data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        return stride(from: 0, to: data.count, by: 4).filter { data[$0] > 200 && data[$0 + 1] < 60 && data[$0 + 2] < 60 }.count
    }

    private static let art = Color(red: 1, green: 0, blue: 1)

    private func art(_ screen: Block, _ apps: AppBlocks, source: LayoutSource = .core) throws -> Int {
        let view = BlocksView(screen, source: source).appBlocks(apps).padding(BlocksView.inset)
            .frame(width: 390, height: 400, alignment: .topLeading).background(Color.white).blocksLook(BlocksUI.Look(still: true))
        let image = try XCTUnwrap(ImageRenderer(content: view).cgImage)
        let (w, h) = (image.width, image.height)
        var data = [UInt8](repeating: 0, count: w * h * 4)
        let context = try XCTUnwrap(
            CGContext(
                data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        return stride(from: 0, to: data.count, by: 4).filter { data[$0] > 200 && data[$0 + 1] < 60 && data[$0 + 2] > 200 }.count
    }

    func testAnAppDrawsARowsFigureFromItsStateAndToolAndAFigureOnlyRowDecodes() throws {
        let screen = try block(
            #"""
            {"type": "screen", "id": "home", "blocks": [{"type": "list", "id": "l", "rows": [
              {"type": "row", "id": "r", "figure": {"state": "working", "tool": "edit"}}]}]}
            """#)
        guard case .screen(let s) = screen, case .list(let list)? = s.blocks?.first, case .row(let row)? = list.rows.first else {
            return XCTFail("the figure-only row did not decode")
        }
        XCTAssertNil(row.title)
        let sprite = try AppBlocks([:]) { figure in
            let editing = figure.string("state") == "working" && figure.string("tool") == "edit"
            return AnyView(Self.art.frame(width: editing ? 20 : 0, height: 20))
        }
        XCTAssertEqual(try art(screen, try AppBlocks([:])), 0)
        XCTAssertGreaterThanOrEqual(try art(screen, sprite), 20 * 20)
    }

    func testAnAppDrawsACardsPosterInItsHeader() throws {
        let screen = try block(
            #"""
            {"type": "screen", "id": "home", "blocks": [{"type": "card", "id": "c", "kind": "ask", "title": "Merge it?"}]}
            """#)
        let member = try AppBlocks([:], poster: { _ in AnyView(PosterArt()) })
        XCTAssertEqual(try art(screen, try AppBlocks([:]), source: .plugin("res")), 0)
        XCTAssertGreaterThanOrEqual(try art(screen, member, source: .plugin("res")), 16 * 16)
        XCTAssertEqual(try art(screen, member, source: .core), 0, "the app reads who posted from the card context")
    }

    func testTheAppsPaletteWithNoTilesDrawsNoDotGridAndNoBuildUp() throws {
        let tiled = BlocksUI.Look(palette: Self.red)
        let bridged = BlocksUI.Look(palette: Self.red, tiles: nil)
        XCTAssertGreaterThan(try dots(tiled), 0)
        XCTAssertEqual(try dots(bridged), 0)
        XCTAssertTrue(tiled.buildsUp(reduceMotion: false))
        XCTAssertFalse(bridged.buildsUp(reduceMotion: false))
    }
}
