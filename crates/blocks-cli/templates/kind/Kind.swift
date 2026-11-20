import Blocks
import SwiftUI

internal struct {{Name}}Block: View {
    @Environment(\.look) private var look
    internal let block: Blocks.{{Name}}

    internal var body: some View {
        Text(block.label).foregroundStyle(look.palette.foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
