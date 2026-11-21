import Blocks
import SwiftUI

internal struct ToolBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Tool

    internal var body: some View {
        Text(block.name).foregroundStyle(look.palette.foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
