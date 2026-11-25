import Blocks
import SwiftUI

internal struct GlanceText: View {
    internal let shown: Shown

    internal var body: some View {
        switch shown {
        case .string(let text): Text(text)
        case .number(let number): Text(number.formatted())
        case .bound: Text(verbatim: "")
        case .time(let time):
            if let at = (time.until ?? time.since)?.date { Text(at, style: .timer) } else { Text(time.label ?? "") }
        }
    }
}

internal struct GlanceFigure: View {
    @Environment(\.look) private var look
    @Environment(\.appBlocks) private var appBlocks
    internal let figure: Blocks.Figure
    internal let size: CGFloat

    internal var body: some View {
        let palette = look.palette
        Group {
            if let draw = appBlocks?.figure, let json = try? JSONValue(figure) {
                draw(json)
            } else if let icon = figure.icon {
                Image(systemName: icon).font(.system(size: size * 0.7, weight: .semibold)).foregroundStyle(palette.link)
            } else if let avatar = figure.avatar {
                Text(avatar.prefix(2).uppercased()).ui(size * 0.45, .bold, look).foregroundStyle(palette.foreground)
                    .frame(width: size, height: size).background(palette.edge, in: .circle)
            } else {
                GlanceMark(tone: figure.state)
            }
        }
        .frame(width: size, height: size)
    }
}

internal struct GlanceMark: View {
    @Environment(\.look) private var look
    internal let tone: Tone?

    internal var body: some View {
        Circle().fill(look.palette.tone(tone?.rawValue) ?? look.palette.mute)
            .frame(width: GlanceScale.dot, height: GlanceScale.dot)
    }
}

internal struct GlanceLines: View {
    @Environment(\.look) private var look
    internal let drawn: GlanceDrawn

    internal var body: some View {
        if let line = drawn.line {
            Text(line).ui(GlanceScale.text, .regular, look).lineLimit(2).foregroundStyle(look.palette.foreground)
        }
        ForEach(Array(drawn.rows.enumerated()), id: \.offset) { _, row in GlanceLine(row: row) }
    }
}

internal struct GlanceLine: View {
    @Environment(\.look) private var look
    internal let row: GlanceRow

    internal var body: some View {
        let palette = look.palette
        GlanceLink(tap: row.tap) {
            HStack(spacing: GlanceScale.gap) {
                if let figure = row.figure { GlanceFigure(figure: figure, size: GlanceScale.row) }
                Text(row.title).ui(GlanceScale.text, .medium, look).lineLimit(1).foregroundStyle(palette.foreground)
                    .layoutPriority(1)
                if let subtitle = row.subtitle {
                    Text(subtitle).ui(GlanceScale.meta, .regular, look).lineLimit(1).foregroundStyle(palette.mute)
                }
                Spacer(minLength: GlanceScale.gap)
                if let value = row.value {
                    GlanceText(shown: value).ui(GlanceScale.meta, .regular, look).lineLimit(1).monospacedDigit()
                        .foregroundStyle(palette.tone(row.tone?.rawValue) ?? palette.mute)
                        .fixedSize().layoutPriority(2)
                }
            }
        }
    }
}
