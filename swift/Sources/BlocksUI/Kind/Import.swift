import Blocks
import SwiftUI

internal struct ImportBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Import

    internal var body: some View {
        Text(block.label).foregroundStyle(look.palette.foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
