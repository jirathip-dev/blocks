
public struct Style: Codable, Equatable, Sendable {
    public var fills: Fills
    public var format: UInt8
    public var labels: [String: StyleLabel]
    public var marks: Marks
    public var motion: Double?
    public var radius: Double
    public var sections: Sections
    public var space: Double?
    public var surface: Surface
    public var type: TypeDesign
}

public struct Fills: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let tint = Self(rawValue: "tint")
    public static let outline = Self(rawValue: "outline")
    public static let solid = Self(rawValue: "solid")
    public static let all: [Self] = [.tint, .outline, .solid]
}

public struct LabelCase: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let asIs = Self(rawValue: "as-is")
    public static let lower = Self(rawValue: "lower")
    public static let upper = Self(rawValue: "upper")
    public static let all: [Self] = [.asIs, .lower, .upper]
}

public struct Marks: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let symbols = Self(rawValue: "symbols")
    public static let text = Self(rawValue: "text")
    public static let all: [Self] = [.symbols, .text]
}

public struct Sections: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let title = Self(rawValue: "title")
    public static let quiet = Self(rawValue: "quiet")
    public static let all: [Self] = [.title, .quiet]
}

public struct StyleLabel: Codable, Equatable, Sendable {
    public var `case`: LabelCase?
    public var prefix: String?
    public var suffix: String?
}

public struct Surface: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let glass = Self(rawValue: "glass")
    public static let dashed = Self(rawValue: "dashed")
    public static let solid = Self(rawValue: "solid")
    public static let all: [Self] = [.glass, .dashed, .solid]
}

public struct TypeDesign: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let `default` = Self(rawValue: "default")
    public static let mono = Self(rawValue: "mono")
    public static let all: [Self] = [.`default`, .mono]
}

public struct LabelRole: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let kind = Self(rawValue: "kind")
    public static let header = Self(rawValue: "header")
    public static let group = Self(rawValue: "group")
    public static let section = Self(rawValue: "section")
    public static let title = Self(rawValue: "title")
    public static let button = Self(rawValue: "button")
    public static let chip = Self(rawValue: "chip")
    public static let back = Self(rawValue: "back")
    public static let said = Self(rawValue: "said")
    public static let picked = Self(rawValue: "picked")
    public static let all: [Self] = [.kind, .header, .group, .section, .title, .button, .chip, .back, .said, .picked]
}
