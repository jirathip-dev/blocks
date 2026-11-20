import Blocks
import SwiftUI

internal enum Minor {
    internal static func parse(_ s: String, scale: Int) -> Int? {
        var t = Substring(s.filter { $0 != "," && !$0.isWhitespace })
        let neg = t.hasPrefix("-")
        if neg { t = t.dropFirst() }
        if t.hasPrefix("+") { t = t.dropFirst() }
        let parts = t.split(separator: ".", maxSplits: 1, omittingEmptySubsequences: false)
        let (int, frac) = (parts[0], parts.count > 1 ? Array(parts[1]) : [])
        guard !(int.isEmpty && frac.isEmpty), (int + frac).allSatisfy({ ("0"..."9").contains($0) }) else { return nil }
        let digits = "0" + int + String((0..<scale).map { $0 < frac.count ? frac[$0] : "0" })
        let up = frac.count > scale && frac[scale] >= "5" ? 1 : 0
        guard let n = Int(digits), case let (m, false) = n.addingReportingOverflow(up) else { return nil }
        return neg ? -m : m
    }

    internal static func money(_ m: Int, scale: Int) -> String {
        let raw = String(m.magnitude)
        let d = String(repeating: "0", count: max(0, scale + 1 - raw.count)) + raw
        let int = d.dropLast(scale)
        var out = m < 0 ? "-" : ""
        for (i, c) in int.enumerated() {
            if i > 0, (int.count - i) % 3 == 0 { out.append(",") }
            out.append(c)
        }
        return scale > 0 ? out + "." + d.suffix(scale) : out
    }
}

internal struct LinesBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var draft: [LineItem]?
    @State private var made = 0
    @FocusState private var focus: String?
    internal let block: Lines

    private var rows: [LineItem] { draft ?? block.items }
    private var scale: Int { Int(block.scale ?? 2) }
    private var errors: [RowError] { block.errors ?? [] }
    private var sums: [Field] { block.columns.filter { (block.sum ?? []).contains($0.kind.name) } }

    private func label(_ name: String) -> String { block.columns.first { $0.kind.name == name }?.kind.label ?? name }
    private func number(_ c: Field) -> Bool {
        if case .type(_, _, true) = c.kind.edit { return true }
        return (block.sum ?? []).contains(c.kind.name)
    }
    private func fixed(_ c: Field) -> Bool { c.kind.enabled == .lit(.bool(false)) || block.calc?[c.kind.name] != nil }

    private func value(_ row: LineItem, _ c: Field) -> JSONValue? {
        guard let calc = block.calc?[c.kind.name] else { return row.values[c.kind.name] }
        let state = row.values.mapValues { v in
            let t = v.string?.filter { $0 != "," && !$0.isWhitespace }
            let plain = t.flatMap { $0.wholeMatch(of: /[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)/) == nil ? nil : Double($0) }
            return plain.map(Lit.number) ?? Lit(v)
        }
        return calc.eval(state).json
    }

    private func text(_ v: JSONValue?) -> String? {
        v?.string ?? v?.number.flatMap { Expr.cat([.lit(.number($0))]).eval([:]).json.string }
    }

    private func total(_ name: String) -> Int {
        guard let c = block.columns.first(where: { $0.kind.name == name }) else { return 0 }
        return rows.compactMap { text(value($0, c)).flatMap { Minor.parse($0, scale: scale) } }.reduce(0, +)
    }

    private var gap: Int? {
        guard let pair = block.balance, pair.count == 2 else { return nil }
        return total(pair[0]) - total(pair[1])
    }

    private var note: String? {
        let lines = Set(errors.compactMap(\.row)).count
        let fix = lines > 0 ? "fix \(lines == 1 ? "1 line" : "\(lines) lines")" : errors.isEmpty ? nil : "fix the error"
        let why = [fix, gap.map { $0 == 0 ? nil : "balance the entry" } ?? nil].compactMap { $0 }
        return why.isEmpty ? nil : why.joined(separator: " and ")
    }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 10) {
            if rows.isEmpty { Text(block.empty ?? "no lines yet").ui(13, .regular, look).foregroundStyle(palette.mute) }
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in line(index, row) }
            ForEach(Array(errors.filter { $0.row == nil }.enumerated()), id: \.offset) { _, e in
                Text(e.message).ui(11, .semibold, look).foregroundStyle(palette.red)
            }
            if let add = block.add {
                Button(add) { append() }.buttonStyle(.plain).ui(14, .regular, look).foregroundStyle(palette.link)
                    .disabled(block.max.map { rows.count >= Int($0) } == true)
            }
            if !sums.isEmpty { totals }
            if let gap, let pair = block.balance { balance(gap, pair) }
            if let submit = block.submit { post(submit) }
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).surface(look)
        .task(id: draft) { await check() }
    }

    private func line(_ index: Int, _ row: LineItem) -> some View {
        let palette = look.palette
        let n = index + 1
        let mine = errors.filter { $0.row == row.id }
        let cells = block.columns.filter { !number($0) }, numbers = block.columns.filter(number)
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("line \(n)").ui(11, .semibold, look).foregroundStyle(mine.isEmpty ? palette.mute : palette.red)
                Spacer()
                if block.add != nil {
                    Button { draft = rows.filter { $0.id != row.id } } label: { Image(systemName: "xmark") }
                        .buttonStyle(.plain).foregroundStyle(palette.mute).accessibilityLabel("remove line \(n)")
                        .disabled(block.min.map { rows.count <= Int($0) } == true)
                }
            }
            ForEach(cells, id: \.kind.name) { c in cell(row, c, n, bad: mine.contains { $0.name == c.kind.name }) }
            ForEach(Array(stride(from: 0, to: numbers.count, by: 2)), id: \.self) { i in
                HStack(spacing: 10) {
                    ForEach(numbers[i..<min(i + 2, numbers.count)], id: \.kind.name) { c in
                        cell(row, c, n, bad: mine.contains { $0.name == c.kind.name })
                    }
                }
            }
            ForEach(Array(mine.enumerated()), id: \.offset) { _, e in
                Text(e.message).ui(11, .semibold, look).foregroundStyle(palette.red)
            }
        }
        .padding(.leading, 8)
        .overlay(alignment: .leading) { if !mine.isEmpty { Rectangle().fill(palette.red).frame(width: 3) } }
        .accessibilityElement(children: .contain).accessibilityLabel("line \(n)")
    }

    private func cell(_ row: LineItem, _ c: Field, _ n: Int, bad: Bool) -> some View {
        let palette = look.palette
        let name = "\(c.kind.label ?? c.kind.name), line \(n)"
        let key = "\(row.id)/\(c.kind.name)"
        let shown = text(value(row, c)) ?? ""
        let edit = Binding { shown } set: { new in set(row.id, c.kind.name, new) }
        return VStack(alignment: number(c) ? .trailing : .leading, spacing: 2) {
            Text(c.kind.label ?? c.kind.name).ui(11, .regular, look).foregroundStyle(palette.mute).accessibilityHidden(true)
            Group {
                if fixed(c) {
                    let m = sums.contains(c) ? Minor.parse(shown, scale: scale) : nil
                    Text(m.map { Minor.money($0, scale: scale) } ?? (shown.isEmpty ? "—" : shown))
                } else if case .pick(let options) = c.kind.edit {
                    Picker(name, selection: edit) {
                        Text("").tag("")
                        ForEach(options, id: \.self) { Text($0).tag($0) }
                    }
                    .labelsHidden().focused($focus, equals: key)
                } else {
                    SwiftUI.TextField(name, text: edit).textFieldStyle(.plain).focused($focus, equals: key)
                        .multilineTextAlignment(number(c) ? .trailing : .leading)
                        .padding(.horizontal, 8).frame(minWidth: 0, maxWidth: .infinity, minHeight: 32)
                        .background(palette.background)
                        .overlay(Rectangle().strokeBorder(bad ? palette.red : palette.edge, lineWidth: bad ? 2 : 1))
                }
            }
            .ui(14, .regular, look).monospacedDigit().accessibilityLabel(name)
        }
        .frame(maxWidth: .infinity, alignment: number(c) ? .trailing : .leading)
    }

    private var totals: some View {
        VStack(spacing: 4) {
            Rectangle().fill(look.palette.edge).frame(height: 1)
            ForEach(sums, id: \.kind.name) { c in
                HStack {
                    Text(c.kind.label ?? c.kind.name)
                    Spacer()
                    Text(Minor.money(total(c.kind.name), scale: scale)).monospacedDigit()
                }
                .ui(14, .bold, look).accessibilityElement(children: .combine)
            }
        }
    }

    private func balance(_ gap: Int, _ pair: [String]) -> some View {
        let (d, c) = (label(pair[0]).lowercased(), label(pair[1]).lowercased())
        let short = "\(gap > 0 ? c : d) short by \(Minor.money(abs(gap), scale: scale))"
        let say = gap == 0 ? "balanced · \(d) = \(c)" : "out of balance · \(short)"
        let tint = gap == 0 ? look.palette.green : look.palette.red
        return HStack(spacing: 8) {
            Rectangle().fill(tint).frame(width: 8, height: 8)
            Text(say).ui(13, .semibold, look).foregroundStyle(tint)
        }
        .accessibilityElement(children: .combine).accessibilityAddTraits(.updatesFrequently)
        .onChange(of: say) { AccessibilityNotification.Announcement(say).post() }
    }

    private func post(_ submit: Submit) -> some View {
        let source = Source(action: submit.action, values: submit.values)
        return HStack(spacing: 10) {
            if let note {
                Text("\(note) to \(submit.label)").ui(12, .regular, look).foregroundStyle(look.palette.mute)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Spacer(minLength: 0)
            ActButton(source: source, values: [block.name: sent]) {
                CardButton(title: submit.label, primary: true)
            }
            .frame(maxWidth: 200).disabled(note != nil || submit.off == true)
        }
    }

    private var sent: JSONValue { (try? JSONValue(rows)) ?? .array([]) }

    private func set(_ id: String, _ name: String, _ new: String) {
        draft = rows.map { row in
            var row = row
            if row.id == id { row.values[name] = .string(new) }
            return row
        }
    }

    private func append() {
        made += 1
        let id = "new-\(made)"
        let new = try? JSONValue.object(["id": .string(id), "values": .object([:])]).decode(LineItem.self)
        draft = rows + (new.map { [$0] } ?? [])
        focus = block.columns.first { !fixed($0) }.map { "\(id)/\($0.kind.name)" }
    }

    private func check() async {
        guard let draft, draft != block.items, let action = block.action else { return }
        try? await Task.sleep(for: .milliseconds(400))
        guard !Task.isCancelled else { return }
        act(BlockAction(action: action, values: [block.name: sent]))
    }
}
