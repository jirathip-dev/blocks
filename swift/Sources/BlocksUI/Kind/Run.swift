import Blocks
import SwiftUI

internal struct RunBlock: View {
    @Environment(\.look) private var look
    internal let block: Run

    internal var body: some View {
        let palette = look.palette
        let command = block.command
        let confirm = Confirmation(title: "Run it?", message: command, accept: "Run", destructive: false)
        let approve = Source(confirm: confirm)
        VStack(alignment: .leading, spacing: 10) {
            Text("$ \(command)").font(.system(size: 13, design: .monospaced)).foregroundStyle(palette.foreground)
                .padding(10).frame(maxWidth: .infinity, alignment: .leading)
                .background(palette.background.opacity(0.6), in: .rect(cornerRadius: look.radius(10)))
            VStack(alignment: .leading, spacing: 3) {
                Text("sha \(block.sha)").font(.system(size: 12, design: .monospaced))
                if let dir = block.dir { Text("in \(dir)") }
                if let touches = block.touches { Text("touches \(touches)") }
            }
            .ui(12, .regular, look).foregroundStyle(palette.mute)
            HStack(spacing: 8) {
                answer("approve", source: approve) { CardButton(title: "Approve", primary: true, tint: palette.green) }
                answer("deny", source: Source()) { CardButton(title: "Deny", tint: palette.red) }
            }
            if let until = block.until?.date {
                RelativeText(template: "lapses in {rel}", until: until).ui(12, .regular, look).foregroundStyle(
                    palette.amber)
            }
        }
    }

    private func answer<Label: View>(_ choice: String, source: Source, label: () -> Label) -> some View {
        var values: [String: JSONValue] = ["choice": .string(choice)]
        if choice == "approve" { values["sha"] = .string(block.sha) }
        let content = label()
        return ActButton(action: block.action, source: source, values: values) {
            content
        }
    }
}
