import Blocks
import SwiftUI
import UniformTypeIdentifiers

internal struct ImportBlock: View {
    internal enum Phase: Equatable { case idle, up(Double), failed(String), reading, review, ask, sending, done }

    @Environment(\.look) private var look
    @Environment(\.onFile) private var onFile
    @Environment(\.acted) private var acted
    @Environment(\.act) private var act
    @Environment(\.screenId) private var screen
    @State private var picking = false
    @State private var phase: Phase?
    @State private var file = ""
    @State private var name = ""
    internal let block: Import

    private var now: Phase {
        let p = phase ?? (block.done != nil ? .done : block.sheet != nil ? .review : .idle)
        return p == .done && block.done == nil ? .review : p
    }
    private var id: String { file.isEmpty ? block.sheet?.file.id ?? "" : file }
    private var off: Bool { onFile == nil || block.read == nil || block.action == nil }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: Scale.gap * 2) {
            HStack {
                Text(block.title).ui(Scale.title, .bold, look).foregroundStyle(palette.foreground)
                Spacer()
                if let t = block.template, now != .done, !off, let url = URL(string: t.src) {
                    Link(fieldWord("imTemplate"), destination: url).accessibilityLabel("\(fieldWord("imTemplate")): \(block.title)")
                }
            }
            if let error = block.error, now != .reading { Text(error).ui(Scale.cell, .regular, look).foregroundStyle(palette.red) }
            switch now {
            case .done: done
            case .review, .ask, .sending: if let sheet = block.read(of: id) { preview(sheet) } else { picker }
            case .idle: picker
            default: line
            }
        }
        .padding(Scale.gap * 2).frame(maxWidth: .infinity, alignment: .leading)
        .background(palette.card).overlay(Rectangle().strokeBorder(palette.edge, lineWidth: 1))
        .fileImporter(isPresented: $picking, allowedContentTypes: [.commaSeparatedText, .spreadsheet]) { take(try? $0.get()) }
        .accessibilityElement(children: .contain).accessibilityLabel(block.title)
    }

    private var picker: some View {
        let need = block.columns.map { $0.required == true ? "\($0.label) (\(fieldWord("imReq")))" : $0.label }.joined(separator: ", ")
        let kinds = (block.accept ?? ["xlsx", "csv"]).map { ".\($0)" }.joined(separator: " \(fieldWord("imOr")) ")
        return VStack(alignment: .leading, spacing: Scale.gap) {
            Text(fieldWord("imDrop")).ui(Scale.cell, .regular, look).foregroundStyle(look.palette.foreground)
            Button(fieldWord("file1")) { picking = true }.disabled(off).accessibilityLabel("\(fieldWord("file1")): \(block.title)")
            Text(off ? fieldWord("imOff") : fieldWord("imHint", ["types": kinds, "mb": String(block.mb ?? 10)]))
                .ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
            Text("\(fieldWord("imNeeds")) \(need)").ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
        }
    }

    private var line: some View {
        let status: String =
            switch now {
            case .up(let part): fieldWord("uploading", ["p": String(Int((part * 100).rounded()))])
            case .failed(let why): why
            default: fieldWord("imReading")
            }
        return HStack {
            VStack(alignment: .leading, spacing: Scale.mark) {
                Text(name).ui(Scale.cell, .semibold, look).lineLimit(1).truncationMode(.middle)
                Text(status).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
            }
            Spacer()
            if case .failed = now {
                if !file.isEmpty { Button(fieldWord("retry")) { read() } }
                Button(fieldWord("imAnother")) { phase = .idle; file = "" }
            } else {
                Button(fieldWord("imCancel")) { phase = .idle; file = "" }
            }
        }
    }

    private func preview(_ sheet: ImportSheet) -> some View {
        let bad = block.bad, good = block.good, missing = block.missing, into = block.into ?? block.title
        return VStack(alignment: .leading, spacing: Scale.gap) {
            HStack {
                Text(sheet.file.name).ui(Scale.cell, .semibold, look).lineLimit(1).truncationMode(.middle)
                Text(fieldWord("imRows", ["n": String(sheet.file.rows)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
                Spacer()
                Button(fieldWord("imAnother")) { phase = .idle; file = "" }.disabled(now != .review)
            }
            let matched = block.columns.count { !(sheet.map[$0.key] ?? "").isEmpty }
            Text(fieldWord("imSum", ["n": String(matched), "m": String(block.columns.count)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
            ForEach(sheet.rows + bad.filter { b in !sheet.rows.contains { $0.n == b.n } }, id: \.n) { row($0, sheet) }
            if Int(sheet.file.rows) > sheet.rows.count {
                Text(fieldWord("imMore", ["n": String(Int(sheet.file.rows) - sheet.rows.count)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
            }
            if let missing { Text(fieldWord("imFix", ["c": missing.label])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.red) }
            else if !bad.isEmpty { Text(fieldWord("imLeft", ["n": String(bad.count)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute) }
            if now == .ask {
                Text(fieldWord("imAsk", ["n": String(good), "t": into])).ui(Scale.cell, .semibold, look)
                Text(fieldWord("imSafe")).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
                HStack {
                    Button(fieldWord("imBack")) { phase = .review }
                    Button(fieldWord("imGo", ["n": String(good)])) { send() }.buttonStyle(.borderedProminent)
                }
            } else {
                Button(now == .sending ? fieldWord("imSending") : good == 0 ? fieldWord("imNothing") : fieldWord("imGo", ["n": String(good)])) { phase = .ask }
                    .buttonStyle(.borderedProminent).disabled(missing != nil || good == 0 || now == .sending)
            }
        }
    }

    private func row(_ r: ImportRow, _ sheet: ImportSheet) -> some View {
        let cells = block.columns.map { c in sheet.map[c.key] == nil ? "—" : r.cells[c.key].flatMap { $0.isEmpty ? nil : $0 } ?? "—" }.joined(separator: " · ")
        let why = block.columns.compactMap { c in r.bad?[c.key].map { "\(c.label): \($0)" } }.joined(separator: " · ")
        return VStack(alignment: .leading, spacing: Scale.mark) {
            Text("\(fieldWord("imRow")) \(r.n) · \(cells)").ui(Scale.cell, .regular, look).foregroundStyle(look.palette.foreground).lineLimit(2)
            if !why.isEmpty { Text(why).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.red) }
        }
        .padding(.leading, why.isEmpty ? 0 : Scale.gap)
        .overlay(alignment: .leading) { if !why.isEmpty { Rectangle().fill(look.palette.red).frame(width: Scale.mark) } }
    }

    private var done: some View {
        let d = block.done
        return VStack(alignment: .leading, spacing: Scale.gap) {
            Text("\(d?.count ?? 0) \(fieldWord("imDone", ["t": block.into ?? block.title]))").ui(Scale.title, .semibold, look).foregroundStyle(look.palette.green)
            if let left = d?.left, left > 0 { Text(fieldWord("imLeftOut", ["n": String(left)])).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute) }
            if let f = d?.file, let url = URL(string: f.src) { Link(fieldWord("imLeftDl"), destination: url) }
            Button(fieldWord("imAgain")) { phase = .idle; file = "" }
        }
    }

    private func take(_ url: URL?) {
        guard let url, let onFile else { return }
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize).map(UInt64.init) ?? 0
        name = url.lastPathComponent
        file = ""
        if let mb = block.mb, size > UInt64(mb) * 1_048_576 {
            phase = .failed(fieldWord("tooBig", ["size": sized(size), "mb": String(mb)]))
            return
        }
        phase = .up(0)
        let about = Picked(
            screen: screen, block: block.id, field: "file", name: name, mime: UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "",
            size: size, progress: { part in phase = .up(min(1, max(0, part))) })
        Task {
            let open = url.startAccessingSecurityScopedResource()
            defer { if open { url.stopAccessingSecurityScopedResource() } }
            guard let ref = try? await onFile(url, about) else { return phase = .failed(fieldWord("failed")) }
            file = ref.id
            read()
        }
    }

    private func read() {
        guard let action = block.read else { return }
        phase = .reading
        Task {
            let ok = await sent(BlockAction(action: action, values: block.values(file: file)))
            phase = ok ? .review : .failed(fieldWord("imNoAnswer"))
        }
    }

    private func send() {
        guard let action = block.action else { return }
        phase = .sending
        Task { phase = await sent(BlockAction(action: action, values: block.values(file: id))) ? .done : .review }
    }

    private func sent(_ a: BlockAction) async -> Bool {
        guard let acted else { act(a); return true }
        return await acted(a)
    }
}
