import Blocks
import SwiftUI

internal struct PlotBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Plot

    internal var body: some View {
        Text(block.label).foregroundStyle(look.palette.foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
