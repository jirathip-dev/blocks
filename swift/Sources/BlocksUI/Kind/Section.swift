import Blocks
import SwiftUI

internal struct SectionBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Section

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 6) {
            if let header = block.header {
                Text(look.label(.header, header)).ui(12, .semibold, look)
                    .foregroundStyle(palette.mute)
            }
            BlockStack(blocks: block.blocks)
            if let footer = block.footer { Text(footer).ui(12, .regular, look).foregroundStyle(palette.mute) }
        }
    }
}
