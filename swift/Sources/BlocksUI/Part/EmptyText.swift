import SwiftUI

/// A block's empty text in the one look every kind shares: muted text on a tile one row high.
internal struct EmptyText: View {
    @Environment(\.look) private var look
    internal let text: String

    internal var body: some View {
        Text(text).ui(Token.fs, .regular, look).foregroundStyle(look.palette.mute)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .padding(.horizontal, Token.s4).padding(.vertical, Token.s2)
            .surface(look)
    }
}
