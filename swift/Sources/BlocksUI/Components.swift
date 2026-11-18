import Blocks
import SwiftUI

internal struct RoundButton: View {
    @Environment(\.look) private var look
    internal let symbol: String
    internal var ascii = ""
    internal var size: CGFloat = 40

    internal var body: some View {
        Mark(text: "[\(ascii)]", size: 15) {
            Image(systemName: symbol).font(.system(size: size * 0.42, weight: .semibold))
        }
        .fixedSize().foregroundStyle(look.palette.foreground).frame(minWidth: size, minHeight: size)
        .chip(look)
    }
}

internal struct CardButton: View {
    @Environment(\.look) private var look
    internal let title: String
    internal var primary = false
    internal var tint: Color?

    internal var body: some View {
        let palette = look.palette
        let tint = tint ?? palette.link
        Text(look.label(.button, title)).ui(15, primary ? .semibold : .regular, look)
            .foregroundStyle(primary ? (palette.dark ? Color.black : .white) : tint)
            .padding(.horizontal, 14).frame(height: 36).frame(maxWidth: .infinity)
            .background(primary ? tint : tint.opacity(look.outline ? 0 : 0.12), in: look.pill)
            .accessibilityLabel(title)
    }
}

internal struct Confirmation: Sendable, Equatable {
    internal let title: String
    internal let message: String?
    internal let accept: String
    internal let destructive: Bool

    internal init?(for source: JSONValue) {
        let destructive = source.string("style") == "destructive" || source.string("tone") == "bad"
        guard let confirm = source["confirm"] ?? (destructive ? .object([:]) : nil) else { return nil }
        let label = source.string("label")
        title = confirm.string("title") ?? label ?? ""
        message = confirm.string("message")
        accept = confirm.string("ok") ?? label ?? "OK"
        self.destructive = destructive || confirm["destructive"]?.bool == true
    }
}
