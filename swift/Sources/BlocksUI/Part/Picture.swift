import Blocks
import CoreImage
import SwiftUI

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
