import Blocks
import SwiftUI

internal struct PanelForm: View {
    @Environment(\.look) private var look
    internal let drawn: GlanceDrawn
    internal let glance: String?

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: GlanceScale.air) {
            HStack(spacing: GlanceScale.air) {
                if let figure = drawn.figure { GlanceFigure(figure: figure, size: GlanceScale.head) }
                VStack(alignment: .leading, spacing: GlanceScale.tight) {
                    Text(drawn.title ?? "").ui(GlanceScale.title, .semibold, look).lineLimit(1)
                        .foregroundStyle(palette.foreground)
                    if let subtitle = drawn.subtitle {
                        Text(subtitle).ui(GlanceScale.meta, .regular, look).lineLimit(1).foregroundStyle(palette.mute)
                    }
                }
                Spacer(minLength: GlanceScale.gap)
                if let value = drawn.value {
                    GlanceText(shown: value).ui(GlanceScale.title, .semibold, look).lineLimit(1).monospacedDigit()
                        .foregroundStyle(palette.tone(drawn.tone?.rawValue) ?? palette.foreground).fixedSize().layoutPriority(1)
                }
            }
            GlanceLines(drawn: drawn)
            Spacer(minLength: 0)
            HStack(spacing: GlanceScale.gap) {
                if let foot = drawn.foot {
                    Text(foot).ui(GlanceScale.meta, .regular, look).lineLimit(1).foregroundStyle(palette.mute)
                }
                Spacer(minLength: GlanceScale.gap)
                ForEach(Array(drawn.acts.enumerated()), id: \.offset) { _, act in GlanceAct(act: act, glance: glance) }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
