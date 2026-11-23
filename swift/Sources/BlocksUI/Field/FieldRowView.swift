import Blocks
import SwiftUI

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

    @ViewBuilder internal var body: some View {
        switch field.edit {
        case .slide(let f): SliderRow(field: f, edits: $edits)
        #if !os(watchOS)
            case .files(let f): UploadRow(field: f)
            case .scan(let f): ScanRow(field: f)
        #endif
        case .search(let f): SearchRow(field: f, edits: $edits)
        default: row
        }
    }

    private var row: some View {
        let palette = look.palette
        return Button(action: tap) {
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
