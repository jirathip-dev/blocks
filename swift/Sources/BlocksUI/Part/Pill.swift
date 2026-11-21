import Blocks
import SwiftUI

internal struct Pill: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    internal let badge: Blocks.Label

    internal var body: some View {
        let tint = look.palette.tone(badge.tone?.rawValue) ?? look.palette.mute
        RelativeValue { badge.text.text(at: $0, behaved.view.values) }.ui(11, .bold, look).foregroundStyle(tint)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(tint.opacity(0.15), in: look.pill)
    }
}
