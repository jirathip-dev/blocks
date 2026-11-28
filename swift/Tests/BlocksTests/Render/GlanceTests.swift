import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import SwiftUI
import XCTest

extension RenderTests {
    private func glance(_ name: String) throws -> Glance {
        let file = name.contains("/") ? "fixtures/\(name).json" : "fixtures/blocks/\(name).json"
        let block = try JSONDecoder().decode(Block.self, from: Data(contentsOf: root.appendingPathComponent(file)))
        guard case .glance(let glance) = block else { throw XCTSkip("\(name) is no glance") }
        return glance
    }

    private func rows(_ n: Int) -> [GlanceRow] {
        (0..<n).map { GlanceRow(title: "Build \($0) of the orders service", value: .string("\($0)m")) }
    }

    func testEveryFormOfEveryGlanceDrawsInsideItsBoxLightAndDark() throws {
        let names = [
            "glance", "glance-needs", "glance-bare", "stress/glance-long", "stress/glance-needs-long",
            "stress/glance-bare-long",
        ]
        var blocks = try names.map { ($0, try glance($0)) }
        var none = try glance("glance-needs")
        none.medium?.rows = []
        none.small?.line = nil
        var many = try glance("glance")
        for form in [\Glance.expanded, \Glance.medium, \Glance.small] { many[keyPath: form]?.rows = rows(200) }
        blocks += [("no rows", none), ("200 rows", many)]
        for (name, block) in blocks {
            for form in GlanceForm.allCases {
                for palette in [Palette.defaultLight, .defaultDark] {
                    let shot = Snapshot.form(block, form, look: Look(palette: palette, still: true))
                    XCTAssertEqual(shot.faults, [], "\(name) \(form.rawValue) dark: \(palette.dark)")
                }
            }
        }
    }

    func testATrailingSideDrawsItsOwnTextAndAnEmptySideIsAFault() {
        let wide = Glance(title: String(repeating: "wide ", count: 40), trailing: GlanceSide(text: .string("ask")))
        XCTAssertEqual(Snapshot.form(wide, .trailing, look: Look(still: true)).faults, [])
        let blank = Glance(title: "Builds")
        XCTAssertEqual(
            Snapshot.form(blank, .trailing, look: Look(still: true)).faults, ["trailing: nothing drawn in its box"])
    }

    func testAMissingFormIsDrawnFromTheHeadAndASibling() throws {
        let (turn, needs, bare) = (try glance("glance"), try glance("glance-needs"), try glance("glance-bare"))
        XCTAssertEqual(bare.drawn(.trailing).value, bare.value)
        XCTAssertNil(bare.drawn(.trailing).figure)
        XCTAssertTrue(bare.drawn(.leading).mark)
        XCTAssertNil(bare.drawn(.leading).value)
        XCTAssertFalse(needs.drawn(.leading).mark)
        XCTAssertEqual(needs.drawn(.leading).figure, needs.figure)
        XCTAssertEqual(turn.drawn(.trailing).value, turn.trailing?.text)
        XCTAssertEqual(needs.drawn(.expanded).foot, needs.medium?.foot)
        XCTAssertEqual(needs.drawn(.expanded).rows, needs.medium?.rows)
        XCTAssertEqual(turn.drawn(.small).acts, [])
        XCTAssertEqual(turn.drawn(.small).subtitle, nil)
        XCTAssertEqual(turn.drawn(.medium).acts.count, 1)
        XCTAssertEqual(turn.drawn(.expanded).acts.count, 2)
        XCTAssertEqual(turn.drawn(.expanded).line, turn.expanded?.line)
        XCTAssertEqual(turn.drawn(.medium).line, nil, "a line is drawn only with no row")
        var small = needs
        small.small = nil
        XCTAssertEqual(small.drawn(.small).rows, needs.medium?.rows, "small falls back to medium")
        small.medium = nil
        let head = small.drawn(.small)
        XCTAssertEqual([head.title, head.line, head.foot], [needs.title, nil, nil], "no body: the head alone")
        XCTAssertEqual(head.rows, [])
        let only = Glance(expanded: GlanceBody(foot: "from expanded"), title: "t")
        XCTAssertEqual(only.drawn(.small).foot, "from expanded")
        XCTAssertEqual(only.drawn(.medium).foot, "from expanded")
        var long = turn
        long.medium?.rows = rows(200)
        XCTAssertEqual(long.drawn(.medium).rows.count, 2)
    }

    func testTheFormsAreTheFixturesKeysAndAScreenHandsOutItsGlances() throws {
        let json = try JSONSerialization.jsonObject(
            with: Data(contentsOf: root.appendingPathComponent("fixtures/blocks/glance.json")))
        let keys = Set((json as? [String: Any] ?? [:]).keys)
        XCTAssertTrue(Set(GlanceForm.allCases.map(\.rawValue)).isSubset(of: keys))
        let screen = Block.screen(Screen(blocks: [.glance(try glance("glance")), .glance(try glance("glance-needs"))]))
        XCTAssertEqual(screen.glance("needs"), try glance("glance-needs"))
        XCTAssertNil(screen.glance("turn-2"))
        XCTAssertEqual(Set([try glance("glance"), try glance("glance")]).count, 1)
    }

    func testAGlanceInAScreenDrawsItsMediumForm() throws {
        XCTAssertGreaterThan(try pixels(BlocksView(try fixture("glance"), source: .core)), 0)
        XCTAssertGreaterThan(height(BlocksView(try fixture("glance"), source: .core)), GlanceForm.medium.box.height)
    }
}
