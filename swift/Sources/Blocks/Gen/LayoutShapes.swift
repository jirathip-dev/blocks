
public struct LayoutPlace: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let push = Self(rawValue: "push")
    public static let sheet = Self(rawValue: "sheet")
    public static let panel = Self(rawValue: "panel")
    public static let column = Self(rawValue: "column")
    public static let strip = Self(rawValue: "strip")
    public static let cards = Self(rawValue: "cards")
    public static let menu = Self(rawValue: "menu")
    public static let inline = Self(rawValue: "inline")
    public static let hidden = Self(rawValue: "hidden")
    public static let all: [Self] = [.push, .sheet, .panel, .column, .strip, .cards, .menu, .inline, .hidden]
}

public struct LayoutTransition: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let push = Self(rawValue: "push")
    public static let sheet = Self(rawValue: "sheet")
    public static let fade = Self(rawValue: "fade")
    public static let none = Self(rawValue: "none")
    public static let all: [Self] = [.push, .sheet, .fade, .none]
}
