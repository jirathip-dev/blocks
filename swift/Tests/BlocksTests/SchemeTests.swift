import Blocks
import BlocksUI
import XCTest

final class SchemeTests: XCTestCase {
    func testEveryBuiltInSchemeHasEveryToken() {
        XCTAssertEqual(blocksSchemes.count, 12)
        for (name, scheme) in blocksSchemes {
            XCTAssertEqual(scheme.tokens.count, 19, name)
        }
    }

    func testTheDefaultPairIsBuiltInAndThePaletteDefaultsToIt() {
        XCTAssertEqual(blocksDefaultLight.mode, .light)
        XCTAssertEqual(blocksDefaultDark.mode, .dark)
        XCTAssertEqual(blocksDefaultLight.tokens.count, 19)
        XCTAssertEqual(blocksDefaultLight.tokens["--bg"], "#f6f6f6")
        XCTAssertEqual(blocksDefaultDark.tokens["--bg"], "#161616")
        XCTAssertEqual(blocksDefaultStyle["--radius"], "0px")
        XCTAssertEqual(Palette(tokens: blocksDefaultLight.tokens, dark: false), .defaultLight)
        XCTAssertEqual(Palette(tokens: blocksDefaultDark.tokens, dark: true), .defaultDark)
        XCTAssertEqual(Look().palette, .defaultDark)
    }
}
