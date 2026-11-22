
public struct LayoutEditMove: Codable, Equatable, Sendable {
    public var before: String?
    public var id: String
    public var into: String
    public var slot: String

    public init(before: String? = nil, id: String, into: String, slot: String) {
        self.before = before
        self.id = id
        self.into = into
        self.slot = slot
    }
}

public struct LayoutEditSwap: Codable, Equatable, Sendable {
    public var a: String
    public var b: String

    public init(a: String, b: String) {
        self.a = a
        self.b = b
    }
}

public struct LayoutEditShow: Codable, Equatable, Sendable {
    public var id: String
    public var place: LayoutPlace
    public var size: SizeClass

    public init(id: String, place: LayoutPlace, size: SizeClass) {
        self.id = id
        self.place = place
        self.size = size
    }
}

public enum LayoutEdit: Codable, Equatable, Sendable {
    case move(LayoutEditMove)
    case swap(LayoutEditSwap)
    case show(LayoutEditShow)
    case unknown

    private enum Tag: String, CodingKey { case tag = "edit" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "move": self = .move(try LayoutEditMove(from: decoder))
        case "swap": self = .swap(try LayoutEditSwap(from: decoder))
        case "show": self = .show(try LayoutEditShow(from: decoder))
        default: self = .unknown
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .move(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("move", forKey: .tag)
        case .swap(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("swap", forKey: .tag)
        case .show(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("show", forKey: .tag)
        case .unknown: var c = encoder.container(keyedBy: Tag.self); try c.encode("unknown", forKey: .tag)
        }
    }
}

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

public struct SizeClass: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let compact = Self(rawValue: "compact")
    public static let wide = Self(rawValue: "wide")
    public static let all: [Self] = [.compact, .wide]
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
