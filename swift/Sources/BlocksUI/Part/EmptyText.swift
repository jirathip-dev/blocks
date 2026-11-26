import SwiftUI

/// A block's empty text in the one look every kind shares: muted text on a tile one row high.
internal struct EmptyText: View {
    @Environment(\.look) private var look
    @Environment(\.onSurface) private var onSurface
    internal let text: String

    internal var body: some View {
        let line = Text(text).ui(Token.fs, .regular, look).foregroundStyle(look.palette.mute)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        if onSurface {
            line.padding(.vertical, Token.s2)
        } else {
            line.frame(minHeight: 44).padding(.horizontal, Token.s4).padding(.vertical, Token.s2)
                .surface(look)
        }
    }
}

extension EnvironmentValues {
    @Entry internal var onSurface = false
}
