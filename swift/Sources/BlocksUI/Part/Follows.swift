import SwiftUI

internal struct Follows: ViewModifier {
    @Environment(\.open) private var open
    @Environment(\.openURL) private var openURL

    internal func body(content: Content) -> some View {
        content.environment(
            \.openURL,
            OpenURLAction { url in
                Self.follow(url, open: open, openURL: openURL)
                return .handled
            })
    }

    @MainActor
    internal static func follow(_ url: URL, open: (String) -> Void, openURL: OpenURLAction) {
        if url.scheme == nil { open(url.absoluteString) } else { openURL(url) }
    }
}
