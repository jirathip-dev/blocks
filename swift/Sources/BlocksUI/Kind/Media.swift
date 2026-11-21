import Blocks
import SwiftUI
import WebKit

internal struct MediaBlock: View {
    @Environment(\.look) private var look
    @State private var zoomed = false
    @State private var playing = false
    internal let block: Media

    private var takes: Bool {
        block.id != nil && block.video != true && (block.draw ?? block.move ?? block.stretch ?? block.remove) != nil
    }

    private var named: String {
        let marks = block.marks ?? []
        guard !marks.isEmpty, block.video != true else { return block.alt }
        return "\(block.alt). \(marks.count) marks: \(marks.compactMap { block.named($0.id) }.joined(separator: "; "))"
    }

    internal var body: some View {
        let ratio = Double(block.width) / max(Double(block.height), 1)
        VStack(alignment: .leading, spacing: 6) {
            if takes {
                Marked(block: block)
            } else {
                Button {
                    if block.video == true { playing = true } else { zoomed = true }
                } label: {
                    Color.clear.aspectRatio(ratio, contentMode: .fit)
                        .overlay { picture }.overlay { MarkLayer(marks: block.video == true ? [] : block.marks ?? []) }.clipped()
                }
                .buttonStyle(.plain).accessibilityLabel(named)
            }
            if let caption = block.caption {
                Text(caption).ui(13, .regular, look).foregroundStyle(look.palette.mute)
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
        .sheet(isPresented: $zoomed) { ZoomedPicture(src: block.src, alt: block.alt) }
    }

    @ViewBuilder private var picture: some View {
        if block.video == true, playing, let url = URL(string: block.src) {
            WebView(url: url)
        } else if block.video == true {
            Picture(src: block.poster ?? "", alt: block.alt).overlay {
                RoundButton(symbol: "play.fill", ascii: "play", size: 44)
            }
        } else {
            Picture(src: block.src, alt: block.alt)
        }
    }
}
