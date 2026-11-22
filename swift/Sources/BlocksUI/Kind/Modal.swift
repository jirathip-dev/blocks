import Blocks
import SwiftUI

internal struct ModalBlock: View {
    internal let block: Modal

    internal var body: some View { SheetBlock(block: block) }
}
