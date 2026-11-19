import Blocks
import Foundation
import SwiftUI

extension Column {
    internal var end: Bool { align.map { $0 == .end } ?? numeric }
    internal var sign: String? {
        kind == .money ? currency.map { ["THB": "฿", "USD": "$", "EUR": "€"][$0] ?? $0 } : unit
    }

    /// A cell as drawn text, a label's time as of now; `thai` writes a Buddhist-Era date's month in Thai.
    internal func shown(_ c: Cell?, thai: Bool) -> String { shown(c, thai: thai) { $0.text(at: Date(), [:]) } }

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
        let by = { (run: [Blocks.TableRow]) in
            run.enumerated().sorted { x, y in
                switch (x.element.cells[c.id], y.element.cells[c.id]) {
                case (let a?, let b?):
                    let (p, q) = s.desc ? (b, a) : (a, b)
                    return c.before(p, q) || (!c.before(q, p) && x.offset < y.offset)
                case (nil, nil): return x.offset < y.offset
                case (_, let b): return b == nil
                }
            }.map(\.element)
        }
        var out: [Blocks.TableRow] = []
        var run: [Blocks.TableRow] = []
        for r in rows {
            if r.group == true { out += by(run) + [r]; run = [] } else { run.append(r) }
        }
        return out + by(run)
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
    @State private var grid = GridState()

    internal init(block: Blocks.Table) {
        self.block = block
        _sort = State(initialValue: block.sort.map { TableOrder(by: $0.by, desc: $0.dir == .desc) })
        _hidden = State(initialValue: Set(block.columns.filter { $0.hide == true }.map(\.id)))
    }

    private var thai: Bool { locale.language.languageCode == .thai }
    private var cols: [Column] { block.columns.enumerated().filter { $0.offset == 0 || !hidden.contains($0.element.id) }.map(\.element) }
    private var kept: [Blocks.TableRow] {
        let words = q.lowercased().split(whereSeparator: \.isWhitespace).map(String.init)
        let hit = { (r: Blocks.TableRow) in
            words.allSatisfy { w in cols.contains { $0.shown(r.cells[$0.id], thai: thai).lowercased().contains(w) } }
        }
        let all = grid.rows(block)
        return all.enumerated().filter { i, r in r.group == true ? GridState.items(all, i).contains(where: hit) : hit(r) }.map(\.element)
    }
    private var ticks: [String] { kept.map(\.id).filter(ticked.contains) }

    internal var body: some View {
        let rows = block.sorted(kept, by: sort)
        let items = rows.filter { $0.group != true }
        VStack(alignment: .leading, spacing: 0) {
            TableBar(block: block, cols: cols, shown: items.count, sort: $sort, q: $q, hidden: $hidden, ticked: $ticked, ticks: ticks, send: send)
            Rectangle().fill(look.palette.line).frame(height: 1)
            if items.isEmpty {
                Text(block.rows.isEmpty ? block.empty ?? "No rows yet." : "No rows match “\(q)”.")
                    .ui(14, .regular, look).foregroundStyle(look.palette.mute).padding(12)
            } else {
                let handles = block.reorder != nil && sort == nil && q.isEmpty
                ViewThatFits(in: .horizontal) {
                    TableGrid(block: block, cols: cols, rows: rows, thai: thai, handles: handles, sort: $sort, ticked: $ticked, grid: $grid).frame(minWidth: 600)
                    TablePhone(block: block, cols: cols, rows: rows, thai: thai, handles: handles, ticked: $ticked, grid: $grid)
                }
            }
        }
        .surface(look, radius: 0)
        .onChange(of: q) { ticked.formIntersection(kept.map(\.id)) }
        .onChange(of: block.rows) { grid.refused = nil }
        .sheet(isPresented: Binding { grid.sheet != nil } set: { if !$0 { grid.sheet = nil } }) {
            if let r = rows.first(where: { $0.id == grid.sheet }) { TableSheet(block: block, row: r, thai: thai, grid: $grid) }
        }
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
        let n = block.rows.filter { $0.group != true }.count
        HStack(spacing: 10) {
            if ticks.isEmpty {
                Text(block.title ?? "").ui(15, .bold, look)
                Text(q.isEmpty ? "\(n) row\(n == 1 ? "" : "s")" : "\(shown) of \(n) rows").ui(12, .regular, look).foregroundStyle(look.palette.mute)
                if block.reorder != nil, sort != nil || !q.isEmpty {
                    Text("\(sort != nil ? "sorted" : "filtered"), so rows stay put").ui(12, .regular, look).foregroundStyle(look.palette.mute)
                    Button("as sent") { (sort, q) = (nil, "") }
                }
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
        if block.filter != false { TextField("filter", text: $q).textFieldStyle(.roundedBorder).frame(maxWidth: 240) }
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
    internal let handles: Bool
    @Binding internal var sort: TableOrder?
    @Binding internal var ticked: Set<String>
    @Binding internal var grid: GridState
    @FocusState private var cursor: String?

    private var items: [Blocks.TableRow] { rows.filter { $0.group != true } }

    internal var body: some View {
        Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
            GridRow {
                if handles { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) }
                if block.select != nil {
                    TableTick(on: items.allSatisfy { ticked.contains($0.id) }, label: "Select all shown rows") {
                        if items.allSatisfy({ ticked.contains($0.id) }) { ticked = [] } else { ticked = Set(items.map(\.id)) }
                    }
                }
                ForEach(cols, id: \.id) { c in header(c).gridColumnAlignment(c.end ? .trailing : .leading) }
            }
            ForEach(Array(rows.enumerated()), id: \.element.id) { i, r in
                GridRow {
                    if handles { GridHandle(block: block, row: r, grid: $grid) }
                    if block.select != nil {
                        if r.group == true { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) } else {
                            TableTick(on: ticked.contains(r.id), label: "Select \(r.id)") { flip(r.id) }
                        }
                    }
                    ForEach(Array(cols.enumerated()), id: \.element.id) { j, c in
                        if r.group == true {
                            GroupCell(block: block, col: c, first: j == 0, rows: rows, at: i, thai: thai, grid: grid)
                        } else if j == 0, r.tap != nil, block.edit == nil {
                            ActButton(source: Source(tap: r.tap)) { TableCell(block: block, col: c, cell: r.cells[c.id], thai: thai) }
                        } else {
                            GridCell(block: block, row: r, col: c, thai: thai, cursor: $cursor, grid: $grid, next: next(r))
                        }
                    }
                }
                .fontWeight(r.group == true ? .semibold : nil)
            }
            if cols.contains(where: { $0.total != nil }) {
                GridRow {
                    if handles { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) }
                    if block.select != nil { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) }
                    ForEach(Array(cols.enumerated()), id: \.element.id) { i, c in
                        let t = c.total(items)
                        Text(i == 0 ? "Total" : [t?.word, t?.value].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " "))
                            .ui(14, .semibold, look).opacity(grid.waits(block, c, items) ? 0.5 : 1)
                    }
                }
            }
        }
        .padding(12)
    }

    private func next(_ r: Blocks.TableRow) -> String? {
        items.firstIndex { $0.id == r.id }.flatMap { items.indices.contains($0 + 1) ? items[$0 + 1].id : nil }
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
    internal let handles: Bool
    @Binding internal var ticked: Set<String>
    @Binding internal var grid: GridState

    internal var body: some View {
        let roles = Blocks.Table.roles(cols)
        let part = { (p: PhonePart) in cols.indices.filter { roles[$0] == p }.map { cols[$0] } }
        let items = rows.filter { $0.group != true }
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { i, r in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if handles { GridHandle(block: block, row: r, grid: $grid) }
                    if block.select != nil, r.group != true {
                        TableTick(on: ticked.contains(r.id), label: "Select \(r.id)") {
                            if ticked.contains(r.id) { ticked.remove(r.id) } else { ticked.insert(r.id) }
                        }
                    }
                    if r.group == true {
                        Text(block.name(r)).ui(15, .semibold, look)
                        Spacer(minLength: 4)
                        if let c = part(.value).first { GroupCell(block: block, col: c, first: false, rows: rows, at: i, thai: thai, grid: grid) }
                    } else if block.edit != nil {
                        Button { grid.sheet = r.id } label: { line(r, part, more: true) }.buttonStyle(.plain)
                            .accessibilityLabel("Edit \(block.name(r))")
                    } else {
                        ActButton(source: Source(tap: r.tap)) { line(r, part, more: r.tap != nil) }
                    }
                }
                .padding(12)
                .background(r.group == true ? look.palette.background : .clear)
                Rectangle().fill(look.palette.line).frame(height: 1)
            }
            if let c = part(.value).first, let t = c.total(items) {
                HStack {
                    Text("Total").ui(15, .semibold, look)
                    Spacer()
                    Text(t.value).ui(15, .semibold, look).opacity(grid.waits(block, c, items) ? 0.5 : 1)
                }
                .padding(12)
            }
        }
    }

    private func line(_ r: Blocks.TableRow, _ part: (PhonePart) -> [Column], more: Bool) -> some View {
        let meta = part(.meta).filter { r.cells[$0.id] != nil }
            .map { "\($0.label) \($0.shown(r.cells[$0.id], thai: thai))" }.joined(separator: " · ")
        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text(part(.title).first.map { $0.shown(r.cells[$0.id], thai: thai) } ?? r.id).ui(16, .regular, look)
                Spacer(minLength: 4)
                ForEach(part(.tag) + part(.value), id: \.id) { c in
                    TableCell(block: block, col: c, cell: r.cells[c.id], thai: thai).opacity(grid.waits(block, c, [r]) ? 0.5 : 1)
                }
                if more { Text("›").ui(16, .bold, look).foregroundStyle(look.palette.mute) }
            }
            if !meta.isEmpty { Text(meta).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
        }
        .foregroundStyle(look.palette.foreground)
    }
}
