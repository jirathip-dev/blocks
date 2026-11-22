import Blocks
import SwiftUI

internal struct SecretBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    @State private var value = ""
    @State private var editing = false
    internal let block: Secret

    internal var body: some View {
        let palette = look.palette
        let name = block.name
        let poster = context.poster.map { if case .plugin(let name) = $0 { "the \(name) plugin" } else { "the app" } } ?? "its plugin"
        VStack(alignment: .leading, spacing: 10) {
            Button {
                editing = true
            } label: {
                HStack {
                    Text(masked).ui(15, .regular, look).foregroundStyle(palette.mute)
                    Spacer()
                    Image(systemName: "faceid").foregroundStyle(palette.mute)
                }
                .padding(.horizontal, 12).frame(height: 38)
                .background(palette.background.opacity(0.5), in: .rect(cornerRadius: look.radius(10)))
            }
            .buttonStyle(.plain).accessibilityLabel(block.label ?? name)
            Label("Sent to \(poster) only, never to the agent", systemImage: "lock.fill")
                .ui(12, .regular, look).foregroundStyle(palette.mute)
            if value.isEmpty {
                Button {
                    editing = true
                } label: {
                    send
                }.buttonStyle(.plain)
            } else {
                ActButton(source: Source(action: block.action, values: block.values), values: [name: .string(value)]) {
                    send
                }
            }
        }
        .alert(block.label ?? name, isPresented: $editing) {
            SecureField(block.placeholder ?? name, text: $value)
            Button("OK") {}
        }
    }

    private var send: some View {
        CardButton(title: "Send to plugin", primary: true, tint: context.tint ?? look.palette.amber)
    }

    private var masked: String {
        if !value.isEmpty { return String(repeating: "•", count: 12) }
        return block.set == true ? "set ✓ · paste to replace" : "••••••••••••"
    }
}
