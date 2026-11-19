import Blocks
import SwiftUI

internal struct ButtonBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    internal let block: Blocks.Button

    internal var body: some View {
        let destructive = block.style == .destructive
        let tint = destructive ? look.palette.red : context.tint
        let confirm = Confirmation(block.confirm, label: block.label, destructive: destructive)
        ActButton(source: Source(action: block.action, tap: block.tap, values: block.values, confirm: confirm)) {
            CardButton(title: block.label, primary: block.style == .primary, tint: tint)
        }
    }
}
