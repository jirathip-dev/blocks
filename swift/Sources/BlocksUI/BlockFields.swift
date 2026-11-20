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

internal struct FieldsBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    @Environment(\.behaved) private var behaved
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

    @ViewBuilder internal var body: some View {
        if look.tiles != nil, context.tint == nil {
            fields.padding(14).frame(maxWidth: .infinity, alignment: .leading).surface(look)
        } else {
            fields
        }
    }

    private var fields: some View {
        let edits = live ?? (block.submit == nil ? shared ?? $own : $own)
        return VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(block.fields.enumerated()), id: \.offset) { _, field in
                if !behaved.view.hidden.contains(field.kind.name) { FieldRow(field: field.kind, edits: edits) }
            }
            if let submit = block.submit {
                let source = Source(action: submit.action, values: submit.values)
                ActButton(source: source, values: block.fieldValues.merging(own) { $1 }) {
                    CardButton(title: submit.label, primary: true, tint: context.tint)
                }
                .disabled(block.id.map(behaved.view.disabled.contains) == true)
            }
        }
    }
}

internal struct FieldRow: View {
    @Environment(\.look) private var look
    @Environment(\.focus) private var focus
    @Environment(\.behaved) private var behaved
    @Environment(\.edit) private var edit
    @State private var editing = false
    @State private var draft = ""
    internal let field: any FieldKind
    @Binding internal var edits: [String: JSONValue]

    private var name: String { field.name }
    private var value: JSONValue? {
        edits[name] ?? (behaved.edited.contains(name) ? behaved.state[name]?.json : nil) ?? field.start
    }

    private var options: [String]? {
        if case .pick(let all) = field.edit { all } else { nil }
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
                Text(field.shown(value, edited: edits[name] != nil)).ui(14, .regular, look)
            }
            .padding(.horizontal, 12).frame(minHeight: 38).padding(.vertical, note == nil ? 0 : 4)
            .background(palette.background.opacity(0.5), in: .rect(cornerRadius: look.radius(10)))
            .overlay {
                if focus == name { RoundedRectangle(cornerRadius: look.radius(10)).strokeBorder(palette.lead, lineWidth: 2) }
            }
        }
        .buttonStyle(.plain).id(name).disabled(behaved.view.disabled.contains(name))
        .alert(field.label ?? name, isPresented: typing) { editor }
        .confirmationDialog(field.label ?? name, isPresented: picking) {
            ForEach(options ?? [], id: \.self) { option in
                Button(option) { set(.string(option)) }
            }
        }
    }

    private var note: (text: String, tint: Color)? {
        let palette = look.palette
        if behaved.edited.contains(name), let say = behaved.view.says[name] { return (say, palette.red) }
        if let error = field.error { return (error, palette.red) }
        if let was = field.was { return ("\(fieldWords["was"]?.en ?? "was") \(was)", palette.lead) }
        return field.doc.map { ($0, palette.mute) }
    }

    private var typing: Binding<Bool> {
        Binding(get: { editing && options == nil }, set: { editing = $0 })
    }

    private var picking: Binding<Bool> {
        Binding(get: { editing && options != nil }, set: { editing = $0 })
    }

    @ViewBuilder private var editor: some View {
        if case .type(secure: true, _, _) = field.edit {
            SecureField(name, text: $draft)
        } else if case .type(_, let hint, _) = field.edit {
            SwiftUI.TextField(hint ?? name, text: $draft)
        }
        Button("OK") { set(.string(draft)) }
        Button("Cancel", role: .cancel) {}
    }

    private func set(_ v: JSONValue) {
        edits[name] = v
        edit([name: Lit(v)])
    }

    private func tap() {
        switch field.edit {
        case .flip: set(.bool(value?.bool != true))
        case .type(secure: true, _, _): (draft, editing) = ("", true)
        default: (draft, editing) = (value?.string ?? "", true)
        }
    }
}
