import Blocks
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
