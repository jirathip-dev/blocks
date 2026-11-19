import Blocks
import SwiftUI

/// A table's gestures in flight: the order held, the cell typed into, the edits out, the one refused and the open sheet.
internal struct GridState: Equatable {
    internal var held: [String]?
    internal var typed: CellEdit?
    internal var out: [String: Cell] = [:]
    internal var refused: String?
    internal var sheet: String?

    internal static func key(_ row: String, _ col: String) -> String { "\(row)\n\(col)" }

    internal static func items(_ rows: [Blocks.TableRow], _ at: Int) -> [Blocks.TableRow] {
        Array(rows.dropFirst(at + 1).prefix { $0.group != true })
    }

    internal func rows(_ b: Blocks.Table) -> [Blocks.TableRow] {
        let base = held.map { ids in ids.compactMap { id in b.rows.first { $0.id == id } } } ?? b.rows
        return base.map { live(b, $0) }
    }

    internal func live(_ b: Blocks.Table, _ row: Blocks.TableRow) -> Blocks.TableRow {
        guard row.group != true else { return row }
        var r = row
        for c in b.columns { if let v = out[Self.key(r.id, c.id)] { r.cells[c.id] = v } }
        if let t = typed, t.row == r.id { r.cells[t.column] = t.value }
        return b.worked(r)
    }

    /// Whether an app's own column waits on an edit out in one of `rows`.
    internal func waits(_ b: Blocks.Table, _ c: Column, _ rows: [Blocks.TableRow]) -> Bool {
        let app = [.number, .money].contains(c.kind) && b.calc?[c.id] == nil && !b.editable(c)
        return app && rows.contains { r in b.columns.contains { out[Self.key(r.id, $0.id)] != nil } }
    }

    internal static func typed(_ grid: Binding<Self>, _ k: String, next: @escaping () -> Void) -> TypedOut {
        TypedOut(
            preview: { grid.wrappedValue.typed = $0 },
            sent: { e, ok in
                grid.wrappedValue.out[k] = ok == nil ? e.value : nil
                grid.wrappedValue.refused = ok == false ? k : nil
            },
            next: next)
    }
}

internal struct GridHandle: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let row: Blocks.TableRow
    @Binding internal var grid: GridState

    internal var body: some View {
        if let reorder = block.reorder, block.word(.row(row.id)) != nil {
            Text("≡").ui(16, .regular, look).foregroundStyle(look.palette.mute).frame(minWidth: 44, minHeight: 44)
                .accessibilityAddTraits(.isButton)
                .modifier(
                    Gestured(
                        rules: block, grab: .row(row.id), gesture: reorder, label: "Move \(block.name(row))",
                        reach: { .rows(Int(($0.height / 44).rounded())) }, value: { $0.json },
                        show: { if case .order(let o)? = $0 { grid.held = o } else { grid.held = nil } }))
        } else {
            Color.clear.frame(width: 44, height: 1)
        }
    }
}

internal struct GroupCell: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let col: Column
    internal let first: Bool
    internal let rows: [Blocks.TableRow]
    internal let at: Int
    internal let thai: Bool
    internal let grid: GridState

    internal var body: some View {
        let items = GridState.items(rows, at)
        if first, rows.indices.contains(at) {
            HStack(spacing: 6) {
                Text(block.name(rows[at])).ui(14, .semibold, look)
                Text("\(items.count)").ui(11, .regular, look).foregroundStyle(look.palette.mute)
            }
        } else if col.total != nil, col.total != .count, let t = col.total(items) {
            Text(t.value).ui(14, .semibold, look).opacity(grid.waits(block, col, items) ? 0.5 : 1)
        } else {
            Text("")
        }
    }
}

internal struct GridCell: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let row: Blocks.TableRow
    internal let col: Column
    internal let thai: Bool
    internal let cursor: FocusState<String?>.Binding
    @Binding internal var grid: GridState
    internal let next: String?

    internal var body: some View {
        let k = GridState.key(row.id, col.id)
        if block.edit != nil, block.editable(col), row.fixed != true {
            Typed(
                table: block, row: row.id, column: col, label: "\(col.label), \(block.name(row))",
                out: GridState.typed($grid, k) { cursor.wrappedValue = next.map { GridState.key($0, col.id) } },
                cursor: cursor, key: k
            )
            .ui(14, .regular, look).textFieldStyle(.plain)
            .frame(maxWidth: col.width.map { CGFloat($0) * 8 })
            .overlay(alignment: .bottom) { Rectangle().fill(look.palette.edge).frame(height: 1) }
            .overlay(alignment: .leading) { if grid.refused == k { Rectangle().fill(look.palette.red).frame(width: 3) } }
            .opacity(grid.out[k] != nil ? 0.5 : 1)
        } else if block.calc?[col.id] != nil {
            TableCell(block: block, col: col, cell: row.cells[col.id], thai: thai).accessibilityValue("worked out")
        } else {
            TableCell(block: block, col: col, cell: row.cells[col.id], thai: thai).opacity(grid.waits(block, col, [row]) ? 0.5 : 1)
        }
    }
}

internal struct TableSheet: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Table
    internal let row: Blocks.TableRow
    internal let thai: Bool
    @Binding internal var grid: GridState
    @FocusState private var cursor: String?

    internal var body: some View {
        Form {
            Section {
                ForEach(block.columns, id: \.id) { c in
                    LabeledContent([c.label, c.sign].compactMap { $0 }.joined(separator: " ")) {
                        GridCell(block: block, row: row, col: c, thai: thai, cursor: $cursor, grid: $grid, next: nil)
                    }
                }
            } header: {
                Text(block.name(row)).ui(15, .semibold, look)
            }
            if row.tap != nil { ActButton(source: Source(tap: row.tap)) { Text("open") } }
            Button("done") { grid.sheet = nil }
        }
        .accessibilityLabel("Edit \(block.name(row))")
    }
}
