import Blocks
import SwiftUI

internal struct CardButton: View {
    @Environment(\.look) private var look
    internal let title: String
    internal var primary = false
    internal var tint: Color?

    internal var body: some View {
        let palette = look.palette
        let tint = tint ?? palette.link
        let (ink, fill): (Color, Color) =
            look.filled
            ? (primary ? palette.background : tint, primary ? tint : .clear)
            : (
                primary ? (palette.dark ? Color.black : .white) : look.solid ? palette.background : tint,
                primary || look.solid ? tint : tint.opacity(look.outline ? 0 : 0.12)
            )
        Text(look.label(.button, title)).ui(15, primary ? .semibold : .regular, look)
            .foregroundStyle(ink)
            .padding(.horizontal, 14).frame(height: 36).frame(maxWidth: .infinity)
            .background(fill, in: look.pill)
            .accessibilityLabel(title)
    }
}
