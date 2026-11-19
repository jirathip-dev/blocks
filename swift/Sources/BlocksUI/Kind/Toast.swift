import Blocks
import SwiftUI

internal struct ToastBlock: View {
    @Environment(\.look) private var look
    internal let block: Toast

    internal var body: some View {
        if block.title.isEmpty {
            if let fallback = block.fallback {
                FallbackRow(fallback: fallback)
            } else {
                FallbackRow(fallback: JSONValue.object(["title": .string("Done")]))
            }
        } else {
            let (tick, glyph) = mark
            HStack(spacing: 8) {
                Text(glyph).ui(13, .bold, look).foregroundStyle(tick).frame(minWidth: 16).accessibilityHidden(true)
                Text(block.title).ui(13, .regular, look).foregroundStyle(look.palette.foreground).lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, 8).padding(.leading, 12).padding(.trailing, 8).frame(minHeight: 44)
            .background(look.palette.card)
            .overlay(alignment: .leading) { Rectangle().fill(tick).frame(width: 3) }
            .overlay(Rectangle().strokeBorder(look.palette.edge, lineWidth: 1))
            .accessibilityElement(children: .ignore).accessibilityLabel(block.title)
        }
    }

    private var mark: (Color, String) {
        let palette = look.palette
        switch block.tone?.rawValue {
        case "ok": return (palette.green, "✓")
        case "warn": return (palette.amber, "!")
        case "bad": return (palette.red, "×")
        default: return (palette.lead, "")
        }
    }
}
