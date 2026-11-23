import Blocks
import SwiftUI

extension SearchField: FieldKind {
    internal var start: JSONValue? { value.map(JSONValue.string) }
    internal var edit: FieldEdit { .search(self) }
}

/// A search box: with `filters` it hides the rows of that list or table; in a live form it sends its text 250 ms after the last key, and at once on clear and on Enter.
internal struct SearchRow: View {
    private static let quiet = 250
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    @Environment(\.edit) private var edit
    @State private var text: String
    @State private var sent: String
    internal let field: SearchField
    @Binding internal var edits: [String: JSONValue]

    internal init(field: SearchField, edits: Binding<[String: JSONValue]>) {
        self.field = field
        _edits = edits
        _text = State(initialValue: edits.wrappedValue[field.name]?.string ?? field.value ?? "")
        _sent = State(initialValue: field.value ?? "")
    }

    private var line: String {
        guard let id = field.filters, let s = behaved.seek[id], !s.q.isEmpty else { return "" }
        return s.n > 0 ? fieldWord("hits", ["n": "\(s.n)", "m": "\(s.m)"]) : fieldWord("none")
    }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: Scale.pad) {
            Text(field.label ?? field.name).ui(Scale.cell, .regular, look).foregroundStyle(palette.mute)
            HStack(spacing: Scale.gap) {
                SwiftUI.TextField(field.placeholder ?? field.name, text: $text)
                    .ui(Scale.cell, .regular, look).accessibilityLabel(field.label ?? field.name)
                    .accessibilityAddTraits(.isSearchField).onSubmit { commit(text) }
                if !line.isEmpty { Text(line).ui(Scale.meta, .regular, look).foregroundStyle(palette.mute) }
                if !text.isEmpty { Button(fieldWord("clear")) { (text = ""); commit("") }.accessibilityLabel(fieldWord("clear")) }
            }
            .padding(Scale.gap).background(palette.background.opacity(Scale.blink), in: .rect(cornerRadius: look.radius(Scale.cell)))
            if let error = field.error { Text(error).ui(Scale.count, .regular, look).foregroundStyle(palette.red) }
        }
        .disabled(behaved.view.disabled.contains(field.name))
        .task(id: text) {
            guard text != sent else { return }
            if field.filters == nil, (try? await Task.sleep(for: .milliseconds(Self.quiet))) == nil { return }
            commit(text)
        }
    }

    private func commit(_ q: String) {
        guard q != sent else { return }
        sent = q
        edits[field.name] = .string(q)
        edit([field.name: .string(q)])
    }
}
