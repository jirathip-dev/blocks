import Blocks
import SwiftUI

internal struct ChipsBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var picked: [String]?
    internal let block: Chips

    internal var body: some View {
        let selected = picked ?? block.selected ?? []
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(block.options.map(\.value), id: \.self) { value in
                    Button {
                        pick(value, from: selected)
                    } label: {
                        chip(value, selected: selected.contains(value))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    private func chip(_ value: String, selected: Bool) -> some View {
        let label = block.options.first { $0.value == value }?.label ?? value
        return Text(label).ui(13, .semibold, look).foregroundStyle(
            selected ? look.palette.background : look.palette.foreground
        )
        .padding(.horizontal, 12).frame(height: 30)
        .background(selected ? look.palette.lead : look.palette.edge.opacity(0.35), in: look.pill)
    }

    private func pick(_ value: String, from selected: [String]) {
        let multi = block.multi == true
        let next = multi ? (selected.contains(value) ? selected.filter { $0 != value } : selected + [value]) : [value]
        picked = next
        let chosen: JSONValue = multi ? .array(next.map(JSONValue.string)) : .string(value)
        if let action = block.action {
            act(BlockAction(action: action, values: [block.name: chosen]))
        }
    }
}
