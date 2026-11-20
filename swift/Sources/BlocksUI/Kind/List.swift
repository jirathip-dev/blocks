import Blocks
import SwiftUI

internal struct ListBlock: View {
    @Environment(\.look) private var look
    @Environment(\.accessibilityReduceMotion) private var still
    @State private var held: [String]?
    internal let block: Blocks.List

    private var rows: [(key: String, row: Block)] {
        let all = block.rows.enumerated().map { (key: $1.id ?? "#\($0)", row: $1) }
        guard let held else { return all }
        return held.compactMap { id in all.first { $0.key == id } } + all.filter { !held.contains($0.key) }
    }

    private var page: Page? { if case .page(let p) = block.more { p } else { nil } }

    internal var body: some View {
        Group {
            if let tiles = look.tiles {
                VStack(spacing: tiles.seam) {
                    ForEach(rows, id: \.key) { item in
                        if case .row(let line) = item.row {
                            reorderable(RowView(row: line).surface(look), line).modifier(Reported(block: item.row))
                                .modifier(Identified(id: item.row.id))
                        } else {
                            BlockNode(block: item.row)
                        }
                    }
                    if let page { MoreRow(page: page, held: held != nil) }
                }
            } else {
                lines(rows)
            }
        }
        .animation(still ? nil : .snappy, value: held)
        .modifier(PageSaid(count: block.rows.count, paging: page != nil))
    }

    @ViewBuilder
    private func reorderable(_ view: some View, _ line: Row) -> some View {
        if let reorder = block.reorder, let id = line.id {
            view.modifier(
                Gestured(
                    rules: block, grab: id, gesture: reorder, label: "Move \(line.title)",
                    reach: { Int(($0.translation.height / 44).rounded()) }, value: { .array($0.map(JSONValue.string)) },
                    show: { held = $0 }))
        } else {
            view
        }
    }

    private func lines(_ rows: [(key: String, row: Block)]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.key) { index, item in
                if case .row(let line) = item.row {
                    reorderable(RowView(row: line), line).modifier(Reported(block: item.row))
                        .modifier(Identified(id: item.row.id))
                } else {
                    BlockNode(block: item.row)
                }
                if index < rows.count - 1 || page != nil {
                    Rectangle().fill(look.palette.line).frame(height: 0.5).padding(.leading, 12)
                }
            }
            if let page { MoreRow(page: page, held: held != nil) }
        }
        .surface(look, radius: 16)
    }
}
