import Foundation

/// Any JSON value: an app's own block, action values, merged fields.
public enum JSONValue: Codable, Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([Self])
    case object([String: Self])

    public init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() {
            self = .null
        } else if let v = try? c.decode(Bool.self) {
            self = .bool(v)
        } else if let v = try? c.decode(Double.self) {
            self = .number(v)
        } else if let v = try? c.decode(String.self) {
            self = .string(v)
        } else if let v = try? c.decode([Self].self) {
            self = .array(v)
        } else {
            self = .object(try c.decode([String: Self].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    /// The JSON form of any encodable value, such as a typed block.
    public init(_ value: some Encodable) throws {
        self = try JSONDecoder().decode(Self.self, from: JSONEncoder().encode(value))
    }

    /// The typed value this JSON holds.
    public func decode<T: Decodable>(_ type: T.Type) throws -> T {
        try JSONDecoder().decode(type, from: JSONEncoder().encode(self))
    }

    public subscript(key: String) -> Self? {
        guard case .object(let object) = self else { return nil }
        return object[key]
    }

    public var string: String? {
        guard case .string(let string) = self else { return nil }
        return string
    }

    public var bool: Bool? {
        guard case .bool(let bool) = self else { return nil }
        return bool
    }

    public var number: Double? {
        guard case .number(let number) = self else { return nil }
        return number
    }

    public var items: [Self] {
        guard case .array(let array) = self else { return [] }
        return array
    }

    public var fields: [String: Self] {
        guard case .object(let object) = self else { return [:] }
        return object
    }

    public var type: String { self["type"]?.string ?? "" }

    public func string(_ key: String) -> String? { self[key]?.string }

    public func list(_ key: String) -> [Self] { self[key]?.items ?? [] }

    public var id: String? { self["id"]?.string }
}

/// Short relative times: `now`, `5m`, `3h`, `2d`.
public enum Relative {
    public static func text(_ seconds: TimeInterval) -> String {
        let minutes = Int(max(0, seconds)) / 60
        if minutes < 1 { return "now" }
        if minutes < 60 { return "\(minutes)m" }
        if minutes < 24 * 60 { return "\(minutes / 60)h" }
        return "\(minutes / (24 * 60))d"
    }

    public static func filled(_ text: String, until: Date?, at now: Date) -> String {
        guard let until else { return text }
        return text.replacingOccurrences(of: "{rel}", with: Self.text(until.timeIntervalSince(now)))
    }
}

/// What a tap sends: the action's name and its values.
public struct BlockAction: Sendable, Equatable {
    public let action: String
    public let values: [String: JSONValue]

    public init(action: String, values: [String: JSONValue]) {
        self.action = action
        self.values = values
    }
}
