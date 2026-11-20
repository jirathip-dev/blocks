import Blocks
import CoreImage
import SwiftUI

internal struct ImagesBlock: View {
    @Environment(\.look) private var look
    @State private var open: Int?
    internal let block: Images

    internal var body: some View {
        let items = block.items
        let side: CGFloat = block.size == .small ? 72 : 160
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    Button {
                        open = index
                    } label: {
                        Picture(src: item.src, alt: item.alt).frame(width: side, height: side)
                            .clipShape(.rect(cornerRadius: look.radius(12)))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .sheet(item: Binding(get: { open.map(Opened.init) }, set: { open = $0?.index })) { opened in
            ZoomedPicture(src: items[opened.index].src, alt: items[opened.index].alt)
        }
    }
}

private struct Opened: Identifiable {
    fileprivate let index: Int
    fileprivate var id: Int { index }
}

internal struct ZoomedPicture: View {
    internal let src: String
    internal let alt: String?

    internal var body: some View { Picture(src: src, alt: alt, fit: true).modifier(Zoomed(most: 4)) }
}

internal struct Picture: View {
    @Environment(\.look) private var look
    internal let src: String
    internal let alt: String?
    internal var fit = false

    internal var body: some View {
        if let image = Self.decoded(src) {
            Image(decorative: image, scale: 1).resizable().aspectRatio(contentMode: fit ? .fit : .fill)
        } else if let url = URL(string: src), url.scheme == "https" || url.scheme == "http" {
            AsyncImage(url: url) {
                $0.resizable().aspectRatio(contentMode: fit ? .fit : .fill)
            } placeholder: {
                missing
            }
        } else {
            missing
        }
    }

    private var missing: some View {
        Text(alt ?? "").ui(12, .regular, look).foregroundStyle(look.palette.mute)
            .frame(maxWidth: .infinity, maxHeight: .infinity).background(look.palette.card)
    }

    private static func decoded(_ src: String) -> CGImage? {
        guard src.hasPrefix("data:image/"), let comma = src.firstIndex(of: ","),
            let data = Data(base64Encoded: String(src[src.index(after: comma)...])),
            let image = CIImage(data: data)
        else { return nil }
        return CIContext().createCGImage(image, from: image.extent)
    }
}
