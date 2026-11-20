import Blocks
import SwiftUI
import UniformTypeIdentifiers

internal struct ImportBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @Environment(\.locale) private var locale
    @State private var picking = false
    @State private var file: (name: String, book: SheetBook)?
    @State private var error: String?
    @State private var asking = false
    @State private var sent = false
    internal let block: Import

    private var thai: Bool { locale.language.languageCode?.identifier == "th" }
    private func w(_ key: String, _ values: [String: String] = [:]) -> String { importWord(key, values, thai: thai) }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: Scale.gap * 2) {
            Text(block.title).ui(Scale.title, .bold, look).foregroundStyle(palette.foreground)
            ForEach([block.error, error].compactMap(\.self), id: \.self) { Text($0).ui(Scale.cell, .regular, look).foregroundStyle(palette.red) }
            if let done = block.done, sent {
                Text("\(done) \(w("imDone", ["t": block.into ?? block.title]))").ui(Scale.title, .semibold, look).foregroundStyle(palette.green)
                Button(w("imAgain")) { file = nil; sent = false }
            } else if let file {
                preview(file.name, file.book)
            } else {
                picker
            }
        }
        .padding(Scale.gap * 2).frame(maxWidth: .infinity, alignment: .leading)
        .background(palette.card).overlay(Rectangle().strokeBorder(palette.edge, lineWidth: 1))
        .fileImporter(isPresented: $picking, allowedContentTypes: [.commaSeparatedText, .spreadsheet]) { take(try? $0.get()) }
        .accessibilityElement(children: .contain).accessibilityLabel(block.title)
    }

    private var picker: some View {
        let need = block.columns.map { $0.required == true ? "\($0.label) (\(w("imReq")))" : $0.label }.joined(separator: ", ")
        return VStack(alignment: .leading, spacing: Scale.gap) {
            Text(w("imDrop")).ui(Scale.cell, .regular, look).foregroundStyle(look.palette.foreground)
            Button(fieldWord("file1")) { picking = true }.disabled(block.action == nil)
            Text(block.action == nil ? w("imOff") : w("imHint", ["max": String(block.max ?? 5000)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
            Text("\(w("imNeeds")) \(need)").ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
        }
    }

    private func preview(_ name: String, _ book: SheetBook) -> some View {
        let map = matchColumns(block.columns, book.head), rows = checkRows(block.columns, map, book, refused: block.refused ?? [], thai: thai)
        let good = rows.filter(\.bad.isEmpty), bad = rows.count - good.count
        let missing = block.columns.first { $0.required == true && (map[$0.key] ?? -1) < 0 }
        let shown = Array(rows.enumerated().filter { $0.offset < 5 || !$0.element.bad.isEmpty }.prefix(60).map(\.element))
        return VStack(alignment: .leading, spacing: Scale.gap) {
            HStack {
                Text(name).ui(Scale.cell, .semibold, look).lineLimit(1).truncationMode(.middle)
                Text(w("imRows", ["n": String(book.rows.count)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
                Spacer()
                Button(w("imAnother")) { file = nil; asking = false }
            }
            ForEach(shown, id: \.n) { r in line(r) }
            if rows.count > shown.count { Text(w("imMore", ["n": String(rows.count - shown.count)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute) }
            if let missing { Text(w("imFix", ["c": missing.label])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.red) }
            else if bad > 0 { Text(w("imLeft", ["n": String(bad)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute) }
            if asking {
                Text(w("imAsk", ["n": String(good.count), "t": block.into ?? block.title])).ui(Scale.cell, .semibold, look)
                HStack {
                    Button(w("imBack")) { asking = false }
                    Button(w("imGo", ["n": String(good.count)])) { send(name, good, bad) }.buttonStyle(.borderedProminent)
                }
            } else {
                Button(good.isEmpty ? w("imNothing") : w("imGo", ["n": String(good.count)])) { asking = true }
                    .buttonStyle(.borderedProminent).disabled(missing != nil || good.isEmpty)
            }
        }
    }

    private func line(_ r: ImportRow) -> some View {
        let cells = block.columns.map { r.cells[$0.key].flatMap { $0.isEmpty ? nil : $0 } ?? "—" }.joined(separator: " · ")
        let why = block.columns.compactMap { c in r.bad[c.key].map { "\(c.label): \($0)" } }.joined(separator: " · ")
        return VStack(alignment: .leading, spacing: Scale.mark) {
            Text("\(w("imRow")) \(r.n) · \(cells)").ui(Scale.cell, .regular, look).foregroundStyle(look.palette.foreground).lineLimit(2)
            if !why.isEmpty { Text(why).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.red) }
        }
        .padding(.leading, why.isEmpty ? 0 : Scale.gap)
        .overlay(alignment: .leading) { if !why.isEmpty { Rectangle().fill(look.palette.red).frame(width: Scale.mark) } }
    }

    private func take(_ url: URL?) {
        guard let url else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let (book, why) = readSheet(name: url.lastPathComponent, data: (try? Data(contentsOf: url)) ?? Data())
        let max = Int(block.max ?? 5000)
        if let book, book.rows.count <= max { file = (url.lastPathComponent, book); error = nil }
        else { error = book.map { w("imTooMany", ["n": String($0.rows.count), "max": String(max)]) } ?? w(why ?? "imNotSheet") }
        asking = false
    }

    private func send(_ name: String, _ good: [ImportRow], _ bad: Int) {
        guard let action = block.action else { return }
        act(BlockAction(action: action, values: ["rows": .array(good.map { .object($0.values) }), "file": .string(name), "left": .number(Double(bad))]))
        asking = false
        sent = true
    }
}
