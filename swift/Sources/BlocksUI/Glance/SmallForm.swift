import Blocks
import SwiftUI

internal struct SmallForm: View {
    @Environment(\.look) private var look
    internal let drawn: GlanceDrawn

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: GlanceScale.gap) {
            HStack(spacing: GlanceScale.gap) {
                if let figure = drawn.figure { GlanceFigure(figure: figure, size: GlanceScale.side) }
                Text(look.label(.section, drawn.title ?? "")).ui(GlanceScale.text, .semibold, look).lineLimit(1)
                    .foregroundStyle(palette.mute)
            }
            if let value = drawn.value {
                GlanceText(shown: value).ui(GlanceScale.big, .semibold, look).lineLimit(1).monospacedDigit()
                    .foregroundStyle(palette.tone(drawn.tone?.rawValue) ?? palette.foreground)
            }
            GlanceLines(drawn: drawn)
            Spacer(minLength: 0)
            if let foot = drawn.foot {
                Text(foot).ui(GlanceScale.meta, .regular, look).lineLimit(1).foregroundStyle(palette.mute)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
