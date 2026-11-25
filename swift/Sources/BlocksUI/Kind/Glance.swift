import Blocks
import SwiftUI

internal struct GlanceBlock: View {
    @Environment(\.look) private var look
    internal let block: Glance

    internal var body: some View {
        GlanceView(block, .medium).frame(height: GlanceForm.medium.box.height).padding(Token.s4).surface(look)
    }
}
