import Blocks
import SwiftUI

internal struct RowView: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    @State private var open: Bool?
    internal let row: Row

    private var rounds: [Round] { row.rounds ?? [] }
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
            } else if row.tap == nil {
                line
            } else {
                let confirm = Confirmation(nil, label: nil, destructive: row.style?.rawValue == "destructive")
                ActButton(source: Source(tap: row.tap, confirm: confirm)) { line }
            }
        }
        .modifier(BlockActs(menu: row.menu ?? [], swipe: row.swipe ?? []))
    }

    private var line: some View {
        let palette = look.palette
        let subtitle: (text: String, tone: Tone?)? =
            switch unfolded ? nil : row.subtitle {
            case .string(let text): (text, nil)
            case .label(let label): (label.text, label.tone)
            case nil: nil
            }
        let style = row.style?.rawValue
        return HStack(spacing: 10) {
            if let figure = row.figure { Figure(figure: figure, title: row.title) }
            VStack(alignment: .leading, spacing: 2) {
                Text(row.title).ui(15, .medium, look).lineLimit(1)
                    .foregroundStyle(
                        style == "destructive" ? palette.red : style == "link" ? palette.link : palette.foreground)
                if let subtitle {
                    Text(subtitle.text).ui(12, .regular, look).foregroundStyle(
                        palette.tone(subtitle.tone?.rawValue) ?? palette.mute
                    ).lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            if let badge = row.badge { Pill(badge: badge) }
            if let value = row.value {
                RelativeValue { value.text(at: $0, behaved.view.values) }.ui(13, .regular, look).foregroundStyle(palette.mute)
            }
            if let button = row.button { RowButton(button: button) }
            trailing
        }
        .padding(.leading, CGFloat(row.indent ?? 0) * 18).padding(.horizontal, 12).frame(minHeight: 44)
        .contentShape(.rect)
        .overlay(alignment: .leading) {
            if row.changed == true {
                RoundedRectangle(cornerRadius: look.radius(2)).fill(palette.lead).frame(width: 3).padding(.vertical, 10)
            }
        }
        .modifier(Lifted(lifted: row.lifted == true))
    }

    @ViewBuilder private var trailing: some View {
        if row.handle == true {
            Image(systemName: "line.3.horizontal").font(.system(size: 15, weight: .semibold))
                .foregroundStyle(look.palette.mute).accessibilityLabel("Reorder")
        } else if !rounds.isEmpty || (row.tap != nil && row.accessory != Accessory.none) {
            Image(systemName: unfolded ? "chevron.down" : "chevron.right").font(.system(size: 11, weight: .bold))
                .foregroundStyle(look.palette.mute)
        }
    }
}

internal struct RelativeValue: View {
    internal let text: (Date) -> String

    internal var body: some View {
        TimelineView(.everyMinute) { context in Text(text(context.date)) }
    }
}

extension Shown {
    internal func text(at now: Date, _ values: [String: String]) -> String {
        switch self {
        case .string(let string): string
        case .number(let number): number.formatted()
        case .bound(let bound): values[bound.get] ?? ""
        case .time(let time): Relative.text(since: time.since, until: time.until, at: now)
        }
    }
}

extension Relative {
    internal static func text(since: String?, until: String? = nil, at now: Date) -> String {
        if let since = since?.date { return text(now.timeIntervalSince(since)) }
        return until?.date.map { text($0.timeIntervalSince(now)) } ?? ""
    }
}

internal struct Figure: View {
    @Environment(\.look) private var look
    internal let figure: Blocks.Figure
    internal var title = ""

    internal var body: some View {
        let palette = look.palette
        if let icon = figure.icon {
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
            Text(button.label).ui(13, .semibold, look).foregroundStyle(tint)
                .padding(.horizontal, 12).frame(minHeight: 30)
                .background(look.outline ? Color.clear : tint.opacity(0.16), in: look.pill)
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
