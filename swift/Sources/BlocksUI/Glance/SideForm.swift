import Blocks
import SwiftUI

internal struct SideForm: View {
    @Environment(\.look) private var look
    internal let drawn: GlanceDrawn
    internal let trailing: Bool

    internal var body: some View {
        HStack(spacing: GlanceScale.gap) {
            if let figure = drawn.figure {
                GlanceFigure(figure: figure, size: GlanceScale.side)
            } else if drawn.mark {
                GlanceMark(tone: drawn.tone)
            }
            if let value = drawn.value {
                GlanceText(shown: value).ui(GlanceScale.text, .semibold, look).lineLimit(1).monospacedDigit()
                    .foregroundStyle(look.palette.tone(drawn.tone?.rawValue) ?? look.palette.foreground)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: trailing ? .trailing : .leading)
        .accessibilityElement(children: .combine)
    }
}
