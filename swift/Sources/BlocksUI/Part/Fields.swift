import Blocks
import SwiftUI

internal struct FieldsBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    @Environment(\.behaved) private var behaved
    @Environment(\.form) private var shared
    @Environment(\.act) private var act
    @Environment(\.fileRows) private var given
    @State private var own: [String: JSONValue] = [:]
    @State private var files: [String: [FileRow]] = [:]
    internal let block: Blocks.Form

    private var uploads: Binding<[String: [FileRow]]> { given.map { .constant($0) } ?? $files }

    private var waits: String? {
        block.fields.flatMap { uploads.wrappedValue[$0.kind.name] ?? [] }.waits
    }

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
                let sent = block.fields.reduce(into: [String: JSONValue]()) { out, f in
                    if let rows = uploads.wrappedValue[f.kind.name] { out[f.kind.name] = .array(rows.ids.map(JSONValue.string)) }
                }
                if let waits { Text(waits).ui(Scale.count, .regular, look).foregroundStyle(look.palette.mute) }
                ActButton(source: source, values: block.fieldValues.merging(own) { $1 }.merging(sent) { $1 }) {
                    CardButton(title: submit.label, primary: true, tint: context.tint)
                }
                .disabled(block.id.map(behaved.view.disabled.contains) == true || waits != nil)
            }
        }
        .environment(\.uploads, uploads).environment(\.formId, block.id)
    }
}
