import Foundation

/// A screen's local state: a value by key.
public typealias BlockState = [String: Lit]

extension Lit {
    /// A plain JSON value as a `Lit`; a list or an object is null.
    public init(_ v: JSONValue?) {
        switch v {
        case .bool(let b): self = .bool(b)
        case .number(let n): self = .number(n)
        case .string(let s): self = .string(s)
        default: self = .null
        }
    }

    /// The value as JSON, for an action's values.
    public var json: JSONValue {
        switch self {
        case .null: .null
        case .bool(let b): .bool(b)
        case .number(let n): .number(n)
        case .string(let s): .string(s)
        }
    }

    fileprivate var flag: Bool? {
        switch self {
        case .null: false
        case .bool(let b): b
        default: nil
        }
    }

    fileprivate var text: String {
        switch self {
        case .null: ""
        case .bool(let b): b ? "true" : "false"
        case .number(let n): shown(n)
        case .string(let s): s
        }
    }

    fileprivate func matches(_ p: Pattern) -> Lit {
        switch (p, self) {
        case (.filled, .null): .bool(false)
        case (.filled, .string(let s)): .bool(!trim(s).isEmpty)
        case (.filled, _), (.number, .number): .bool(true)
        case (.number, .string(let s)): .bool(numeric(s))
        case (.email, .string(let s)): .bool(email(s))
        case (.url, .string(let s)): .bool(url(s))
        default: .null
        }
    }
}

private func shown(_ v: Double) -> String {
    let parts = "\(abs(v))".split(separator: "e")
    let m = parts.first.map(String.init) ?? "0"
    var x = (parts.count > 1 ? Int(parts[1]) : nil) ?? 0
    x += (m.split(separator: ".", omittingEmptySubsequences: false).first?.count ?? 1) - 1
    var d = Array(m.filter(\.isNumber))
    while d.first == "0", d.count > 1 { d.removeFirst(); x -= 1 }
    while d.last == "0", d.count > 1 { d.removeLast() }
    if d == ["0"] { return "0" }
    let (s, k, n) = (String(d), d.count, x + 1)
    let body: String
    if k <= n, n <= 21 {
        body = s + String(repeating: "0", count: n - k)
    } else if 0 < n, n <= 21 {
        body = String(d[..<n]) + "." + String(d[n...])
    } else if -6 < n, n <= 0 {
        body = "0." + String(repeating: "0", count: -n) + s
    } else {
        body = String(d[0]) + (k > 1 ? "." + String(d[1...]) : "") + "e" + (n > 0 ? "+" : "-") + String(abs(n - 1))
    }
    return (v < 0 ? "-" : "") + body
}

private func trim(_ s: String) -> String { s.trimmingCharacters(in: .whitespacesAndNewlines) }

private func blank(_ s: String) -> Bool { s.unicodeScalars.contains { $0.properties.isWhitespace } }

private func numeric(_ s: String) -> Bool {
    let t = trim(s)
    return t.wholeMatch(of: /[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?/) != nil && Double(t)?.isFinite == true
}

private func email(_ s: String) -> Bool {
    guard let at = s.firstIndex(of: "@") else { return false }
    let (user, host) = (s[..<at], s[s.index(after: at)...])
    guard let dot = host.firstIndex(of: ".") else { return false }
    let split = dot > host.startIndex && host.index(after: dot) < host.endIndex && !host.hasSuffix(".")
    return !user.isEmpty && split && !host.contains("@") && !blank(s)
}

private func url(_ s: String) -> Bool {
    guard let p = ["https://", "http://"].first(where: s.hasPrefix) else { return false }
    let rest = s.dropFirst(p.count)
    return !rest.isEmpty && !rest.hasPrefix("/") && !blank(s)
}

private func finite(_ n: Double) -> Lit { n.isFinite ? .number(n) : .null }

extension Expr {
    /// The value in `state`, as the crate's `eval`: total, a wrong type gives null, null is false.
    public func eval(_ state: BlockState) -> Lit {
        let of = { (e: Expr) in e.eval(state) }
        let pair = { (xs: [Expr]) in xs.count == 2 ? (of(xs[0]), of(xs[1])) : nil }
        let flags = { (xs: [Expr]) -> [Bool]? in
            let fs = xs.map { of($0).flag }
            return fs.contains(nil) ? nil : fs.compactMap { $0 }
        }
        let sum = { (xs: [Expr], f: (Double, Double) -> Double) -> Lit in
            guard case (.number(let a), .number(let b))? = pair(xs) else { return .null }
            return finite(f(a, b))
        }
        switch self {
        case .lit(let l): return l
        case .get(let k): return state[k] ?? .null
        case .not(let x): return of(x).flag.map { .bool(!$0) } ?? .null
        case .all(let xs): return flags(xs).map { .bool(!$0.contains(false)) } ?? .null
        case .any(let xs): return flags(xs).map { .bool($0.contains(true)) } ?? .null
        case .eq(let xs): return pair(xs).map { .bool($0 == $1) } ?? .null
        case .lt(let xs):
            switch pair(xs) {
            case (.number(let a), .number(let b))?: return .bool(a < b)
            case (.string(let a), .string(let b))?: return .bool(a.unicodeScalars.lexicographicallyPrecedes(b.unicodeScalars))
            default: return .null
            }
        case .len(let x):
            guard case .string(let s) = of(x) else { return .null }
            return .number(Double(s.unicodeScalars.count))
        case .has(let xs):
            guard case (.string(let a), .string(let b))? = pair(xs) else { return .null }
            return .bool(b.isEmpty || a.range(of: b, options: .literal) != nil)
        case .is(let m): return m.value.eval(state).matches(m.pattern)
        case .add(let xs): return sum(xs, +)
        case .sub(let xs): return sum(xs, -)
        case .mul(let xs): return sum(xs, *)
        case .div(let xs): return sum(xs, /)
        case .cat(let xs): return .string(xs.map { of($0).text }.joined())
        case .pick(let xs):
            guard xs.count == 3, let f = of(xs[0]).flag else { return .null }
            return of(xs[f ? 1 : 2])
        case .unknown: return .null
        }
    }

    /// Whether every operation and pattern in the tree is one this version knows; an unknown one counts as absent.
    public var known: Bool {
        switch self {
        case .lit, .get: true
        case .not(let x), .len(let x): x.known
        case .all(let xs), .any(let xs), .cat(let xs): xs.allSatisfy(\.known)
        case .eq(let xs), .lt(let xs), .has(let xs), .add(let xs), .sub(let xs), .mul(let xs), .div(let xs): xs.count == 2 && xs.allSatisfy(\.known)
        case .pick(let xs): xs.count == 3 && xs.allSatisfy(\.known)
        case .is(let m): Pattern.all.contains(m.pattern) && m.value.known
        case .unknown: false
        }
    }
}

/// What the state makes of a screen, as the crate's `behave::View`: by block id, field name, action or state key.
public struct Behaviour: Equatable, Sendable {
    public var hidden: Set<String> = []
    public var disabled: Set<String> = []
    public var says: [String: String] = [:]
    public var acts: Set<String> = []
    public var values: [String: String] = [:]

    public init() {}

    /// What `state` makes of `screen`: a `show` or `enabled` that does not hold, a check that fails.
    public init(_ screen: JSONValue, state: BlockState) { walk(screen, state) }

    /// The screen's start state (its `state`, each field's `value`, each chips' first `selected`) under `edits`.
    public static func state(_ screen: JSONValue, edits: BlockState = [:]) -> BlockState {
        var s = screen["state"]?.fields.mapValues { Lit($0) } ?? [:]
        seed(screen, &s)
        return s.merging(edits.filter { s[$0.key] != nil }) { $1 }
    }

    /// What `field` holding `held` puts in local state: null, a switch, a number or a string; a list puts its length, an empty one null.
    public static func lit(_ field: JSONValue, _ held: JSONValue?) -> Lit {
        guard case .array(let all) = held else { return Lit(held) }
        return all.isEmpty ? .null : .number(Double(all.count))
    }

    /// The values a tap's `sets` give, each in the state the ones before it left; an unknown one is skipped.
    public static func tap(_ sets: [SetState], state: BlockState) -> BlockState {
        var s = state
        var out: BlockState = [:]
        for set in sets where set.to.known {
            s[set.key] = set.to.eval(s)
            out[set.key] = s[set.key]
        }
        return out
    }

    private static func kids(_ b: JSONValue) -> [JSONValue] {
        b.list("blocks") + b.list("rows") + b.list("buttons") + b.list("rounds").flatMap { $0.list("blocks") }
    }

    private static func seed(_ b: JSONValue, _ s: inout BlockState) {
        for f in b.list("fields") { if let name = f.string("name") { s[name] = lit(f, f["value"] ?? f["files"]) } }
        if b.type == "chips", let name = b.string("name") { s[name] = Lit(b["selected"]?.items.first) }
        for c in kids(b) { seed(c, &s) }
    }

    private static func holds(_ v: JSONValue?, _ state: BlockState) -> Bool? {
        guard let v, v != .null, let e = try? v.decode(Expr.self), e.known else { return nil }
        return e.eval(state) == .bool(true)
    }

    private mutating func walk(_ b: JSONValue, _ state: BlockState) {
        guard case .object = b else { return }
        let id = b.id
        if Self.holds(b["show"], state) == false {
            if let id { hidden.insert(id) }
            return
        }
        if Self.holds(b["enabled"], state) == false, let id { disabled.insert(id) }
        var failing = false
        for f in b.list("fields") {
            guard let name = f.string("name") else { continue }
            if Self.holds(f["show"], state) == false {
                hidden.insert(name)
                continue
            }
            if Self.holds(f["enabled"], state) == false { disabled.insert(name) }
            let bad = f.list("checks").first { c in c.string("say") != nil && Self.holds(c["ok"], state) == false }
            if let say = bad?.string("say") {
                failing = true
                says[name] = say
            }
        }
        if failing, let id { disabled.insert(id) }
        let all = b.list("actions") + b.list("swipe") + b.list("menu") + (["button"] + Word.all).compactMap { b[$0] }
        for a in all + all.flatMap({ $0.list("menu") }) where Self.holds(a["enabled"], state) == false {
            if let key = a.string("action") ?? a["tap"]?.string("action") { acts.insert(key) }
        }
        for i in [b] + b.list("items") {
            if let key = i["value"]?.string("get") { values[key] = (state[key] ?? .null).text }
        }
        for c in Self.kids(b) { walk(c, state) }
    }
}
