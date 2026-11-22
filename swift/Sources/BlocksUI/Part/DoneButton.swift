import Blocks
import SwiftUI

internal struct DoneButton: View {
    @Environment(\.look) private var look
    internal let done: Submit
    internal var values: [String: JSONValue] = [:]

    internal var body: some View {
        let off = done.off == true
        ActButton(source: Source(action: done.action, values: done.values), values: values) {
            Text(done.label).ui(16, .semibold, look)
                .foregroundStyle(off ? look.palette.mute : look.palette.link)
        }
        .disabled(off)
    }
}
