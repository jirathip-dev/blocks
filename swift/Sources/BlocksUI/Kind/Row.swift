import Blocks
import SwiftUI

internal struct RowBlock: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    @State private var open: Bool?
    internal let block: Row

    private var rounds: [Round] { block.rounds ?? [] }
    private var unfolded: Bool { !rounds.isEmpty && (open ?? (rounds.last?.state == .needs)) }

    internal var body: some View {
        Group {
            if !rounds.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    Button {
                        open = !unfolded
                    } label: {
                        line
                    }
                    .buttonStyle(.plain)
                    if unfolded { RoundsView(rounds: rounds) }
                }
            } else if block.tap == nil {
                line
            } else {
                let confirm = Confirmation(nil, label: nil, destructive: block.style?.rawValue == "destructive")
                ActButton(source: Source(tap: block.tap, confirm: confirm)) { line }
            }
        }
        .modifier(BlockActs(menu: block.menu ?? [], swipe: block.swipe ?? []))
    }

    private var line: some View {
        let palette = look.palette
        let subtitle: (text: Shown, tone: Tone?)? =
            switch unfolded ? nil : block.subtitle {
            case .string(let text): (.string(text), nil)
            case .label(let label): (label.text, label.tone)
            case nil: nil
            }
        let style = block.style?.rawValue
        return HStack(spacing: 10) {
            if let figure = block.figure { Figure(figure: figure) }
            VStack(alignment: .leading, spacing: 2) {
                if let title = block.title {
                    Text(title).ui(15, .medium, look).lineLimit(1)
                    .foregroundStyle(
                        style == "destructive" ? palette.red : style == "link" ? palette.link : palette.foreground)
                }
                if let subtitle {
                    RelativeValue { subtitle.text.text(at: $0, behaved.view.values) }.ui(12, .regular, look).foregroundStyle(
                        palette.tone(subtitle.tone?.rawValue) ?? palette.mute
                    ).lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            if let badge = block.badge { Pill(badge: badge) }
            if let value = block.value {
                RelativeValue { value.text(at: $0, behaved.view.values) }.ui(13, .regular, look).foregroundStyle(palette.mute)
            }
            if let button = block.button { RowButton(button: button) }
            trailing
        }
        .padding(.leading, CGFloat(block.indent ?? 0) * 18).padding(.horizontal, 12).frame(minHeight: 44)
        .contentShape(.rect)
        .overlay(alignment: .leading) {
            if block.changed == true {
                RoundedRectangle(cornerRadius: look.radius(2)).fill(palette.lead).frame(width: 3).padding(.vertical, 10)
            }
        }
        .modifier(Lifted(lifted: block.lifted == true))
    }

    @ViewBuilder private var trailing: some View {
        if block.handle == true {
            Image(systemName: "line.3.horizontal").font(.system(size: 15, weight: .semibold))
                .foregroundStyle(look.palette.mute).accessibilityLabel("Reorder")
        } else if !rounds.isEmpty || (block.tap != nil && block.accessory != Accessory.none) {
            Image(systemName: unfolded ? "chevron.down" : "chevron.right").font(.system(size: 11, weight: .bold))
                .foregroundStyle(look.palette.mute)
        }
    }
}

internal struct Figure: View {
    @Environment(\.look) private var look
    @Environment(\.appBlocks) private var appBlocks
    internal let figure: Blocks.Figure

    internal var body: some View {
        let palette = look.palette
        if let draw = appBlocks?.figure, let json = try? JSONValue(figure) {
            draw(json)
        } else if let icon = figure.icon {
            Image(systemName: icon).font(.system(size: 14, weight: .semibold)).foregroundStyle(palette.link).frame(
                width: 28)
        } else if let avatar = figure.avatar {
            Text(avatar.prefix(2).uppercased()).ui(12, .bold, look).frame(width: 28, height: 28)
                .background(palette.edge.opacity(0.5), in: .circle)
        } else {
            Circle().fill(palette.tone(figure.state?.rawValue) ?? palette.mute).frame(width: 10, height: 10).frame(
                width: 28)
        }
    }
}

internal struct RowButton: View {
    @Environment(\.look) private var look
    internal let button: Act

    internal var body: some View {
        let tint = look.palette.tone(button.tone?.rawValue) ?? look.palette.link
        ActButton(source: Source(button)) {
            Text(button.label).ui(13, .semibold, look).foregroundStyle(look.solid ? look.palette.background : tint)
                .padding(.horizontal, 12).frame(minHeight: 30)
                .background(look.outline ? Color.clear : tint.opacity(look.solid ? 1 : 0.16), in: look.pill)
        }
    }
}

internal struct Lifted: ViewModifier {
    @Environment(\.look) private var look
    internal let lifted: Bool

    @ViewBuilder
    internal func body(content: Content) -> some View {
        if lifted {
            content.background(look.palette.background, in: .rect(cornerRadius: look.radius(12)))
                .shadow(color: .black.opacity(0.4), radius: 12, y: 8).scaleEffect(1.02).offset(y: -6).zIndex(1)
        } else {
            content
        }
    }
}
