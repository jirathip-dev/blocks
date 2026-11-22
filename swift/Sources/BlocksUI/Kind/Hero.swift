import Blocks
import SwiftUI

internal struct HeroBlock: View {
    @Environment(\.look) private var look
    internal let block: Hero

    internal var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(block.title).ui(34, .bold, look)
            if let subtitle = block.subtitle {
                Text(subtitle).ui(17, .regular, look).foregroundStyle(look.palette.mute)
            }
            #if !os(watchOS)
                if let media = block.media { MediaBlock(block: media) }
            #endif
            HStack(spacing: 8) {
                ForEach(Array((block.actions ?? []).enumerated()), id: \.offset) { index, item in
                    ActButton(source: Source(item)) { CardButton(title: item.label, primary: index == 0) }
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
    }
}
