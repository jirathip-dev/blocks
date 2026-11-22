import Blocks
import BlocksSnapshot
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
    func testEveryKindsFixtureDrawsItsOwnView() throws {
        for kind in Block.tags.sorted() {
            XCTAssertGreaterThan(try pixels(BlocksView(fixture(kind), source: .core)), 0, "\(kind) draws nothing")
        }
        XCTAssertGreaterThan(height(BlocksView(try fixture("prose"), source: .core)), 150, "every part laid out")
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
        for kind in Block.tags.sorted() where kind != "scene" {
            XCTAssertThrowsError(try AppBlocks([kind: { _ in AnyView(EmptyView()) }])) {
                XCTAssertEqual($0 as? AppBlocksError, .clash(kind))
            }
        }
        XCTAssertNoThrow(try AppBlocks(["pinned": { _ in AnyView(EmptyView()) }]))
        XCTAssertNoThrow(try AppBlocks(["scene": { _ in AnyView(EmptyView()) }]), "a stage is the app's own art")
    }

    private static let red = { (r: UInt8, g: UInt8, b: UInt8, a: UInt8) in r > 200 && g < 40 && b < 40 && a > 200 }
    private static let square: AppBlocks.Draw = { _ in AnyView(Color(red: 1, green: 0, blue: 0).frame(width: 20, height: 20)) }
    private static let scene = #"{"type": "scene", "id": "ranch", "lanes": [{"id": "l1", "title": "impl", "state": "working"}]}"#

    func testOneBlockThatDoesNotFitItsKindDecodesAsAnAppBlockAndTheRestOfTheScreenStays() throws {
        let screen = try block(
            #"{"type": "screen", "id": "s", "blocks": [{"type": "text", "text": "a"}, {"type": "scene", "id": "ranch", "load": 3, "next": "b"}, {"type": "row", "title": 7}, {"type": "text", "text": "b"}]}"#)
        guard case .screen(let s) = screen, let blocks = s.blocks else { return XCTFail("no screen") }
        XCTAssertEqual(blocks.count, 4)
        guard case .text = blocks[0], case .appBlock(let bad) = blocks[1], case .appBlock = blocks[2], case .text = blocks[3] else {
            return XCTFail("\(blocks)")
        }
        XCTAssertEqual(bad["load"], .number(3), "the bad block keeps its JSON")
    }

    func testAnAppDrawsTheSceneItRegistersDecodedOrNotAndItsLaneFigures() throws {
        let blocks = try AppBlocks(["scene": Self.square])
        let odd = try block(#"{"type": "scene", "id": "ranch", "load": 3, "next": "b"}"#)
        XCTAssertEqual(try pixels(BlocksView(block(Self.scene), source: .core).appBlocks(blocks), Self.red), 400)
        XCTAssertEqual(try pixels(BlocksView(odd, source: .core).appBlocks(blocks), Self.red), 400)
        XCTAssertEqual(try pixels(BlocksView(block(Self.scene), source: .core), Self.red), 0)
        let figures = try AppBlocks([:], figure: Self.square)
        XCTAssertEqual(try pixels(BlocksView(block(Self.scene), source: .core).appBlocks(figures), Self.red), 400)
    }

    func testAnUnknownKindDrawsNothingWhenTheAppSaysSo() throws {
        let gauge = try block(#"{"type": "section", "blocks": [{"type": "gauge", "fallback": {"title": "3 pinned"}}]}"#)
        XCTAssertGreaterThan(height(BlocksView(gauge, source: .core)), 40, "the fallback row by default")
        XCTAssertEqual(height(BlocksView(gauge, source: .core).appBlocks(try AppBlocks([:], unknown: .nothing))), 0)
    }

    func testAScreenDrawsItsTitleUnlessTheAppTurnsItOff() throws {
        let screen = try block(#"{"type": "screen", "id": "s", "title": "Queue", "blocks": [{"type": "text", "text": "a"}]}"#)
        let (shown, off) = (height(BlocksView(screen, source: .core)), height(BlocksView(screen, source: .core).screenTitle(false)))
        XCTAssertGreaterThan(shown, off + 20, "the 30 pt title line is gone")
    }

    func testAnActionCarriesTheIdOfTheBlockItCameFrom() throws {
        var sent: [BlockAction] = []
        let card = try block(
            #"{"type": "card", "id": "c", "blocks": [{"type": "island", "id": "e", "name": "x-echo", "events": ["echo"], "props": {"n": 1}, "fallback": {"title": "e"}}, {"type": "island", "name": "x-echo", "events": ["echo"], "props": {"n": 2}, "fallback": {"title": "-"}}]}"#)
        _ = try pixels(BlocksView(card, source: .core, act: { sent.append($0) }).islands(["x-echo": Snapshot.echo]))
        XCTAssertEqual(Set(sent.map(\.block)), ["e", nil], "a block with no id sends none, not its card's")
        XCTAssertTrue(sent.allSatisfy { ($0.block == "e") == ($0.values["n"] == .number(1)) })
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
