import SwiftUI

internal struct ZoomedPicture: View {
    @State private var scale: CGFloat = 1
    internal let src: String
    internal let alt: String?

    internal var body: some View {
        Picture(src: src, alt: alt, fit: true).scaleEffect(scale).modifier(Zoomed(scale: $scale, most: 4))
    }
}
