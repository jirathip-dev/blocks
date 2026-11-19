import Blocks
import SwiftUI

internal struct ListBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.List

    internal var body: some View {
        let rows = block.rows
        if let tiles = look.tiles {
            VStack(spacing: tiles.seam) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    if case .row(let line) = row {
                        RowView(row: line).surface(look).modifier(Reordering(list: block, row: line))
                            .modifier(Reported(block: row)).modifier(Identified(id: row.id))
                    } else {
                        BlockNode(block: row)
                    }
                }
            }
        } else {
            lines(rows)
        }
    }

    private func lines(_ rows: [Block]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                if case .row(let line) = row {
                    RowView(row: line).modifier(Reordering(list: block, row: line)).modifier(Reported(block: row)).modifier(Identified(id: row.id))
                } else {
                    BlockNode(block: row)
                }
                if index < rows.count - 1 {
                    Rectangle().fill(look.palette.line).frame(height: 0.5).padding(.leading, 12)
                }
            }
        }
        .surface(look, radius: 16)
    }
}
