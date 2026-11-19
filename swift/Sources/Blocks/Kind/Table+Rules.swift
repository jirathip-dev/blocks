import Foundation

/// What a table's gesture grabs: one cell to type into, or a row by its handle.
public enum GridGrab: Equatable, Sendable {
    case cell(row: String, column: String)
    case row(String)
}

/// How far a grab reaches: the typed text for a cell, a number of rows for a row.
public enum GridReach: Equatable, Sendable {
    case text(String)
    case rows(Int)
}

/// What a cell edit gives, as the crate's `CellEdit`.
public struct CellEdit: Equatable, Sendable {
    public let row: String
    public let column: String
    public let value: Cell

    /// An edit of one cell to `value`.
    public init(row: String, column: String, value: Cell) {
        (self.row, self.column, self.value) = (row, column, value)
    }

    /// The edit as the action's JSON value.
    public var json: JSONValue {
        let v: JSONValue =
            switch value {
            case .number(let n): .number(n)
            case .string(let s): .string(s)
            case .label(let l): .string(l.text)
            }
        return .object(["row": .string(row), "column": .string(column), "value": v])
    }
}

/// What a table's gesture gives: one cell's new value, or every row id in the new order.
public enum GridChange: Equatable, Sendable {
    case cell(CellEdit)
    case order([String])

    /// The change as the action's JSON value.
    public var json: JSONValue {
        switch self {
        case .cell(let e): e.json
        case .order(let ids): .array(ids.map(JSONValue.string))
        }
    }
}

private let named: [(String, Nudge)] = [
    ("Move up", Nudge(.up)), ("Move down", Nudge(.down)), ("Move to top", Nudge(.up, big: true)),
    ("Move to bottom", Nudge(.down, big: true)),
]

extension Column {
    private static let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    private static let thai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

    /// Whether the column holds numbers: number, money or bar.
    public var numeric: Bool { [.number, .money, .bar].contains(kind) }

    /// A number grouped as en-US with up to `digits` decimals, all of them when `fixed`.
    public static func grouped(_ v: Double, _ digits: Int, fixed: Bool) -> String {
        let f = NumberFormatter()
        f.locale = Locale(identifier: "en_US")
        f.numberStyle = .decimal
        f.minimumFractionDigits = fixed ? digits : 0
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: v)) ?? ""
    }

    /// A number as the column draws it: money to 2 decimals, else at most `digits` (2).
    public func number(_ v: Double) -> String {
        kind == .money ? Self.grouped(v, 2, fixed: true) : Self.grouped(v, Int(digits ?? 2), fixed: false)
    }

    /// A cell as drawn text; `thai` writes a Buddhist-Era date's month in Thai.
    public func shown(_ c: Cell?, thai: Bool) -> String {
        switch c {
        case nil: ""
        case .label(let l): l.text
        case .number(let n): number(n)
        case .string(let s) where kind == .date: date(s, thai: thai)
        case .string(let s): s
        }
    }

    private func date(_ iso: String, thai: Bool) -> String {
        let p = iso.split(separator: "-").compactMap { Int($0) }
        let be = era == .be
        let names = be && thai ? Self.thai : Self.months
        guard p.count == 3, (1...12).contains(p[1]) else { return iso }
        return "\(p[2]) \(names[p[1] - 1]) \(p[0] + (be ? 543 : 0))"
    }

    /// The cell a typed text gives, as the crate's `Column::parse`; nil when the column can't take it.
    public func parse(_ text: String) -> Cell? {
        switch kind {
        case .number, .money:
            let t = text.filter { $0 != "," && !$0.isWhitespace }
            guard t.wholeMatch(of: /[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)/) != nil, let n = Double(t) else { return nil }
            return .number(n)
        case .date:
            let t = text.trimmingCharacters(in: .whitespaces)
            return t.wholeMatch(of: /[0-9]{4}-[0-9]{2}-[0-9]{2}/) != nil ? .string(t) : nil
        case .text: return .string(text)
        default: return nil
        }
    }
}

extension Table {
    private func row(_ id: String) -> TableRow? { rows.first { $0.id == id } }
    private func head(_ id: String) -> Bool { row(id)?.group == true }
    private func column(_ id: String) -> Column? { columns.first { $0.id == id } }

    /// Whether a column's cells are typed into: `edit`, not worked out by `calc`, and a kind a text can give.
    public func editable(_ c: Column) -> Bool {
        c.edit == true && calc?[c.id] == nil && [.text, .number, .money, .date].contains(c.kind)
    }

    /// A row's name: its first column's cell as drawn, else its id.
    public func name(_ r: TableRow) -> String {
        guard let c = columns.first else { return r.id }
        let s = c.shown(r.cells[c.id], thai: false)
        return s.isEmpty ? r.id : s
    }

    /// A row with each `calc` column worked out by `expr`, in column order; a group row as it is.
    public func worked(_ r: TableRow) -> TableRow {
        guard let calc, r.group != true else { return r }
        var out = r
        for c in columns {
            guard let e = calc[c.id] else { continue }
            let state = out.cells.mapValues { v -> Lit in
                switch v {
                case .number(let n): .number(n)
                case .string(let s): .string(s)
                case .label(let l): .string(l.text)
                }
            }
            switch e.eval(state) {
            case .number(let n): out.cells[c.id] = .number(n)
            case .string(let s): out.cells[c.id] = .string(s)
            default: out.cells[c.id] = nil
            }
        }
        return out
    }

    /// The ids before the first group row, then each group row with its items.
    public func chunks(_ order: [String]) -> (prefix: [String], groups: [[String]]) {
        var prefix: [String] = []
        var out: [[String]] = []
        for id in order {
            if head(id) { out.append([id]) } else if out.isEmpty { prefix.append(id) } else { out[out.count - 1].append(id) }
        }
        return (prefix, out)
    }

    private func itemTo(_ from: [String], _ g: String, _ to: Int) -> [String]? {
        var rest = from.filter { $0 != g }
        let at = min(to, rest.count)
        if let first = rest.firstIndex(where: head), at <= first { return nil }
        rest.insert(g, at: at)
        return rest
    }

    private func groupTo(_ from: [String], _ g: String, _ to: Int) -> [String]? {
        var (prefix, all) = chunks(from)
        guard let at = all.firstIndex(where: { $0.first == g }) else { return nil }
        let it = all.remove(at: at)
        all.insert(it, at: min(to, all.count))
        prefix += all.flatMap { $0 }
        return prefix
    }

    private func rowsTo(_ from: [String], _ g: String, _ n: Int) -> [String]? {
        guard let at = from.firstIndex(of: g) else { return nil }
        let t = max(0, at + n)
        if !head(g) { return itemTo(from, g, t) }
        let (prefix, all) = chunks(from)
        var start = prefix.count
        var best = (Int.max, 0)
        for (j, c) in all.filter({ $0.first != g }).enumerated() {
            if abs(start - t) < best.0 { best = (abs(start - t), j) }
            start += c.count
        }
        if abs(start - t) < best.0 { best = (abs(start - t), max(0, all.count - 1)) }
        return groupTo(from, g, best.1)
    }

    private func nudged(_ from: [String], _ g: String, _ by: Nudge) -> [String]? {
        guard by.dir == .up || by.dir == .down else { return nil }
        let up = by.dir == .up
        let out: [String]?
        if head(g) {
            let all = chunks(from).groups
            guard let at = all.firstIndex(where: { $0.first == g }), !(up && !by.big && at == 0) else { return nil }
            out = groupTo(from, g, up ? (by.big ? 0 : at - 1) : by.big ? all.count - 1 : at + 1)
        } else {
            guard let at = from.firstIndex(of: g), !(up && !by.big && at == 0) else { return nil }
            let top = (from.firstIndex(where: head) ?? -1) + 1
            out = itemTo(from, g, up ? (by.big ? top : at - 1) : by.big ? from.count : at + 1)
        }
        return out == from ? nil : out
    }

    private func place(_ g: String, _ order: [String]) -> String {
        let title = row(g).map(name) ?? g
        let all = chunks(order).groups
        if head(g) { return "\(title), \((all.firstIndex { $0.first == g } ?? -1) + 1) of \(all.count)" }
        if let mine = all.first(where: { $0.contains(g) }), let h = mine.first.flatMap(row) {
            return "\(title), \(mine.firstIndex(of: g) ?? 0) of \(mine.count - 1) in \(name(h))"
        }
        return "\(title), \((order.firstIndex(of: g) ?? -1) + 1) of \(order.count)"
    }
}

extension Table: Rules {
    private func free(_ id: String) -> TableRow? { row(id).flatMap { $0.fixed == true ? nil : $0 } }

    /// A table's rules, as the crate's: a cell's reach is the typed text, a row's a number of rows.
    public func word(_ grab: GridGrab) -> Word? {
        switch grab {
        case .row(let id): reorder != nil && free(id) != nil ? .reorder : nil
        case .cell(let r, let c):
            edit != nil && free(r).map { $0.group != true } == true && column(c).map(editable) == true ? .edit : nil
        }
    }

    public func start(_ grab: GridGrab) -> GridChange? {
        guard word(grab) != nil else { return nil }
        switch grab {
        case .row: return .order(rows.map(\.id))
        case .cell(let r, let c): return .cell(CellEdit(row: r, column: c, value: row(r)?.cells[c] ?? .string("")))
        }
    }

    public func candidate(_ grab: GridGrab, _ reach: GridReach) -> GridChange? {
        switch (grab, start(grab), reach) {
        case (.row(let id), .order(let o)?, .rows(let n)): rowsTo(o, id, n).map(GridChange.order)
        case (.cell(let r, let c), .cell?, .text(let t)):
            column(c)?.parse(t).map { .cell(CellEdit(row: r, column: c, value: $0)) }
        default: nil
        }
    }

    public func nudge(_ grab: GridGrab, from: GridChange, by: Nudge) -> GridChange? {
        guard word(grab) != nil, case .row(let id) = grab, case .order(let o) = from else { return nil }
        return nudged(o, id, by).map(GridChange.order)
    }

    public func steps(_ grab: GridGrab) -> [(String, Nudge)] {
        guard let s = start(grab) else { return [] }
        return named.filter { nudge(grab, from: s, by: $0.1) != nil }
    }

    public func says(_ grab: GridGrab, _ change: GridChange) -> String {
        switch (grab, change) {
        case (.row(let id), .order(let o)): return place(id, o)
        case (_, .cell(let e)):
            let c = column(e.column)
            return "\(c?.label ?? e.column), \(row(e.row).map(name) ?? e.row), \(c?.shown(e.value, thai: false) ?? "")"
        default: return ""
        }
    }
}
