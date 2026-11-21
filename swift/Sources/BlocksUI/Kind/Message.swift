import Blocks
import SwiftUI

internal struct MessageBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Message

    internal var body: some View {
        Text(block.name).foregroundStyle(look.palette.foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
