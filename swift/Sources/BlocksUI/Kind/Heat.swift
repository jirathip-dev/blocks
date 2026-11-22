import Blocks
import SwiftUI

/// What a `heat` block reads, as the crate's static writer and the HTML renderer read it.
internal struct HeatModel {
    internal let heat: Blocks.Heat

    internal var thai: Bool { heat.lang == "th" }
    internal var values: [Double] { heat.grid.flatMap { $0.cells.compactMap(\.value) } }
    internal var drawn: Bool { heat.grid.contains { $0.cells.contains { $0.value != nil || $0.label != nil } } }
    internal var noData: String { thai ? "ไม่มีข้อมูล" : "No data" }

    internal static func num(_ x: Double) -> String {
        let r = (x * 100).rounded() / 100 + 0
        return r == r.rounded() && abs(r) < 1e15 ? String(Int(r)) : String(r)
    }

    internal var unit: String {
        guard let u = heat.scale?.unit else { return "" }
        return u == "%" ? u : " " + u
    }

    internal var range: (min: Double, max: Double) {
        let vs = values
        let lo = vs.min() ?? 0, hi = vs.max() ?? 0
        let min = heat.scale?.min ?? Swift.min(lo, 0)
        if let max = heat.scale?.max { return (min, max) }
        let raw = (hi - min) / 5
        guard !vs.isEmpty, raw > 0 else { return (min, min + 1) }
        let p = pow(10, (log10(raw)).rounded(.down))
        return (min, min + 5 * (raw / p).rounded(.up) * p)
    }

    internal func step(_ v: Double) -> Int {
        let (min, max) = range
        guard max > min else { return 3 }
        let at = (v - min) / (max - min) * 5
        return (1...4).reduce(1) { at >= Double($1) ? $1 + 1 : $0 }
    }

    internal func cell(_ r: Int, _ c: Int) -> HeatCell {
        heat.grid.indices.contains(r) && heat.grid[r].cells.indices.contains(c) ? heat.grid[r].cells[c] : HeatCell()
    }

    internal func said(_ r: Int, _ c: Int) -> String {
        let x = cell(r, c)
        let v = x.value.map { Self.num($0) + unit } ?? (thai ? "ไม่มีข้อมูล" : "no data")
        return "\(heat.grid[r].name), \(heat.columns[c]): \(v)" + (x.label.map { ", " + $0 } ?? "")
    }

    internal var peak: (Int, Int)? {
        var out: (Int, Int, Double)?
        for (r, row) in heat.grid.enumerated() {
            for (c, x) in row.cells.enumerated() where c < heat.columns.count {
                if let v = x.value, out.map({ v > $0.2 }) ?? true { out = (r, c, v) }
            }
        }
        return out.map { ($0.0, $0.1) }
    }

    internal func at(_ pick: HeatPick?) -> (Int, Int)? {
        guard let pick, let r = heat.grid.firstIndex(where: { $0.name == pick.row }),
            let c = heat.columns.firstIndex(of: pick.column)
        else { return nil }
        return (r, c)
    }

    internal var edges: [String] {
        let (min, max) = range, vs = values
        let under = heat.scale?.min != nil && vs.contains { $0 < min }
        let over = heat.scale?.max != nil && vs.contains { $0 > max }
        return (0...5).compactMap { i in
            if heat.edges == .ends, i > 0, i < 5 { return nil }
            let mark = i == 0 && under ? "≤" : i == 5 && over ? "≥" : ""
            return mark + Self.num(min + (max - min) * Double(i) / 5)
        }
    }

    internal var gaps: Bool {
        heat.grid.contains { $0.cells.count < heat.columns.count || $0.cells.contains { $0.value == nil } }
    }

    internal func tone(_ p: Palette) -> Color {
        switch heat.tone {
        case .ok: p.green
        case .warn: p.amber
        case .bad: p.red
        case .accent: p.purple
        case .mute: p.mute
        default: p.cyan
        }
    }
}

internal struct HeatBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var picked: HeatPick?
    @State private var hover: (Int, Int)?
    @State private var width: CGFloat = 390
    internal let block: Blocks.Heat

    private var seam: CGFloat { Token.s2 / 4 }

    internal var body: some View {
        let m = HeatModel(heat: block), p = look.palette
        VStack(alignment: .leading, spacing: Token.s2) {
            Text(block.title).ui(Token.fs, .semibold, look).foregroundStyle(p.foreground)
                .fixedSize(horizontal: false, vertical: true)
            readout(m)
            if m.drawn {
                grid(m)
                legend(m)
            } else {
                Text(block.empty ?? "No data yet").ui(Token.fs, .regular, look).foregroundStyle(p.mute)
                    .frame(maxWidth: .infinity, minHeight: 44 * 3).overlay(Rectangle().strokeBorder(p.line, lineWidth: 1))
            }
        }
        .padding(Token.s2 + Scale.pad).frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: Token.s4)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }

    private func readout(_ m: HeatModel) -> some View {
        let p = look.palette, sel = m.at(picked ?? block.selected)
        let at = hover ?? sel ?? m.peak
        return HStack(alignment: .firstTextBaseline, spacing: Token.s2) {
            if let (r, c) = at, block.grid.indices.contains(r), block.columns.indices.contains(c) {
                let x = m.cell(r, c), n = x.value.map(HeatModel.num)
                if hover == nil, sel == nil { Text(m.thai ? "สูงสุด" : "Peak").foregroundStyle(p.mute) }
                Text("\(block.grid[r].name) · \(block.columns[c])").fontWeight(.semibold)
                Text(n.map { $0 + m.unit } ?? "—").fontWeight(.semibold).monospacedDigit()
                if let l = x.label, l != n, l != n.map({ $0 + m.unit }) { Text(l).foregroundStyle(p.mute) }
            }
        }
        .ui(Token.meta, .regular, look).foregroundStyle(p.foreground).frame(minHeight: Token.s4)
    }

    private func grid(_ m: HeatModel) -> some View {
        let p = look.palette, n = CGFloat(max(block.columns.count, 1))
        let head: CGFloat = width < 520 ? 44 + Token.s2 + Scale.pad : Scale.strip
        let side = min(44, max(Scale.avatar, (width - head - 2 * (Token.s2 + Scale.pad)) / n - seam))
        let sel = m.at(picked ?? block.selected)
        return HStack(alignment: .top, spacing: seam) {
            VStack(alignment: .leading, spacing: seam) {
                Text(" ").ui(Token.meta, .regular, look)
                ForEach(Array(block.grid.enumerated()), id: \.offset) { _, row in
                    Text(row.name).ui(Token.meta, .regular, look).foregroundStyle(p.mute).lineLimit(1)
                        .truncationMode(.tail).frame(width: head - Token.s2, height: 44, alignment: .leading)
                }
            }
            ScrollView(.horizontal) {
                Grid(horizontalSpacing: seam, verticalSpacing: seam) {
                    GridRow {
                        ForEach(Array(block.columns.enumerated()), id: \.offset) { _, c in
                            Text(c).ui(Token.meta, .regular, look).foregroundStyle(p.mute).lineLimit(1).frame(width: side)
                        }
                    }
                    ForEach(Array(block.grid.enumerated()), id: \.offset) { r, _ in
                        GridRow {
                            ForEach(Array(block.columns.enumerated()), id: \.offset) { c, _ in
                                cell(m, r, c, on: sel.map { $0 == (r, c) } ?? false).frame(width: side, height: 44)
                            }
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }

    @ViewBuilder
    private func cell(_ m: HeatModel, _ r: Int, _ c: Int, on: Bool) -> some View {
        let p = look.palette, x = m.cell(r, c), step = x.value.map(m.step)
        let ink = (step ?? 0) >= 4 ? p.card : x.value == nil ? p.mute : p.foreground
        let face = ZStack {
            HeatFill(step: step, tone: m.tone(p))
            Text(x.label ?? (x.value == nil ? "–" : "")).ui(Token.meta, .regular, look).foregroundStyle(ink)
                .lineLimit(1).truncationMode(.tail).padding(.horizontal, Scale.pad)
            if on {
                Rectangle().strokeBorder(p.card, lineWidth: seam * 2)
                Rectangle().strokeBorder(p.foreground, lineWidth: seam)
            }
        }
        if let tap = block.tap, let action = tap.action, tap.url == nil, tap.open == nil, tap.sheet == nil {
            Button {
                picked = HeatPick(column: block.columns[c], row: block.grid[r].name)
                let at: [String: JSONValue] = ["row": .string(block.grid[r].name), "column": .string(block.columns[c])]
                act(BlockAction(action: action, block: block.id, values: (tap.values ?? [:]).merging(at) { $1 }))
            } label: {
                face.contentShape(Rectangle())
            }
            .buttonStyle(.plain).accessibilityLabel(m.said(r, c)).accessibilityAddTraits(on ? .isSelected : [])
            .onHover { hover = $0 ? (r, c) : nil }
        } else {
            face.accessibilityElement().accessibilityLabel(m.said(r, c))
        }
    }

    private func legend(_ m: HeatModel) -> some View {
        let p = look.palette, (min, max) = m.range
        let ramp = VStack(alignment: .leading, spacing: seam) {
            HStack(spacing: seam) {
                ForEach(1...5, id: \.self) { s in HeatFill(step: s, tone: m.tone(p)).frame(width: 44, height: Scale.meta) }
            }
            HStack(spacing: 0) {
                ForEach(Array(m.edges.enumerated()), id: \.offset) { i, e in
                    if i > 0 { Spacer(minLength: Scale.pad) }
                    Text(e).monospacedDigit()
                }
            }
            .frame(width: 44 * 5 + seam * 4)
        }
        let none = HStack(spacing: Scale.pad) {
            HeatFill(step: nil, tone: m.tone(p)).frame(width: Token.s4 + Scale.pad, height: Scale.meta)
            Text(m.noData)
        }
        let unit = block.scale?.unit.map { Text($0).fontWeight(.semibold).foregroundStyle(p.foreground) }
        return ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: Token.s4) {
                unit
                ramp
                if m.gaps { none }
            }
            VStack(alignment: .leading, spacing: Token.s2) {
                HStack(alignment: .top, spacing: Token.s4) {
                    unit
                    ramp
                }
                if m.gaps { none }
            }
        }
        .ui(Token.meta, .regular, look).foregroundStyle(p.mute).padding(.top, Scale.pad)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Scale \(HeatModel.num(min)) to \(HeatModel.num(max))" + (block.scale?.unit.map { " " + $0 } ?? ""))
    }
}

private struct HeatFill: View {
    @Environment(\.look) private var look
    let step: Int?
    let tone: Color

    var body: some View {
        let p = look.palette
        switch step {
        case .some(1): p.card.overlay(tone.opacity(0.18))
        case .some(2): p.card.overlay(tone.opacity(0.38))
        case .some(3): p.card.overlay(tone.opacity(0.58))
        case .some(4): tone
        case .some: tone.overlay(p.foreground.opacity(0.55))
        case .none:
            Canvas { g, size in
                var path = Path()
                for x in stride(from: -size.height, to: size.width, by: Token.s2) {
                    path.move(to: CGPoint(x: x, y: size.height))
                    path.addLine(to: CGPoint(x: x + size.height, y: 0))
                }
                g.stroke(path, with: .color(p.line), lineWidth: 1)
            }
            .overlay(Rectangle().strokeBorder(p.line, lineWidth: 1))
        }
    }
}
