import Blocks
import SwiftUI

internal struct ChoiceBlock: View {
    @Environment(\.look) private var look
    @State private var other = ""
    internal let block: Choice

    private var options: [ChoiceOption] {
        let recommended = block.recommended
        return block.options.filter { $0.value == recommended } + block.options.filter { $0.value != recommended }
    }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 8) {
            if let question = block.question { Text(question).ui(15, .semibold, look) }
            ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                let source = Source(values: option.values, confirm: Confirmation(option.confirm, label: option.label))
                ActButton(action: block.action, source: source, values: values(option)) {
                    CardButton(
                        title: title(option),
                        primary: option.value == block.recommended,
                        tint: index == options.count - 1 && options.count > 1 ? palette.red : nil
                    )
                }
            }
            if let box = block.other {
                TextField(box.placeholder ?? "", text: $other).ui(14, .regular, look)
                    .padding(.horizontal, 12).frame(height: 38)
                    .background(palette.background.opacity(0.5), in: .rect(cornerRadius: look.radius(10)))
            }
            if let fallback = block.default {
                RelativeText(template: fallback.label ?? "", until: fallback.until.date)
                    .ui(12, .regular, look).foregroundStyle(palette.amber)
            }
        }
    }

    private func title(_ option: ChoiceOption) -> String {
        let recommended = option.value == block.recommended && !look.textMarks
        return recommended ? "\(option.label) · recommended" : option.label
    }

    private func values(_ option: ChoiceOption) -> [String: JSONValue] {
        let tied = block.other?.for
        let text = tied == nil || tied == option.value ? other : ""
        return ["choice": .string(option.value), "other": .string(text)]
    }
}
