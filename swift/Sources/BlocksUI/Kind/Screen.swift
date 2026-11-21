import Blocks
import SwiftUI

internal struct ScreenBlock: View {
    @Environment(\.look) private var look
    @Environment(\.refresh) private var refresh
    @Environment(\.screenTitle) private var shown
    internal let block: Screen

    internal var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                if shown { Text(block.title ?? "").ui(block.large == false ? 17 : 30, .bold, look) }
                Spacer(minLength: 4)
                ForEach(Array((block.actions ?? []).enumerated()), id: \.offset) { _, item in
                    ToolbarItemView(item: item)
                }
                if block.refresh == true, let refresh {
                    Button(action: refresh) { RoundButton(symbol: "arrow.clockwise", ascii: "r", size: 36) }
                        .buttonStyle(.plain).accessibilityLabel("Refresh")
                }
                if let done = block.done { DoneButton(done: done) }
            }
            BlockStack(blocks: block.blocks ?? [], spacing: look.tiles.map { $0.dotGap * 2 } ?? 14)
        }
        .background {
            if let tiles = look.tiles {
                DotGrid(tiles: tiles, color: look.palette.token(tiles.dot)).padding(-BlocksView.inset)
            }
        }
        .modifier(BuildsUp())
    }
}

internal struct ToolbarItemView: View {
    internal let item: Act

    private var symbol: String {
        let symbols = [
            "plus": "plus", "gear": "gearshape", "share": "square.and.arrow.up", "info": "info.circle",
            "filter": "line.3.horizontal.decrease", "more": "ellipsis",
        ]
        return symbols[item.icon ?? ""] ?? "ellipsis"
    }

    internal var body: some View {
        let icon = RoundButton(symbol: symbol, ascii: item.label, size: 36).accessibilityLabel(item.label)
        if let menu = item.menu {
            Menu {
                ForEach(Array(menu.enumerated()), id: \.offset) { _, entry in
                    ActButton(source: Source(entry)) { Text(entry.label) }
                }
            } label: {
                icon
            }
            .buttonStyle(.plain)
        } else {
            ActButton(source: Source(item)) { icon }
        }
    }
}
