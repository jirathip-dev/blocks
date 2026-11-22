import Blocks
import SwiftUI

internal struct NavBlock: View {
    @Environment(\.look) private var look
    internal let block: Nav

    internal var body: some View {
        HStack(spacing: 16) {
            if let brand = block.brand { link(brand).ui(16, .bold, look) }
            Spacer(minLength: 8)
            ViewThatFits(in: .horizontal) {
                links
                ScrollView(.horizontal) { links }.scrollIndicators(.hidden)
            }
        }
        .foregroundStyle(look.palette.foreground).padding(.horizontal, 16).frame(minHeight: 48)
    }

    private var links: some View {
        HStack(spacing: 16) {
            ForEach(Array(block.links.enumerated()), id: \.offset) { _, item in
                let current = item.current == true
                link(item).ui(14, .regular, look).underline(current)
                    .foregroundStyle(current ? look.palette.foreground : look.palette.mute)
            }
        }
    }

    private func link(_ item: NavLink) -> some View {
        Text(item.label).modifier(Linked(href: item.href))
    }
}

private struct Linked: ViewModifier {
    @Environment(\.open) private var open
    @Environment(\.openURL) private var openURL
    fileprivate let href: String?

    fileprivate func body(content: Content) -> some View {
        if let href, linkable(href), let url = URL(string: href) {
            Button {
                Follows.follow(url, open: open, openURL: openURL)
            } label: {
                content
            }
            .buttonStyle(.plain)
        } else {
            content
        }
    }
}
