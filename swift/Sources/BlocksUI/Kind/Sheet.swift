import Blocks
import SwiftUI

internal struct SheetBlock: View {
    @Environment(\.look) private var look
    @State private var values: [String: JSONValue] = [:]
    internal let block: Modal

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(block.cancel ?? "").ui(16, .regular, look).foregroundStyle(palette.link)
                Spacer()
                Text(block.title).ui(16, .semibold, look)
                Spacer()
                if let done = block.done {
                    DoneButton(done: done, values: block.blocks.fieldValues.merging(values) { $1 })
                }
            }
            BlockStack(blocks: block.blocks, spacing: 14).environment(\.form, $values)
                .environment(\.onSurface, true)
        }
    }
}
