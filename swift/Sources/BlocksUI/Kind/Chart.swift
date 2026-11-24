import Blocks
import SwiftUI

/// What a `chart` block reads, as the crate's static writer and the HTML renderer read it.
internal struct ChartModel {
    internal struct Slice: Equatable {
        internal let name: String
        internal let value: Double
        internal var tone: Tone?
    }

    private static let en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    private static let th = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

    internal let chart: Blocks.Chart
    internal let scale: (lo: Double, hi: Double)
    internal let preview: PointMove?

    internal init(chart: Blocks.Chart, preview: PointMove? = nil) {
        var c = chart
        if let p = preview, let si = c.series.firstIndex(where: { $0.name == p.series }), let i = c.x.firstIndex(of: p.at),
            c.series[si].values.indices.contains(i)
        {
            c.series[si].values[i] = p.y
            c.selected = p.at
        }
        (self.chart, scale, self.preview) = (c, chart.axis, preview)
    }

    internal var thai: Bool { chart.lang == "th" }
    internal var empty: Bool { chart.x.isEmpty || chart.series.allSatisfy(\.values.isEmpty) }
    internal var picked: Int? { empty ? nil : chart.x.firstIndex { $0 == chart.selected } }
    internal var readout: Int? { empty ? nil : picked ?? max(0, chart.x.count - 1) }

    internal func at(_ s: Series, _ i: Int) -> Double? { s.values.indices.contains(i) ? s.values[i] : nil }

    private static func group(_ v: Double, tenths: Bool) -> String {
        let scaled = (v * (tenths ? 10 : 1)).rounded()
        let whole = tenths ? (scaled / 10).rounded(.towardZero) : scaled
        let digits = String(format: "%.0f", whole)
        var out = ""
        for (i, c) in digits.enumerated() {
            if i > 0, (digits.count - i) % 3 == 0 { out.append(",") }
            out.append(c)
        }
        let tenth = scaled - whole * 10
        return tenths && tenth > 0 ? out + String(format: ".%.0f", tenth) : out
    }

    internal func value(_ v: Double?) -> String {
        guard let v else { return "—" }
        let a = abs(v)
        let body =
            switch chart.format {
            case .thb: "฿" + Self.group(a, tenths: false)
            case .thbM where a >= 1e6: "฿" + Self.group(a / 1e6, tenths: true) + "M"
            case .thbM where a >= 1e3: "฿" + Self.group(a / 1e3, tenths: false) + "K"
            case .thbM: "฿" + Self.group(a, tenths: false)
            case .percent: Self.group(a, tenths: true) + "%"
            default: Self.group(a, tenths: false)
            }
        return (v < 0 ? "-" : "") + body
    }

    internal func label(_ x: String, long: Bool) -> String {
        guard let m = x.wholeMatch(of: #/(\d{4})-(\d{2})/#), let year = Int(m.1), let month = Int(m.2),
            (1...12).contains(month)
        else { return x }
        let y = year + (chart.era == .be ? 543 : 0)
        return "\((thai ? Self.th : Self.en)[month - 1]) " + (long ? "\(y)" : String(format: "%02d", y % 100))
    }

    internal var slices: [Slice] {
        let s = chart.series.first
        let parts = chart.x.enumerated().map { i, x in Slice(name: x, value: s.flatMap { at($0, i) } ?? 0) }
            .enumerated().sorted { $0.1.value != $1.1.value ? $0.1.value > $1.1.value : $0.0 < $1.0 }.map(\.1)
        guard parts.count > 5 else { return parts }
        let rest = parts.dropFirst(4)
        let other = Slice(
            name: "\(thai ? "อื่นๆ" : "Other") (\(rest.count))", value: rest.map(\.value).reduce(0, +), tone: .mute)
        return Array(parts.prefix(4)) + [other]
    }

    internal static func colour(_ tone: Tone?, _ i: Int, _ p: Palette) -> Color {
        switch tone {
        case .ok: p.green
        case .warn: p.amber
        case .bad: p.red
        case .info: p.cyan
        case .accent: p.purple
        case .mute: p.mute
        default: [p.lead, p.cyan, p.amber, p.purple, p.green][i % 5]
        }
    }
}

internal struct ChartBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var picked: String?
    @State private var width: CGFloat = 390
    @State private var preview: PointMove?
    internal let block: Blocks.Chart

    private var model: ChartModel {
        var c = block
        c.selected = picked ?? block.selected
        return ChartModel(chart: c, preview: preview)
    }

    internal var body: some View {
        let m = model
        VStack(alignment: .leading, spacing: 8) {
            Text(block.title).ui(13, .semibold, look).foregroundStyle(look.palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
            if block.chart == .donut { ChartDonut(model: m, pick: pick) } else {
                ChartPlot(model: m, width: width, pick: pick, points: ChartPoints(block: block, model: m) { preview = $0 })
            }
            ChartTable(model: m)
        }
        .padding(12).frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: 16)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }

    private func pick(_ x: String) {
        picked = x
        guard let tap = block.tap, let action = tap.action, tap.url == nil, tap.open == nil, tap.sheet == nil else { return }
        act(BlockAction(action: action, values: (tap.values ?? [:]).merging(["x": .string(x)]) { $1 }))
    }
}

private struct ChartLegend: View {
    @Environment(\.look) private var look
    let model: ChartModel

    var body: some View {
        let c = model.chart
        let items = ForEach(Array(c.series.enumerated()), id: \.offset) { i, s in
            HStack(spacing: 4) {
                Rectangle().fill(ChartModel.colour(s.tone, i, look.palette))
                    .frame(width: model.chart.isLine(s) ? 12 : 8, height: model.chart.isLine(s) ? 2 : 8)
                Text(s.name).foregroundStyle(look.palette.mute)
                if let p = model.preview, p.series == s.name {
                    Text(c.shown(s, p.y)).fontWeight(.semibold)
                } else if let at = model.readout {
                    Text(model.value(model.at(s, at))).fontWeight(.semibold)
                }
            }
        }
        let head = model.readout.map { Text(model.label(c.x[$0], long: true)).fontWeight(.semibold) }
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 16) {
                head
                items
            }
            VStack(alignment: .leading, spacing: 4) {
                head
                items
            }
        }
        .ui(11, .regular, look).foregroundStyle(look.palette.foreground)
    }
}

private struct ChartPlot: View {
    @Environment(\.look) private var look
    let model: ChartModel
    let width: CGFloat
    let pick: (String) -> Void
    let points: ChartPoints

    var body: some View {
        let c = model.chart, n = c.x.count, (lo, hi) = model.scale
        let height: CGFloat = width < 520 ? 150 : 180
        let every = max(1, Int((Double(n) / (width < 700 ? 6 : 12)).rounded(.up)))
        let span = max(0, width - 76) / CGFloat(max(n, 1)) * CGFloat(every)
        VStack(alignment: .leading, spacing: 4) {
            ChartLegend(model: model)
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .trailing) {
                    Text(model.empty ? "" : model.value(hi))
                    Spacer()
                    Text(model.empty ? "" : model.value((lo + hi) / 2))
                    Spacer()
                    Text(model.empty ? "" : model.value(lo))
                }
                .ui(11, .regular, look).foregroundStyle(look.palette.mute).frame(width: 44, height: height)
                VStack(spacing: 4) {
                    marks.frame(height: height).overlay { columns }.overlay { points }
                    HStack(spacing: 0) {
                        ForEach(Array(c.x.enumerated()), id: \.offset) { i, x in
                            Text(" ").frame(maxWidth: .infinity).overlay {
                                Text(i % every == 0 ? model.label(x, long: false) : "").lineLimit(1)
                                    .fontWeight(model.picked == i ? .semibold : .regular).frame(width: span)
                            }
                        }
                    }
                    .ui(11, .regular, look).foregroundStyle(look.palette.mute)
                }
            }
        }
    }

    @ViewBuilder private var columns: some View {
        let c = model.chart
        if model.empty {
            Text(c.empty ?? "No data yet").ui(13, .regular, look).foregroundStyle(look.palette.mute)
        } else {
            HStack(spacing: 0) {
                ForEach(Array(c.x.enumerated()), id: \.offset) { i, x in
                    let vals = c.series.map { "\($0.name) \(model.value(model.at($0, i)))" }.joined(separator: ", ")
                    Color.clear.contentShape(Rectangle()).onTapGesture { pick(x) }
                        .accessibilityElement().accessibilityLabel("\(model.label(x, long: true)): \(vals)")
                        .accessibilityAddTraits(model.picked == i ? [.isButton, .isSelected] : .isButton)
                }
            }
        }
    }

    private var marks: some View {
        let p = look.palette
        return Canvas { ctx, size in
            let c = model.chart, n = CGFloat(max(c.x.count, 1)), (lo, hi) = model.scale
            let col = size.width / n
            let y = { (v: Double) in size.height * (1 - CGFloat((v - lo) / (hi - lo))) }
            if let i = model.picked {
                ctx.fill(Path(CGRect(x: CGFloat(i) * col, y: 0, width: col, height: size.height)), with: .color(p.line))
            }
            for t in [0.5, 1.0] {
                ctx.stroke(Path { $0.addLines([CGPoint(x: 0, y: size.height * (1 - t)), CGPoint(x: size.width, y: size.height * (1 - t))]) }, with: .color(p.line))
            }
            let gap = col * (c.x.count > 16 ? 0.15 : 0.25)
            let bars = c.series.enumerated().filter { !model.chart.isLine($0.1) }
            for i in c.x.indices {
                var base = 0.0
                for (k, (si, s)) in bars.enumerated() {
                    guard let v = model.at(s, i) else { continue }
                    let colour = GraphicsContext.Shading.color(ChartModel.colour(s.tone, si, p))
                    if c.chart == .bar {
                        let each = (col - 2 * gap) / CGFloat(bars.count)
                        let top = y(max(v, lo))
                        ctx.fill(Path(CGRect(x: CGFloat(i) * col + gap + CGFloat(k) * each, y: top, width: max(each - (bars.count > 1 ? 1 : 0), 1), height: size.height - top)), with: colour)
                    } else if v > 0 {
                        let top = y(base + v), bottom = y(base) - (base > 0 ? 2 : 0)
                        ctx.fill(Path(CGRect(x: CGFloat(i) * col + gap, y: top, width: col - 2 * gap, height: max(0, bottom - top))), with: colour)
                        base += v
                    }
                }
            }
            ctx.stroke(Path { $0.addLines([CGPoint(x: 0, y: size.height), CGPoint(x: size.width, y: size.height)]) }, with: .color(p.edge))
            for (si, s) in c.series.enumerated() where model.chart.isLine(s) {
                let pts = c.x.indices.compactMap { i in model.at(s, i).map { CGPoint(x: (CGFloat(i) + 0.5) * col, y: y($0)) } }
                let colour = ChartModel.colour(s.tone, si, p)
                ctx.stroke(Path { $0.addLines(pts) }, with: .color(colour), style: StrokeStyle(lineWidth: 2, lineJoin: .round, dash: s.dash == true ? [4, 3] : []))
                if let i = model.picked, let v = model.at(s, i) {
                    let dot = CGRect(x: (CGFloat(i) + 0.5) * col - 4, y: y(v) - 4, width: 8, height: 8)
                    ctx.fill(Path(dot.insetBy(dx: -2, dy: -2)), with: .color(p.card))
                    ctx.fill(Path(dot), with: .color(colour))
                }
            }
        }
    }
}

private struct ChartPoints: View {
    @Environment(\.look) private var look
    let block: Blocks.Chart
    let model: ChartModel
    let show: (PointMove?) -> Void

    var body: some View {
        GeometryReader { geo in
            let c = block, (lo, hi) = model.scale, col = geo.size.width / CGFloat(max(c.x.count, 1))
            let y = { (v: Double) in geo.size.height * (1 - CGFloat((v - lo) / (hi - lo))) }
            if let gesture = c.move {
                ForEach(Array(c.series.enumerated()), id: \.offset) { si, s in
                    let px = geo.size.height * CGFloat(c.step(s) / (hi - lo))
                    ForEach(Array(zip(c.x, s.values).enumerated()), id: \.offset) { i, p in
                        let grab = PointGrab(s.name, at: p.0)
                        let now = model.preview.flatMap { $0.series == s.name && $0.at == p.0 ? $0.y : nil } ?? p.1
                        if c.word(grab) != nil {
                            Rectangle().strokeBorder(ChartModel.colour(s.tone, si, look.palette), lineWidth: Token.s2 / 4).background(look.palette.card)
                                .frame(width: Token.s2, height: Token.s2).frame(width: col, height: 44).contentShape(Rectangle())
                                .modifier(
                                    Gestured(
                                        rules: c, grab: grab, gesture: gesture, label: "\(s.name), \(model.label(p.0, long: true)): \(c.shown(s, p.1))",
                                        reach: { PointReach(Int((-$0.translation.height / max(px, 1)).rounded())) },
                                        value: { (try? JSONValue($0)) ?? .null }, show: show)
                                )
                                .position(x: (CGFloat(i) + 0.5) * col, y: y(now))
                        }
                    }
                }
            }
        }
    }
}

private struct ChartDonut: View {
    @Environment(\.look) private var look
    let model: ChartModel
    let pick: (String) -> Void

    var body: some View {
        let parts = model.slices, total = parts.map(\.value).reduce(0, +), p = look.palette
        let share = { (v: Double) in total > 0 ? v / total : 0 }
        let sel = parts.first { $0.name == model.chart.selected }
        let starts = parts.indices.map { i in parts.prefix(i).map { share($0.value) }.reduce(0, +) }
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                ForEach(Array(parts.enumerated()), id: \.offset) { i, s in
                    Circle().trim(from: starts[i], to: max(starts[i], starts[i] + share(s.value) - 0.008))
                        .stroke(ChartModel.colour(s.tone, i, p), lineWidth: sel == s ? 18 : 14).rotationEffect(.degrees(-90))
                }
                VStack(spacing: 2) {
                    Text(model.value(sel?.value ?? total)).ui(17, .semibold, look).foregroundStyle(p.foreground)
                    Text(sel?.name ?? (model.thai ? "รวม" : "Total")).ui(11, .regular, look).foregroundStyle(p.mute)
                }
            }
            .frame(width: 150, height: 150).padding(8).frame(maxWidth: .infinity)
            ForEach(Array(parts.enumerated()), id: \.offset) { i, s in
                let pct = "\(Int((share(s.value) * 100).rounded()))%"
                Button { pick(s.name) } label: {
                    HStack(spacing: 8) {
                        Rectangle().fill(ChartModel.colour(s.tone, i, p)).frame(width: 8, height: 8)
                        Text(s.name).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                        Text(model.value(s.value)).fontWeight(.semibold)
                        Text(pct).foregroundStyle(p.mute).frame(width: 44, alignment: .trailing)
                    }
                    .ui(13, .regular, look).foregroundStyle(p.foreground).frame(minHeight: 32)
                    .overlay(alignment: .leading) { if sel == s { Rectangle().fill(p.lead).frame(width: 3) } }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain).accessibilityLabel("\(s.name): \(model.value(s.value)), \(pct)")
            }
        }
    }
}

private struct ChartTable: View {
    @Environment(\.look) private var look
    let model: ChartModel

    var body: some View {
        let c = model.chart
        let donut = c.chart == .donut, parts = model.slices, total = parts.map(\.value).reduce(0, +)
        let head = donut ? ["", c.series.first?.name ?? "", "%"] : [""] + c.series.map(\.name)
        let rows: [[String]] =
            donut
            ? parts.map { [$0.name, model.value($0.value), "\(Int((total > 0 ? $0.value / total * 100 : 0).rounded()))%"] }
            : c.x.indices.map { i in [model.label(c.x[i], long: true)] + c.series.map { model.value(model.at($0, i)) } }
        DisclosureGroup(model.thai ? "ตาราง" : "Table") {
            Grid(alignment: .trailing, horizontalSpacing: 8, verticalSpacing: 2) {
                ForEach(Array(([head] + rows).enumerated()), id: \.offset) { r, row in
                    GridRow {
                        ForEach(Array(row.enumerated()), id: \.offset) { i, cell in
                            Text(cell).foregroundStyle(r == 0 ? look.palette.mute : look.palette.foreground)
                                .gridColumnAlignment(i == 0 ? .leading : .trailing)
                        }
                    }
                }
            }
        }
        .ui(11, .regular, look).foregroundStyle(look.palette.mute)
    }
}
