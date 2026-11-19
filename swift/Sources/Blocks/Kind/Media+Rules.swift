import Foundation

/// A place on the picture, `[x, y]` from 0 to 1 of it.
public typealias Spot = (x: Double, y: Double)

/// What a draw, a move or a stretch gives, as the crate's `MarkChange`; a remove gives `id` alone.
public struct MarkChange: Equatable, Sendable {
    public var id: String?
    public var kind: MarkKind?
    public var at: [Double]?
    public var to: [Double]?
    public var text: String?
    public var group: String?

    /// A change with the fields it has.
    public init(id: String? = nil, kind: MarkKind? = nil, at: [Double]? = nil, to: [Double]? = nil, text: String? = nil, group: String? = nil) {
        (self.id, self.kind, self.at, self.to, self.text, self.group) = (id, kind, at, to, text, group)
    }

    /// The change as the action's value.
    public var value: JSONValue {
        let num = { (p: [Double]) in JSONValue.array(p.map(JSONValue.number)) }
        let all: [(String, JSONValue?)] = [
            ("id", id.map(JSONValue.string)), ("kind", kind.map { .string($0.rawValue) }), ("at", at.map(num)),
            ("to", to.map(num)), ("text", text.map(JSONValue.string)), ("group", group.map(JSONValue.string)),
        ]
        return .object(Dictionary(uniqueKeysWithValues: all.compactMap { k, v in v.map { (k, $0) } }))
    }
}

/// What a new mark is made with, as the crate's `Pen`: its tool, and for keys and named actions where it goes.
public struct Pen: Equatable, Sendable {
    public var tool: MarkKind
    public var at: [Double]?
    public var text: String?
    public var group: String?

    /// A pen for `tool`.
    public init(_ tool: MarkKind, at: [Double]? = nil, text: String? = nil, group: String? = nil) {
        (self.tool, self.at, self.text, self.group) = (tool, at, text, group)
    }
}

/// What a gesture on a picture's marks holds, as the crate's `MarkGrab`.
public enum MarkGrab: Equatable, Sendable {
    case body(String), start(String), end(String), remove(String), draw(Pen)

    /// A grab as a fixture or a harness step writes it: `{"body": id}`, `{"end": id}`, `{"draw": {"tool": …}}`.
    public init?(_ v: JSONValue) {
        let nums = { (x: JSONValue?) in x.map { $0.items.compactMap(\.number) } }
        if let p = v["draw"] {
            guard let tool = p.string("tool") else { return nil }
            self = .draw(Pen(MarkKind(rawValue: tool), at: nums(p["at"]), text: p.string("text"), group: p.string("group")))
            return
        }
        guard let (k, id) = v.fields.first.flatMap({ k, x in x.string.map { (k, $0) } }) else { return nil }
        switch k {
        case "body": self = .body(id)
        case "start": self = .start(id)
        case "end": self = .end(id)
        case "remove": self = .remove(id)
        default: return nil
        }
    }

    fileprivate var id: String? {
        switch self {
        case .body(let i), .start(let i), .end(let i), .remove(let i): i
        case .draw: nil
        }
    }
}

/// A pointer over the picture: where it was pressed and where it is now, each 0 to 1 of the picture.
public struct MarkReach: Equatable, Sendable {
    public var from: [Double]
    public var to: [Double]

    /// A reach from one place to another.
    public init(from: [Double], to: [Double]) { (self.from, self.to) = (from, to) }
}

private let small = 0.02
private let side = 0.05
private let words: [MarkKind: String] = [
    .arrow: "Arrow", .box: "Box", .ellipse: "Ellipse", .text: "Text", .pin: "Pin", .highlight: "Highlight", .line: "Line",
]
private let twoEnded: Set<MarkKind> = [.arrow, .box, .ellipse, .highlight, .line]

private func round(_ x: Double) -> Double { (min(1, max(0, x)) * 10000).rounded() / 10000 + 0 }
private func snap(_ p: Spot) -> [Double] { [round(p.x), round(p.y)] }
private func spot(_ p: [Double]?) -> Spot? { p.flatMap { $0.count == 2 ? ($0[0], $0[1]) : nil } }
private func ends(_ c: MarkChange) -> (Spot, Spot?)? {
    guard let at = spot(c.at) else { return nil }
    guard let t = c.to else { return (at, nil) }
    return spot(t).map { (at, $0) }
}
private func big(_ a: Spot, _ t: Spot) -> Bool { max(abs(t.x - a.x), abs(t.y - a.y)) >= small }
private func placed(_ c: MarkChange, _ at: Spot, _ to: Spot?) -> MarkChange {
    var out = c
    (out.at, out.to) = (snap(at), to.map(snap))
    return out
}

private func moved(_ c: MarkChange, _ d: Spot) -> MarkChange? {
    guard let (a, to) = ends(c) else { return nil }
    let t = to ?? a
    let dx = min(max(d.x, -min(a.x, t.x)), 1 - max(a.x, t.x))
    let dy = min(max(d.y, -min(a.y, t.y)), 1 - max(a.y, t.y))
    return placed(c, (a.x + dx, a.y + dy), to.map { _ in (t.x + dx, t.y + dy) })
}

private func stretched(_ c: MarkChange, end: Bool, _ d: Spot) -> MarkChange? {
    guard let (at, to) = ends(c), let to else { return nil }
    let (p, fixed) = end ? (to, at) : (at, to)
    let s = snap((p.x + d.x, p.y + d.y))
    let pulled = (s[0], s[1])
    let (a, t) = end ? (fixed, pulled) : (pulled, fixed)
    return big(a, t) ? placed(c, a, t) : nil
}

private func made(_ p: Pen, _ at: Spot, _ to: Spot?) -> MarkChange? {
    let text = p.tool == .text ? p.text.flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 } : nil
    if p.tool == .text && text == nil { return nil }
    return placed(MarkChange(kind: p.tool, text: text, group: p.group), at, to)
}

private func drawn(_ p: Pen, _ from: Spot, _ to: Spot) -> MarkChange? {
    let (f, t) = (snap(from), snap(to))
    let (fs, ts) = ((f[0], f[1]), (t[0], t[1]))
    if p.tool == .pin || p.tool == .text { return made(p, ts, nil) }
    return twoEnded.contains(p.tool) && big(fs, ts) ? made(p, fs, ts) : nil
}

private func keyed(_ p: Pen) -> MarkChange? {
    let c = spot(p.at) ?? (0.5, 0.5)
    return twoEnded.contains(p.tool)
        ? made(p, (c.x - side, c.y - side), (c.x + side, c.y + side)) : made(p, c, nil)
}

private func toward(_ d: Spot) -> Nudge.Dir {
    abs(d.x) >= abs(d.y) ? (d.x >= 0 ? .right : .left) : (d.y >= 0 ? .down : .up)
}

private func back(_ d: Nudge.Dir) -> Nudge.Dir {
    switch d {
    case .left: .right
    case .right: .left
    case .up: .down
    case .down: .up
    }
}

/// The word a mark's kind is spoken as.
public func said(_ k: MarkKind) -> String { words[k] ?? k.rawValue }

/// The ninth of the picture a place is in: "upper left", "centre", "middle right".
public func ninth(_ p: [Double]) -> String {
    let (x, y) = spot(p) ?? (0.5, 0.5)
    let row = y < 1 / 3 ? "upper" : y < 2 / 3 ? "middle" : "lower"
    let col = x < 1 / 3 ? "left" : x < 2 / 3 ? "centre" : "right"
    return row == "middle" && col == "centre" ? "centre" : "\(row) \(col)"
}

extension Media: Rules {
    /// The gesture a grab runs: its word's field on the block.
    public func gesture(_ grab: MarkGrab) -> Gesture? {
        switch word(grab) {
        case .move?: move
        case .stretch?: stretch
        case .remove?: remove
        case .draw?: draw
        default: nil
        }
    }

    private func mark(_ id: String) -> Mark? { marks?.first { $0.id == id } }

    private func live(_ id: String, _ g: Gesture?) -> Mark? { g == nil ? nil : mark(id).flatMap { $0.fixed == true ? nil : $0 } }

    /// A mark's spoken name, as the crate's `Media::named`: its group, its kind and number, and its ninth.
    public func named(_ id: String) -> String? {
        guard let m = mark(id) else { return nil }
        let n = ((marks ?? []).filter { $0.kind == m.kind }.firstIndex { $0.id == id } ?? -1) + 1
        let group = m.group.map { "\($0), " } ?? ""
        let place = ninth(m.at)
        let text = m.text ?? ""
        if m.kind == .text { return "\(group)Text “\(text)”, \(place)" }
        if m.kind == .pin && !text.isEmpty { return "\(group)Pin \(text), \(place)" }
        return "\(group)\(said(m.kind)) \(n), \(place)"
    }

    /// A picture's mark rules, as the crate's: a grab is a mark's body, an end, its removal or a pen.
    public func word(_ grab: MarkGrab) -> Word? {
        switch grab {
        case .body(let id): live(id, move).map { _ in .move }
        case .start(let id), .end(let id): live(id, stretch).flatMap { $0.to == nil ? nil : .stretch }
        case .remove(let id): live(id, remove).map { _ in .remove }
        case .draw(let p): draw != nil && tools?.contains(p.tool) == true && words[p.tool] != nil ? .draw : nil
        }
    }

    public func start(_ grab: MarkGrab) -> MarkChange? {
        guard word(grab) != nil else { return nil }
        guard let id = grab.id, let m = mark(id) else { return MarkChange() }
        let c = MarkChange(id: m.id, at: m.at, to: m.to)
        return ends(c).map { placed(c, $0.0, $0.1) }
    }

    public func candidate(_ grab: MarkGrab, _ reach: MarkReach) -> MarkChange? {
        guard let s = start(grab), let f = spot(reach.from), let t = spot(reach.to) else { return nil }
        let d = (t.x - f.x, t.y - f.y)
        switch grab {
        case .body: return moved(s, d)
        case .start: return stretched(s, end: false, d)
        case .end: return stretched(s, end: true, d)
        case .remove(let id): return MarkChange(id: id)
        case .draw(let p): return (0...1).contains(f.x) && (0...1).contains(f.y) ? drawn(p, f, t) : nil
        }
    }

    public func nudge(_ grab: MarkGrab, from: MarkChange, by: Nudge) -> MarkChange? {
        guard let s = start(grab) else { return nil }
        let k = by.big ? 0.1 : 0.01
        let d: Spot =
            switch by.dir {
            case .left: (-k, 0)
            case .right: (k, 0)
            case .up: (0, -k)
            case .down: (0, k)
            }
        let next: MarkChange? =
            switch grab {
            case .draw(let p) where from == s: keyed(p)
            case .body, .draw: moved(from, d)
            case .start: stretched(from, end: false, d)
            case .end: stretched(from, end: true, d)
            case .remove(let id): MarkChange(id: id)
            }
        return next == from ? nil : next
    }

    public func steps(_ grab: MarkGrab) -> [(String, Nudge)] {
        guard let s = start(grab) else { return [] }
        let ways: [(String, Nudge.Dir)]
        switch grab {
        case .body: ways = [("Move up", .up), ("Move down", .down), ("Move left", .left), ("Move right", .right)]
        case .remove: ways = [("Delete", .right)]
        case .draw(let p): ways = [("Add \(said(p.tool).lowercased())", .right)]
        case .start, .end:
            guard let (a, to) = ends(s), let t = to else { return [] }
            let d = toward(grab == .end(grab.id ?? "") ? (t.x - a.x, t.y - a.y) : (a.x - t.x, a.y - t.y))
            ways = [("Longer", d), ("Shorter", back(d))]
        }
        return ways.map { ($0.0, Nudge($0.1)) }.filter { nudge(grab, from: s, by: $0.1) != nil }
    }

    public func says(_ grab: MarkGrab, _ change: MarkChange) -> String {
        let m = grab.id.flatMap(mark)
        if case .remove(let id) = grab, change.at == nil { return "Delete \(named(id) ?? "")" }
        let kind = change.kind ?? m?.kind ?? .arrow
        let text = change.text ?? m?.text
        let what = kind == .text && text != nil ? "Text “\(text ?? "")”" : said(kind)
        guard let (at, to) = ends(change) else { return what }
        return to.map { "\(what), \(ninth([at.x, at.y])) to \(ninth([$0.x, $0.y]))" } ?? "\(what), \(ninth([at.x, at.y]))"
    }
}
