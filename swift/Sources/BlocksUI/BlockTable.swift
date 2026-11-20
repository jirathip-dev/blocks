import Blocks
import Foundation
import SwiftUI

extension Column {
    private static let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    private static let thai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

    internal var numeric: Bool { [.number, .money, .bar].contains(kind) }
    internal var end: Bool { align.map { $0 == .end } ?? numeric }
    internal var sign: String? {
        kind == .money ? currency.map { ["THB": "฿", "USD": "$", "EUR": "€"][$0] ?? $0 } : unit
    }

    internal static func grouped(_ v: Double, _ digits: Int, fixed: Bool) -> String {
        let f = NumberFormatter()
        f.locale = Locale(identifier: "en_US")
        f.numberStyle = .decimal
        f.minimumFractionDigits = fixed ? digits : 0
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: v)) ?? ""
    }

    internal func number(_ v: Double) -> String {
        kind == .money ? Self.grouped(v, 2, fixed: true) : Self.grouped(v, Int(digits ?? 2), fixed: false)
    }

    /// A cell as drawn text; `thai` writes a Buddhist-Era date's month in Thai.
    internal func shown(_ c: Cell?, thai: Bool) -> String {
        switch c {
        case nil: ""
        case .label(let l): l.text.text(at: Date(), [:])
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

    internal func before(_ a: Cell, _ b: Cell) -> Bool {
        if numeric, case .number(let x) = a, case .number(let y) = b { return x < y }
        let key = { (c: Cell) in
            if kind == .date, case .string(let s) = c { s } else { shown(c, thai: false).lowercased() }
        }
        return key(a) < key(b)
    }

    internal func total(_ rows: [Blocks.TableRow]) -> (word: String, value: String)? {
        guard let total else { return nil }
        let cells = rows.compactMap { $0.cells[id] }
        let vs = cells.compactMap { if case .number(let n) = $0 { n } else { nil } }
        let sum = vs.reduce(0, +)
        if total == .count { return ("count", "\(cells.count)") }
        if vs.isEmpty { return ("", "—") }
        if total == .avg { return ("avg", Self.grouped(sum / Double(vs.count), 1, fixed: false)) }
        return ("", number(sum))
    }
}

extension Blocks.Table {
    /// Each column's part of a phone row: its `phone`, else a first text title, tone tag, (totalled) number value.
    internal static func roles(_ cols: [Column]) -> [PhonePart] {
        var r = cols.map(\.phone)
        func claim(_ part: PhonePart, _ ok: (Column) -> Bool, last: Bool = false) {
            let free = cols.indices.filter { r[$0] == nil && ok(cols[$0]) }
            let i = last ? free.last(where: { cols[$0].total != nil }) ?? free.last : free.first
            guard !r.contains(part), let i else { return }
            r[i] = part
        }
        claim(.title) { $0.kind == .text }
        claim(.tag) { $0.kind == .tone }
        claim(.value, { [.number, .money].contains($0.kind) }, last: true)
        return r.map { $0 ?? .meta }
    }

    internal func sorted(_ rows: [Blocks.TableRow], by s: TableOrder?) -> [Blocks.TableRow] {
        guard let s, let c = columns.first(where: { $0.id == s.by }) else { return rows }
        return rows.enumerated().sorted { x, y in
            switch (x.element.cells[c.id], y.element.cells[c.id]) {
            case (let a?, let b?):
                let (p, q) = s.desc ? (b, a) : (a, b)
                return c.before(p, q) || (!c.before(q, p) && x.offset < y.offset)
            case (nil, nil): return x.offset < y.offset
            case (_, let b): return b == nil
            }
        }.map(\.element)
    }

    internal func barMax(_ c: Column) -> Double {
        c.max ?? rows.compactMap { if case .number(let n) = $0.cells[c.id] { n } else { nil } }.reduce(1, Swift.max)
    }
}

/// A table's order on screen: one column, up or down.
internal struct TableOrder: Equatable {
    internal let by: String
    internal let desc: Bool
}

internal struct TableBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @Environment(\.locale) private var locale
    internal let block: Blocks.Table
    @State private var sort: TableOrder?
    @State private var q = ""
    @State private var hidden: Set<String>
    @State private var ticked: Set<String> = []

    internal init(block: Blocks.Table) {
        self.block = block
        _sort = State(initialValue: block.sort.map { TableOrder(by: $0.by, desc: $0.dir == .desc) })
        _hidden = State(initialValue: Set(block.columns.filter { $0.hide == true }.map(\.id)))
    }

    private var thai: Bool { locale.language.languageCode == .thai }
    private var cols: [Column] { block.columns.enumerated().filter { $0.offset == 0 || !hidden.contains($0.element.id) }.map(\.element) }
    private var kept: [Blocks.TableRow] {
        let words = q.lowercased().split(whereSeparator: \.isWhitespace).map(String.init)
        return block.rows.filter { r in
            words.allSatisfy { w in cols.contains { $0.shown(r.cells[$0.id], thai: thai).lowercased().contains(w) } }
        }
    }
    private var ticks: [String] { kept.map(\.id).filter(ticked.contains) }

    internal var body: some View {
        let rows = block.sorted(kept, by: sort)
        VStack(alignment: .leading, spacing: 0) {
            TableBar(block: block, cols: cols, shown: rows.count, sort: $sort, q: $q, hidden: $hidden, ticked: $ticked, ticks: ticks, send: send)
            Rectangle().fill(look.palette.line).frame(height: 1)
            if rows.isEmpty {
                Text(block.rows.isEmpty ? block.empty ?? "No rows yet." : "No rows match “\(q)”.")
                    .ui(14, .regular, look).foregroundStyle(look.palette.mute).padding(12)
            } else {
                ViewThatFits(in: .horizontal) {
                    TableGrid(block: block, cols: cols, rows: rows, thai: thai, sort: $sort, ticked: $ticked).frame(minWidth: 600)
                    TablePhone(block: block, cols: cols, rows: rows, thai: thai, ticked: $ticked)
                }
            }
        }
        .surface(look, radius: 0)
        .onChange(of: q) { ticked.formIntersection(kept.map(\.id)) }
    }

    private func send(_ action: String, _ values: [String: JSONValue]) {
        act(BlockAction(action: action, values: values))
    }
}

internal struct TableBar: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let cols: [Column]
    internal let shown: Int
    @Binding internal var sort: TableOrder?
    @Binding internal var q: String
    @Binding internal var hidden: Set<String>
    @Binding internal var ticked: Set<String>
    internal let ticks: [String]
    internal let send: (String, [String: JSONValue]) -> Void

    internal var body: some View {
        let n = block.rows.count
        HStack(spacing: 10) {
            if ticks.isEmpty {
                Text(block.title ?? "").ui(15, .bold, look)
                Text(q.isEmpty ? "\(n) row\(n == 1 ? "" : "s")" : "\(shown) of \(n) rows").ui(12, .regular, look).foregroundStyle(look.palette.mute)
                Spacer(minLength: 4)
                if n > 0 { controls }
            } else {
                Text("\(ticks.count) selected").ui(15, .bold, look)
                ForEach(block.select?.actions ?? [], id: \.action) { a in
                    Button(a.label) { send(a.action, ["rows": .array(ticks.map(JSONValue.string))]) }
                        .foregroundStyle(a.bad == true ? look.palette.red : look.palette.foreground)
                }
                Spacer(minLength: 4)
            }
            exporter
            if !ticks.isEmpty { Button("clear") { ticked = [] } }
        }
        .buttonStyle(.plain).ui(13, .regular, look).padding(12)
    }

    @ViewBuilder private var controls: some View {
        if block.filter != false { SwiftUI.TextField("filter", text: $q).textFieldStyle(.roundedBorder).frame(maxWidth: 240) }
        Menu("sort") {
            Button("as sent") { sort = nil }
            ForEach(cols.filter { $0.sort != false }, id: \.id) { c in
                Button("\(c.label) ↑") { sort = TableOrder(by: c.id, desc: false) }
                Button("\(c.label) ↓") { sort = TableOrder(by: c.id, desc: true) }
            }
        }
        .fixedSize()
        if block.columns.count > 2 {
            Menu(hidden.isEmpty ? "columns" : "columns · \(hidden.count) hidden") {
                ForEach(block.columns.dropFirst(), id: \.id) { c in
                    Toggle(c.label, isOn: Binding { !hidden.contains(c.id) } set: { on in
                        if on { hidden.remove(c.id) } else { hidden.insert(c.id) }
                    })
                }
            }
            .fixedSize()
        }
    }

    @ViewBuilder private var exporter: some View {
        let formats = block.rows.isEmpty ? [] : block.export ?? []
        let names = ["csv": "CSV", "xlsx": "Excel"]
        let go = { (f: ExportFormat) in
            let sorted: JSONValue = sort.map { .object(["by": .string($0.by), "dir": .string($0.desc ? "desc" : "asc")]) } ?? .null
            send("export", ["format": .string(f.rawValue), "columns": .array(cols.map { .string($0.id) }), "sort": sorted, "q": .string(q), "rows": .array(ticks.map(JSONValue.string))])
        }
        if formats.count == 1, let f = formats.first {
            Button("export \((names[f.rawValue] ?? f.rawValue).lowercased())") { go(f) }
        } else if !formats.isEmpty {
            Menu("export") { ForEach(formats, id: \.rawValue) { f in Button(names[f.rawValue] ?? f.rawValue) { go(f) } } }.fixedSize()
        }
    }
}

internal struct TableCell: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let col: Column
    internal let cell: Cell?
    internal let thai: Bool

    internal var body: some View {
        let text = col.shown(cell, thai: thai)
        HStack(spacing: 6) {
            if case .label(let l) = cell {
                Text(text).ui(11, .regular, look).padding(.horizontal, 4)
                    .foregroundStyle(look.palette.tone(l.tone?.rawValue) ?? look.palette.mute)
                    .overlay(Rectangle().stroke(look.palette.tone(l.tone?.rawValue) ?? look.palette.mute, lineWidth: 1))
            } else {
                if col.kind == .bar, case .number(let n) = cell {
                    let fill = Swift.min(1, Swift.max(0, n / block.barMax(col)))
                    Rectangle().fill(look.palette.line).frame(width: 48, height: 6)
                        .overlay(alignment: .leading) { Rectangle().fill(look.palette.tone(col.tone?.rawValue) ?? look.palette.link).frame(width: 48 * fill) }
                }
                Text(text).ui(14, .regular, look).lineLimit(1).truncationMode(.tail)
                    .frame(maxWidth: col.width.map { CGFloat($0) * 8 }, alignment: col.end ? .trailing : .leading)
            }
        }
    }
}

internal struct TableTick: View {
    @Environment(\.look) private var look
    internal let on: Bool
    internal let label: String
    internal let flip: () -> Void

    internal var body: some View {
        Button(action: flip) { Image(systemName: on ? "checkmark.square.fill" : "square") }
            .buttonStyle(.plain).foregroundStyle(look.palette.mute).accessibilityLabel(label)
    }
}

internal struct TableGrid: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let cols: [Column]
    internal let rows: [Blocks.TableRow]
    internal let thai: Bool
    @Binding internal var sort: TableOrder?
    @Binding internal var ticked: Set<String>

    internal var body: some View {
        Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
            GridRow {
                if block.select != nil {
                    TableTick(on: rows.allSatisfy { ticked.contains($0.id) }, label: "Select all shown rows") {
                        if rows.allSatisfy({ ticked.contains($0.id) }) { ticked = [] } else { ticked = Set(rows.map(\.id)) }
                    }
                }
                ForEach(cols, id: \.id) { c in header(c).gridColumnAlignment(c.end ? .trailing : .leading) }
            }
            ForEach(rows, id: \.id) { r in
                GridRow {
                    if block.select != nil { TableTick(on: ticked.contains(r.id), label: "Select \(r.id)") { flip(r.id) } }
                    ForEach(Array(cols.enumerated()), id: \.element.id) { i, c in
                        if i == 0, r.tap != nil {
                            ActButton(source: Source(tap: r.tap)) { TableCell(block: block, col: c, cell: r.cells[c.id], thai: thai) }
                        } else {
                            TableCell(block: block, col: c, cell: r.cells[c.id], thai: thai)
                        }
                    }
                }
            }
            if cols.contains(where: { $0.total != nil }) {
                GridRow {
                    if block.select != nil { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) }
                    ForEach(Array(cols.enumerated()), id: \.element.id) { i, c in
                        let t = c.total(rows)
                        Text(i == 0 ? "Total" : [t?.word, t?.value].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " "))
                            .ui(14, .semibold, look)
                    }
                }
            }
        }
        .padding(12)
    }

    private func flip(_ id: String) {
        if ticked.contains(id) { ticked.remove(id) } else { ticked.insert(id) }
    }

    private func header(_ c: Column) -> some View {
        let on = sort?.by == c.id ? sort?.desc : nil
        let label = [c.label, c.sign, on.map { $0 ? "↓" : "↑" }].compactMap { $0 }.joined(separator: " ")
        return Button {
            sort = on == true ? nil : TableOrder(by: c.id, desc: on == false)
        } label: {
            Text(label).ui(12, on == nil ? .regular : .semibold, look)
                .foregroundStyle(on == nil ? look.palette.mute : look.palette.foreground)
        }
        .buttonStyle(.plain).disabled(c.sort == false)
    }
}

internal struct TablePhone: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let cols: [Column]
    internal let rows: [Blocks.TableRow]
    internal let thai: Bool
    @Binding internal var ticked: Set<String>

    internal var body: some View {
        let roles = Blocks.Table.roles(cols)
        let part = { (p: PhonePart) in cols.indices.filter { roles[$0] == p }.map { cols[$0] } }
        VStack(alignment: .leading, spacing: 0) {
            ForEach(rows, id: \.id) { r in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if block.select != nil {
                        TableTick(on: ticked.contains(r.id), label: "Select \(r.id)") {
                            if ticked.contains(r.id) { ticked.remove(r.id) } else { ticked.insert(r.id) }
                        }
                    }
                    ActButton(source: Source(tap: r.tap)) { line(r, part) }
                }
                .padding(12)
                Rectangle().fill(look.palette.line).frame(height: 1)
            }
            if let c = part(.value).first, let t = c.total(rows) {
                HStack {
                    Text("Total").ui(15, .semibold, look)
                    Spacer()
                    Text(t.value).ui(15, .semibold, look)
                }
                .padding(12)
            }
        }
    }

    private func line(_ r: Blocks.TableRow, _ part: (PhonePart) -> [Column]) -> some View {
        let meta = part(.meta).filter { r.cells[$0.id] != nil }
            .map { "\($0.label) \($0.shown(r.cells[$0.id], thai: thai))" }.joined(separator: " · ")
        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text(part(.title).first.map { $0.shown(r.cells[$0.id], thai: thai) } ?? r.id).ui(16, .regular, look)
                Spacer(minLength: 4)
                ForEach(part(.tag) + part(.value), id: \.id) { c in TableCell(block: block, col: c, cell: r.cells[c.id], thai: thai) }
                if r.tap != nil { Text("›").ui(16, .bold, look).foregroundStyle(look.palette.mute) }
            }
            if !meta.isEmpty { Text(meta).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
        }
        .foregroundStyle(look.palette.foreground)
    }
}
