import Blocks
import SwiftUI

internal struct CardBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    internal let block: Card

    private struct Kind {
        fileprivate let label: String
        fileprivate let symbol: String
        fileprivate let tint: Color
    }

    private var kind: Kind? {
        let palette = look.palette
        let poster =
            if case .plugin(let name) = context.poster { " · \(name)" } else { "" }
        switch block.kind?.rawValue {
        case "ask": return Kind(label: "ask\(poster)", symbol: "hand.raised.fill", tint: palette.red)
        case "config": return Kind(label: "config\(poster)", symbol: "slider.horizontal.3", tint: palette.cyan)
        case "proposal":
            return Kind(label: "config proposal\(poster)", symbol: "slider.horizontal.3", tint: palette.cyan)
        case "secret": return Kind(label: "secret\(poster)", symbol: "key.fill", tint: palette.amber)
        case "run": return Kind(label: "run card\(poster)", symbol: "terminal.fill", tint: palette.lead)
        case "confirm": return Kind(label: "confirm\(poster)", symbol: "checkmark.shield.fill", tint: palette.red)
        case "permissions":
            return Kind(label: "permissions\(poster)", symbol: "lock.shield.fill", tint: palette.purple)
        default: return nil
        }
    }

    internal var body: some View {
        if CardTrust.draws(block.kind?.rawValue, from: context.poster) {
            card
        } else {
            MissingPoster(kind: block.kind?.rawValue ?? "")
        }
    }

    @ViewBuilder private var card: some View {
        let tint = kind?.tint ?? look.palette.tone(block.tone?.rawValue) ?? look.palette.lead
        VStack(alignment: .leading, spacing: 10) {
            header(tint)
            if let title = block.title {
                Text(title).ui(16, .semibold, look).foregroundStyle(look.palette.foreground)
            }
            if let subtitle = block.subtitle {
                Text(subtitle).ui(13, .regular, look).foregroundStyle(look.palette.mute).lineLimit(2)
            }
            if let buttons = block.buttons, !buttons.isEmpty {
                HStack(spacing: 8) {
                    ForEach(Array(buttons.enumerated()), id: \.offset) { _, button in
                        BlockNode(block: button)
                    }
                }
            }
            BlockStack(blocks: block.blocks ?? []).environment(
                \.card, CardContext(poster: context.poster, tint: tint))
        }
        .padding(14)
        .surface(look, radius: 20)
        .overlay(alignment: .leading) {
            if look.glass {
                RoundedRectangle(cornerRadius: look.radius(2)).fill(tint).frame(width: 3).padding(.vertical, 16)
            }
        }
        .modifier(BlockActs(menu: block.menu ?? []))
    }

    @ViewBuilder
    private func header(_ tint: Color) -> some View {
        let meta = block.meta
        let badge = block.badge
        if kind != nil || meta != nil || badge != nil {
            HStack(spacing: 6) {
                if let kind {
                    if !look.textMarks { Image(systemName: kind.symbol).font(.system(size: 12, weight: .bold)) }
                    Text(look.label(.kind, kind.label)).ui(11, .bold, look)
                }
                Spacer(minLength: 4)
                if let badge { Pill(badge: badge) }
                if let meta { Text(meta).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
            }
            .foregroundStyle(tint)
        }
    }
}

internal struct MissingPoster: View {
    @Environment(\.look) private var look
    internal let kind: String

    internal var body: some View {
        let label = "\(kind) · source unknown · not drawn"
        Label(look.label(.kind, label), systemImage: "exclamationmark.octagon.fill")
            .labelStyle(.titleAndIcon).ui(11, .bold, look).foregroundStyle(look.palette.red)
            .frame(maxWidth: .infinity, alignment: .leading).padding(14).surface(look, radius: 20)
    }
}
