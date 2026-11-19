import Blocks
import Foundation

extension Style {
    /// Modern: glass, tinted fills, symbols, upper-case kinds and headers; fixtures/styles/modern.json.
    public static let bundled = try! JSONDecoder().decode(
        Style.self,
        from: Data(
            #"""
            {"format": 2, "type": "default", "space": 1, "radius": 1, "motion": 1, "surface": "glass", "fills": "tint",
             "marks": "symbols", "sections": "title", "labels": {"kind": {"case": "upper"}, "header": {"case": "upper"},
             "group": {"case": "upper"}, "back": {"prefix": "‹ "}}}
            """#.utf8))
}

extension StyleLabel {
    /// The whole text, in the role's case, between its prefix and suffix.
    public func apply(_ text: String) -> String {
        (prefix ?? "") + (`case` == .lower ? text.lowercased() : `case` == .upper ? text.uppercased() : text)
            + (suffix ?? "")
    }
}
