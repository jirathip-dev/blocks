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

    /// The values a form's fields start with, its own and its children's.
    public var fieldValues: [String: Self] {
        let own = list("fields").reduce(into: [String: Self]()) { values, field in
            if let name = field.string("name"), let value = field["value"] { values[name] = value }
        }
        return list("blocks").reduce(own) { $0.merging($1.fieldValues) { old, _ in old } }
    }

    public var id: String? { self["id"]?.string }

    /// A shown value as text: a string, a number, or a time since or until `now`.
    public func text(at now: Date) -> String? {
        switch self {
        case .string(let string): return string
        case .number(let number): return number.formatted()
        case .object:
            if let since = self["since"]?.date { return Relative.text(now.timeIntervalSince(since)) }
            return self["until"]?.date.map { Relative.text($0.timeIntervalSince(now)) }
        default: return nil
        }
    }

    public var date: Date? { string.flatMap { try? Date($0, strategy: .iso8601) } }

    /// A list's row ids once the row `moved` is dropped in the place of the row `target`.
    public func rowOrder(moving moved: String, onto target: String) -> [String] {
        var ids = list("rows").compactMap(\.id)
        guard let from = ids.firstIndex(of: moved), let place = ids.firstIndex(of: target) else { return ids }
        ids.remove(at: from)
        ids.insert(moved, at: place)
        return ids
    }
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

    public init?(action: String?, source: JSONValue, values: [String: JSONValue]) {
        let tap = source["tap"] ?? .null
        guard let name = action ?? source.string("action") ?? tap.string("action") else { return nil }
        let own =
            tap["values"]?.fields.merging(source["values"]?.fields ?? [:]) { $1 } ?? source["values"]?.fields ?? [:]
        self.init(action: name, values: own.merging(values) { $1 })
    }
}
