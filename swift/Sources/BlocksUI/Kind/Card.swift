import Blocks
import SwiftUI

internal struct CardBlock: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    @Environment(\.card) private var context
    @Environment(\.act) private var act
    @State private var open = false
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
            if let fold = block.fold { line(fold) }
            if block.fold == nil || open { content(tint) }
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

    private func line(_ fold: Fold) -> some View {
        HStack(spacing: Scale.gap) {
            Button { open.toggle() } label: {
                Text(fold.line).ui(Scale.cell, .regular, look).foregroundStyle(look.palette.foreground).lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading).contentShape(.rect)
            }
            .buttonStyle(.plain).accessibilityValue(open ? "expanded" : "collapsed")
            if let main = fold.main, !open {
                Button {
                    let choice = main.value.map { ["choice": JSONValue.string($0)] } ?? [:]
                    act(BlockAction(action: main.action, block: main.block, values: (main.values ?? [:]).merging(choice) { $1 }))
                } label: {
                    CardButton(title: main.label, primary: true).fixedSize()
                }
                .buttonStyle(.plain).modifier(Identified(id: main.action, action: true))
            }
        }
    }

    @ViewBuilder private func content(_ tint: Color) -> some View {
        header(tint)
        if let title = block.title {
            Text(title).ui(16, .semibold, look).foregroundStyle(look.palette.foreground)
        }
        if let subtitle = block.subtitle {
            Group {
                switch subtitle {
                case .string(let text): Text(text).foregroundStyle(look.palette.mute)
                case .label(let label):
                    RelativeValue { label.text.text(at: $0, behaved.view.values) }
                        .foregroundStyle(look.palette.tone(label.tone?.rawValue) ?? look.palette.mute)
                }
            }
            .ui(13, .regular, look).lineLimit(2)
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
                if let meta {
                    RelativeValue { meta.text(at: $0, behaved.view.values) }.ui(12, .regular, look)
                        .foregroundStyle(look.palette.mute)
                }
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
