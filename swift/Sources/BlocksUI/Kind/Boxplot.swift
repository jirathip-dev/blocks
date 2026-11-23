import Blocks
import SwiftUI

/// What a `boxplot` block reads, as the crate's static writer and the HTML renderer read it.
internal struct BoxplotModel {
    internal let plot: Blocks.Boxplot

    private static func close(_ v: Double) -> Bool { abs(v - v.rounded()) < 1e-6 }
    private static func decimals(_ v: Double) -> Int { [0, 1].first { close(v * pow(10, Double($0))) } ?? 2 }
    private static func values(_ b: PlotBox) -> [Double] { [b.min, b.q1, b.median, b.q3, b.max] + (b.outliers ?? []) }

    internal var places: Int { plot.boxes.flatMap(Self.values).map(Self.decimals).max() ?? 0 }
    internal var picked: Int? { plot.boxes.firstIndex { $0.name == plot.selected } }
    internal var unit: String { plot.unit.map { " \($0)" } ?? "" }

    internal func shown(_ v: Double) -> String { String(format: "%.\(places)f", v) }

    internal var axis: (lo: Double, hi: Double, step: Double)? {
        let all = plot.boxes.flatMap { [$0.min, $0.max] + ($0.outliers ?? []) }
        guard let lo = all.min(), let hi = all.max() else { return nil }
        let raw = hi > lo ? (hi - lo) / 4 : 0.25, p = pow(10, (log10(raw)).rounded(.down))
        let step = p * ([1, 2, 2.5, 5].first { raw / p <= $0 } ?? 10)
        var bottom = (lo / step).rounded(.down) * step, top = (hi / step).rounded(.up) * step
        if Self.close((top - hi) / step) { top += step }
        if Self.close((bottom - lo) / step), lo > 0 { bottom -= step }
        return (bottom, top, step)
    }

    internal var ticks: [(Double, String)] {
        guard let (lo, hi, step) = axis else { return [] }
        let d = Self.decimals(step)
        return stride(from: lo, through: hi + step / 2, by: step).map { ($0, String(format: "%.\(d)f", $0)) }
    }

    internal func says(_ b: PlotBox) -> String {
        let o = b.outliers ?? []
        let more = o.isEmpty ? "" : ", \(o.count) outlier\(o.count > 1 ? "s" : ""): " + o.map(shown).joined(separator: ", ")
        return "\(b.name): median \(shown(b.median))\(unit), quartiles \(shown(b.q1)) to \(shown(b.q3)), range \(shown(b.min)) to \(shown(b.max))\(more)"
    }

    internal func colour(_ tone: Tone?, _ p: Palette) -> Color {
        switch tone {
        case .ok: p.green
        case .warn: p.amber
        case .bad: p.red
        case .info: p.cyan
        case .accent: p.purple
        case .mute: p.mute
        default: p.lead
        }
    }
}

internal struct BoxplotBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var picked: String?
    @State private var width: CGFloat = 390
    internal let block: Blocks.Boxplot

    private var model: BoxplotModel {
        var b = block
        b.selected = picked ?? block.selected
        return BoxplotModel(plot: b)
    }

    internal var body: some View {
        let m = model
        VStack(alignment: .leading, spacing: Token.s2) {
            Text(block.title).ui(Token.fs, .semibold, look).foregroundStyle(look.palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
            BoxplotReadout(model: m)
            Text(block.axis + (block.unit.map { " (\($0))" } ?? "")).ui(Token.meta, .regular, look).foregroundStyle(look.palette.mute)
            BoxplotPlot(model: m, width: width, pick: pick)
            BoxplotTable(model: m)
        }
        .padding(Token.s2 * 1.5).frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: Token.s4)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }

    private func pick(_ x: String) {
        picked = x
        guard let tap = block.tap, let action = tap.action, tap.url == nil, tap.open == nil, tap.sheet == nil else { return }
        act(BlockAction(action: action, values: (tap.values ?? [:]).merging(["x": .string(x)]) { $1 }))
    }
}

private struct BoxplotReadout: View {
    @Environment(\.look) private var look
    let model: BoxplotModel

    var body: some View {
        let p = look.palette
        let items: [(String, String)] = model.picked.map { i in
            let b = model.plot.boxes[i], s = model.shown
            let o = (b.outliers ?? []).map(s).joined(separator: ", ")
            return [("median", s(b.median) + model.unit), ("Q1–Q3", "\(s(b.q1)) – \(s(b.q3))"), ("min–max", "\(s(b.min)) – \(s(b.max))")]
                + (o.isEmpty ? [] : [("outliers", o)])
        } ?? [("min to max", ""), ("Q1 to Q3", ""), ("median", ""), ("outlier", "")]
        let row = ForEach(Array(items.enumerated()), id: \.offset) { _, it in
            HStack(spacing: Token.s2 / 2) {
                Text(it.0).foregroundStyle(p.mute)
                if !it.1.isEmpty { Text(it.1).fontWeight(.semibold) }
            }
        }
        let head = model.picked.map { i in
            HStack(spacing: Token.s2 / 2) {
                Rectangle().fill(model.colour(model.plot.boxes[i].tone, p)).frame(width: Token.s2, height: Token.s2)
                Text(model.plot.boxes[i].name).fontWeight(.semibold)
            }
        }
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Token.s4) {
                head
                row
            }
            VStack(alignment: .leading, spacing: Token.s2 / 2) {
                head
                row
            }
        }
        .ui(Token.meta, .regular, look).foregroundStyle(p.foreground)
    }
}

private struct BoxplotPlot: View {
    @Environment(\.look) private var look
    let model: BoxplotModel
    let width: CGFloat
    let pick: (String) -> Void

    var body: some View {
        let boxes = model.plot.boxes, n = boxes.count
        let height: CGFloat = width < 520 ? 150 : 180
        let every = max(1, Int((Double(n) / (width < 700 ? 8 : 12)).rounded(.up)))
        let span = max(0, width - Token.s4 * 4) / CGFloat(max(n, 1)) * CGFloat(every)
        HStack(alignment: .top, spacing: Token.s2) {
            ZStack(alignment: .trailing) {
                ForEach(Array(model.ticks.enumerated()), id: \.offset) { _, t in
                    Text(t.1).position(x: Token.s4, y: offset(t.0, height))
                }
            }
            .ui(Token.meta, .regular, look).foregroundStyle(look.palette.mute).frame(width: Token.s4 * 2, height: height)
            VStack(spacing: Token.s2 / 2) {
                marks.frame(height: height).overlay { columns }
                HStack(spacing: 0) {
                    ForEach(Array(boxes.enumerated()), id: \.offset) { i, b in
                        Text(" ").frame(maxWidth: .infinity).overlay {
                            Text(i % every == 0 ? b.name : "").lineLimit(1).truncationMode(.tail)
                                .fontWeight(model.picked == i ? .semibold : .regular).frame(width: span)
                        }
                    }
                }
                .ui(Token.meta, .regular, look).foregroundStyle(look.palette.mute)
            }
        }
    }

    private func offset(_ v: Double, _ height: CGFloat) -> CGFloat {
        guard let (lo, hi, _) = model.axis else { return 0 }
        return height * (1 - CGFloat((v - lo) / (hi - lo)))
    }

    @ViewBuilder private var columns: some View {
        if model.plot.boxes.isEmpty {
            Text(model.plot.empty ?? "No data yet").ui(Token.fs, .regular, look).foregroundStyle(look.palette.mute)
        } else {
            HStack(spacing: 0) {
                ForEach(Array(model.plot.boxes.enumerated()), id: \.offset) { i, b in
                    Color.clear.contentShape(Rectangle()).onTapGesture { pick(b.name) }
                        .accessibilityElement().accessibilityLabel(model.says(b))
                        .accessibilityAddTraits(model.picked == i ? [.isButton, .isSelected] : .isButton)
                }
            }
        }
    }

    private var marks: some View {
        let p = look.palette
        return Canvas { ctx, size in
            guard let (lo, hi, _) = model.axis else { return }
            let boxes = model.plot.boxes, col = size.width / CGFloat(max(boxes.count, 1))
            let y = { (v: Double) in size.height * (1 - CGFloat((v - lo) / (hi - lo))) }
            let w = min(Token.s4 * 3, max(Token.s2 * 0.75, col * 0.56))
            let line = { (a: CGPoint, b: CGPoint) in Path { $0.addLines([a, b]) } }
            for (v, _) in model.ticks {
                ctx.stroke(line(CGPoint(x: 0, y: y(v)), CGPoint(x: size.width, y: y(v))), with: .color(v == lo ? p.edge : p.line))
            }
            if let i = model.picked {
                let band = min(col, 2 * w + Token.s4)
                ctx.fill(Path(CGRect(x: (CGFloat(i) + 0.5) * col - band / 2, y: 0, width: band, height: size.height)), with: .color(p.line))
            }
            for (i, b) in boxes.enumerated() {
                let x = (CGFloat(i) + 0.5) * col, k = model.colour(b.tone, p)
                ctx.stroke(line(CGPoint(x: x, y: y(b.max)), CGPoint(x: x, y: y(b.min))), with: .color(k))
                for (end, edge) in [(b.max, b.q3), (b.min, b.q1)] where end != edge {
                    ctx.stroke(line(CGPoint(x: x - w / 4, y: y(end)), CGPoint(x: x + w / 4, y: y(end))), with: .color(k))
                }
                let q = CGRect(x: x - w / 2, y: y(b.q3), width: w, height: y(b.q1) - y(b.q3))
                ctx.fill(Path(q), with: .color(p.card))
                ctx.fill(Path(q), with: .color(k.opacity(0.18)))
                ctx.stroke(Path(q.insetBy(dx: 1, dy: 1)), with: .color(k), lineWidth: Token.rule - 1)
                ctx.stroke(line(CGPoint(x: x - w / 2, y: y(b.median)), CGPoint(x: x + w / 2, y: y(b.median))), with: .color(k), lineWidth: Token.rule)
                for o in b.outliers ?? [] {
                    let r = CGRect(x: x - Token.s2 / 2, y: y(o) - Token.s2 / 2, width: Token.s2 - 1, height: Token.s2 - 1)
                    ctx.fill(Path(r), with: .color(p.card))
                    ctx.stroke(Path(r), with: .color(k), lineWidth: Token.rule / 2)
                }
            }
        }
    }
}

private struct BoxplotTable: View {
    @Environment(\.look) private var look
    let model: BoxplotModel

    var body: some View {
        let s = model.shown
        let head = ["", "Min", "Q1", "Median", "Q3", "Max", "Outliers"]
        let rows = model.plot.boxes.map { b in
            [b.name] + [b.min, b.q1, b.median, b.q3, b.max].map(s) + [(b.outliers ?? []).isEmpty ? "—" : (b.outliers ?? []).map(s).joined(separator: ", ")]
        }
        DisclosureGroup("Table") {
            Grid(alignment: .trailing, horizontalSpacing: Token.s2, verticalSpacing: Token.rule - 1) {
                ForEach(Array(([head] + rows).enumerated()), id: \.offset) { r, row in
                    GridRow {
                        ForEach(Array(row.enumerated()), id: \.offset) { i, cell in
                            Text(cell).foregroundStyle(r == 0 ? look.palette.mute : look.palette.foreground)
                                .gridColumnAlignment(i == 0 || i == 6 ? .leading : .trailing)
                        }
                    }
                }
            }
        }
        .ui(Token.meta, .regular, look).foregroundStyle(look.palette.mute)
    }
}
