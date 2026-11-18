import Blocks
import XCTest

final class SchemeTests: XCTestCase {
    func testEveryBuiltInSchemeIsThereWithEveryToken() {
        XCTAssertEqual(blocksSchemes.keys.sorted(), [
            "dracula", "farm", "farm-light", "garden-dark", "garden-light", "github-dark", "gruvbox", "kitchen",
            "kitchen-light", "nord", "paper", "solarized-dark",
        ])
        for (name, scheme) in blocksSchemes {
            XCTAssertEqual(scheme.tokens.count, 19, name)
        }
        XCTAssertEqual(blocksSchemes["paper"]?.mode, .light)
        XCTAssertEqual(blocksSchemes["paper"]?.tokens["--bg"], "#fbf8f1")
    }
}
