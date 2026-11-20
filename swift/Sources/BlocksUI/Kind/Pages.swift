import Blocks
import SwiftUI

internal struct PagesBlock: View {
    @Environment(\.look) private var look
    @Environment(\.accessibilityReduceMotion) private var reduce
    @State private var zoom: CGFloat = 1
    @State private var at = 0
    internal let block: Pages

    private var title: String { block.title.flatMap { $0.isEmpty ? nil : $0 } ?? "Document" }

    internal var body: some View {
        let palette = look.palette
        let count = block.pages.count
        ScrollViewReader { proxy in
            VStack(alignment: .leading, spacing: 0) {
                head(count, proxy)
                if let note = block.note, !note.isEmpty {
                    Text(note).ui(Token.fs, .regular, look).foregroundStyle(palette.foreground).padding(Token.s2).frame(maxWidth: .infinity, alignment: .leading)
                        .overlay(alignment: .leading) { Rectangle().fill(palette.lead).frame(width: Token.rule) }
                }
                if count == 0 {
                    Text("No pages yet").ui(Token.fs, .regular, look).foregroundStyle(palette.mute).padding(Token.s4 * 2).frame(maxWidth: .infinity).background(palette.line)
                } else {
                    sheets(count, proxy)
                }
            }
        }
        .background(palette.card).overlay(Rectangle().strokeBorder(palette.edge, lineWidth: 1))
    }

    private func head(_ count: Int, _ proxy: ScrollViewProxy) -> some View {
        HStack(spacing: Token.s2) {
            Text(title).ui(Token.fs, .semibold, look).foregroundStyle(look.palette.foreground).lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(count == 0 ? "no pages" : "page \(at + 1) of \(count)").ui(Token.meta, .regular, look).foregroundStyle(look.palette.mute).monospacedDigit()
            if count > 0 {
                key("‹", "previous page", at == 0) { go(at - 1, count, proxy) }
                key("›", "next page", at == count - 1) { go(at + 1, count, proxy) }
                key("−", "zoom out", zoom <= 1) { zoom = max(1, zoom / 1.25) }
                key(zoom <= 1 ? "fit" : "\(Int((zoom * 100).rounded()))%", "fit to width", zoom <= 1) { zoom = 1 }
                key("+", "zoom in", zoom >= 4) { zoom = min(4, zoom * 1.25) }
            }
            if let file = block.file, let url = URL(string: file) {
                Link(destination: url) { Text("[pdf]").ui(Token.fs, .regular, look) }.accessibilityLabel("download \(title) as PDF")
            }
        }
        .padding(.horizontal, Token.s2).frame(minHeight: 44)
        .overlay(alignment: .bottom) { Rectangle().fill(look.palette.edge).frame(height: 1) }
    }

    private func key(_ label: String, _ name: String, _ off: Bool, _ run: @escaping () -> Void) -> some View {
        Button(action: run) { Text("[\(label)]").ui(Token.fs, .regular, look).monospacedDigit() }
            .buttonStyle(.plain).foregroundStyle(off ? look.palette.mute : look.palette.foreground).disabled(off).accessibilityLabel(name)
    }

    private func sheets(_ count: Int, _ proxy: ScrollViewProxy) -> some View {
        let widest = max(CGFloat(block.pages.map(\.width).max() ?? 1), 1)
        let tall = block.pages.reduce(0) { $0 + CGFloat($1.height) / widest }
        let gaps = Token.s4 * CGFloat(count + 1), scale = zoom * tall
        return Fitted(height: { gaps + max(0, $0 - Token.s4 * 2) * scale }) {
            ScrollView(.horizontal) {
                VStack(spacing: Token.s4) {
                    ForEach(Array(block.pages.enumerated()), id: \.offset) { index, page in
                        let share: CGFloat = zoom * CGFloat(page.width) / widest
                        let ratio: CGFloat = CGFloat(page.width) / max(CGFloat(page.height), 1)
                        Picture(src: page.src, alt: page.alt, fit: true).aspectRatio(ratio, contentMode: .fit)
                            .containerRelativeFrame(.horizontal) { length, _ in max(0, length - Token.s4 * 2) * share }
                            .background(Token.paper).overlay(Rectangle().strokeBorder(look.palette.edge, lineWidth: 1))
                            .accessibilityElement(children: .ignore).accessibilityAddTraits(.isImage)
                            .accessibilityLabel("Page \(index + 1) of \(count). \(page.alt)").id(index)
                    }
                }
                .padding(Token.s4).modifier(Zoomed(scale: $zoom, most: 4))
            }
        }
        .background(look.palette.line)
        .accessibilityElement(children: .contain).accessibilityLabel("\(title), \(count) pages")
        .accessibilityAction(named: "Next page") { go(at + 1, count, proxy) }
        .accessibilityAction(named: "Previous page") { go(at - 1, count, proxy) }
    }

    private func go(_ index: Int, _ count: Int, _ proxy: ScrollViewProxy) {
        at = min(count - 1, max(0, index))
        let tiles = look.tiles ?? .default
        withAnimation(reduce || look.motion == 0 ? nil : tiles.curve(tiles.settle * look.motion)) { proxy.scrollTo(at, anchor: .top) }
    }
}

private struct Fitted: SwiftUI.Layout {
    let height: @Sendable (CGFloat) -> CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: LayoutSubviews, cache: inout ()) -> CGSize {
        let width = proposal.replacingUnspecifiedDimensions().width
        return CGSize(width: width, height: height(width))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: LayoutSubviews, cache: inout ()) {
        subviews.forEach { $0.place(at: bounds.origin, proposal: ProposedViewSize(bounds.size)) }
    }
}
