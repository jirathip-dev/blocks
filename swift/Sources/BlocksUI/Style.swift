import Foundation

/// A style: the tokens the renderer reads, as an app's `style.json` holds them.
public struct Style: Codable, Sendable, Equatable {
    public var type: TypeDesign
    public var radius: Double
    public var surface: Surface
    public var fills: Fills
    public var marks: Marks
    public var sections: Sections
    public var labels: [LabelRole: StyleLabel]

    /// Modern: glass, tinted fills, symbols, upper-case kinds and headers.
    public static let bundled = Style(
        type: .default, radius: 1, surface: .glass, fills: .tint, marks: .symbols, sections: .title,
        labels: [
            .kind: StyleLabel(case: .upper), .header: StyleLabel(case: .upper), .group: StyleLabel(case: .upper),
            .back: StyleLabel(prefix: "‹ "),
        ])
}

public enum TypeDesign: String, Codable, Sendable { case `default`, mono }
public enum Surface: String, Codable, Sendable { case glass, dashed, solid }
public enum Fills: String, Codable, Sendable { case tint, outline }
public enum Marks: String, Codable, Sendable { case symbols, text }
public enum Sections: String, Codable, Sendable { case title, quiet }

public enum LabelRole: String, Codable, CodingKeyRepresentable, Sendable {
    case kind, header, group, section, title, button, chip, back, said, picked
}

public enum LabelCase: String, Codable, Sendable {
    case asIs = "as-is"
    case lower, upper
}

/// Decoration around a label: a prefix and suffix of punctuation, and a case; never other words.
public struct StyleLabel: Codable, Sendable, Equatable {
    public let prefix, suffix: String
    public let `case`: LabelCase

    public init(prefix: String = "", suffix: String = "", case: LabelCase = .asIs) {
        self.prefix = prefix
        self.suffix = suffix
        self.case = `case`
    }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        prefix = try values.decodeIfPresent(String.self, forKey: .prefix) ?? ""
        suffix = try values.decodeIfPresent(String.self, forKey: .suffix) ?? ""
        `case` = try values.decodeIfPresent(LabelCase.self, forKey: .case) ?? .asIs
        let mark = { (glyph: Character) in
            glyph.isASCII && (glyph.isPunctuation || glyph.isSymbol || glyph == " ") || "‹›·•".contains(glyph)
        }
        for affix in [prefix, suffix] where affix.count > 4 || !affix.allSatisfy(mark) {
            throw DecodingError.dataCorruptedError(
                forKey: .prefix, in: values, debugDescription: "\(affix): punctuation and spaces only, at most 4")
        }
    }

    /// The whole text, in the role's case, between its prefix and suffix.
    public func apply(_ text: String) -> String {
        prefix + (`case` == .lower ? text.lowercased() : `case` == .upper ? text.uppercased() : text) + suffix
    }
}
