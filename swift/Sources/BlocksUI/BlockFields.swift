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
                .background(palette.background.opacity(0.6), in: .rect(cornerRadius: 10))
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
                .background(palette.background.opacity(0.5), in: .rect(cornerRadius: 10))
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

internal struct FieldsBlock: View {
    @Environment(\.card) private var context
    @Environment(\.form) private var shared
    @Environment(\.act) private var act
    @State private var own: [String: JSONValue] = [:]
    internal let block: Blocks.Form

    private var live: Binding<[String: JSONValue]>? {
        guard let action = block.action else { return nil }
        return Binding {
            own
        } set: { edits in
            let changed = edits.filter { own[$0.key] != $0.value }
            own = edits
            act(BlockAction(action: action, values: changed))
        }
    }

    internal var body: some View {
        let edits = live ?? (block.submit == nil ? shared ?? $own : $own)
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(block.fields.enumerated()), id: \.offset) { _, field in
                FieldRow(field: field, edits: edits)
            }
            if let submit = block.submit {
                let source = Source(action: submit.action, values: submit.values)
                ActButton(source: source, values: block.fieldValues.merging(own) { $1 }) {
                    CardButton(title: submit.label, primary: true, tint: context.tint)
                }
            }
        }
    }
}

internal struct FieldRow: View {
    @Environment(\.look) private var look
    @Environment(\.focus) private var focus
    @State private var editing = false
    @State private var draft = ""
    internal let field: Field
    @Binding internal var edits: [String: JSONValue]

    private var name: String { field.name }
    private var value: JSONValue? { edits[name] ?? field.value?.json }

    private var shown: String {
        switch field.type {
        case .toggle: value?.bool == true ? "on" : "off"
        case .secret: edits[name] == nil ? (field.set == true ? "set ✓" : "") : "••••••••"
        default: value?.string ?? value?.number?.formatted() ?? field.placeholder ?? ""
        }
    }

    internal var body: some View {
        let palette = look.palette
        Button(action: tap) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(field.label ?? name).ui(14, .regular, look).foregroundStyle(palette.mute)
                    if let note { Text(note.text).ui(11, .regular, look).foregroundStyle(note.tint) }
                }
                Spacer()
                Text(shown).ui(14, .regular, look)
            }
            .padding(.horizontal, 12).frame(minHeight: 38).padding(.vertical, note == nil ? 0 : 4)
            .background(palette.background.opacity(0.5), in: .rect(cornerRadius: 10))
            .overlay {
                if focus == name { RoundedRectangle(cornerRadius: 10).strokeBorder(palette.lead, lineWidth: 2) }
            }
        }
        .buttonStyle(.plain).id(name)
        .alert(field.label ?? name, isPresented: typing) { editor }
        .confirmationDialog(field.label ?? name, isPresented: picking) {
            ForEach(field.options ?? [], id: \.self) { option in
                Button(option) { edits[name] = .string(option) }
            }
        }
    }

    private var note: (text: String, tint: Color)? {
        let palette = look.palette
        if let error = field.error { return (error, palette.red) }
        if let was = field.was { return ("was \(was)", palette.lead) }
        return field.doc.map { ($0, palette.mute) }
    }

    private var typing: Binding<Bool> {
        Binding(get: { editing && field.type != .picker }, set: { editing = $0 })
    }

    private var picking: Binding<Bool> {
        Binding(get: { editing && field.type == .picker }, set: { editing = $0 })
    }

    @ViewBuilder private var editor: some View {
        if field.type == .secret {
            SecureField(name, text: $draft)
        } else {
            TextField(field.placeholder ?? name, text: $draft)
        }
        Button("OK") { edits[name] = .string(draft) }
        Button("Cancel", role: .cancel) {}
    }

    private func tap() {
        if field.type == .toggle {
            edits[name] = .bool(value?.bool != true)
        } else {
            draft = field.type == .secret ? "" : value?.string ?? ""
            editing = true
        }
    }
}
