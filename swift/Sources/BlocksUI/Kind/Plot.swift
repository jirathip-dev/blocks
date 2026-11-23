import Blocks
import SwiftUI

private enum Size {
    static let tall = Token.s4 * 12.5
    static let short = Token.s4 * 9.375
    static let gutter = Token.s4 * 2
    static let stroke = Token.s2 / 4
    static let dot = Token.s2
    static let key = Token.s2 + Scale.pad
    static let phone = Token.s4 * 32.5
}

internal struct PlotBlock: View {
    @Environment(\.look) private var look
    @State private var width: CGFloat = 390
    internal let block: Blocks.Plot

    internal var body: some View {
        let d = block.drawn, phone = width < Size.phone
        let tall = phone ? Size.short : Size.tall
        VStack(alignment: .leading, spacing: Scale.pad) {
            Text(block.title).ui(Token.fs, .semibold, look).foregroundStyle(look.palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
            PlotLegend(block: block, drawn: d)
            Text(Self.label(block.y)).ui(Scale.count, .regular, look).foregroundStyle(look.palette.mute)
            HStack(alignment: .top, spacing: Token.s2) {
                PlotTicks(drawn: d, across: false, phone: phone).frame(width: Size.gutter, height: tall)
                VStack(alignment: .trailing, spacing: Scale.pad) {
                    PlotMarks(block: block, drawn: d).frame(height: tall).overlay { empty }
                    PlotTicks(drawn: d, across: true, phone: phone).frame(height: Token.s4)
                    if !Self.label(block.x).isEmpty {
                        Text(Self.label(block.x)).ui(Scale.count, .regular, look).foregroundStyle(look.palette.mute)
                    }
                }
            }
        }
        .padding(Token.s2 + Scale.pad).frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: Token.s4)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }

    @ViewBuilder private var empty: some View {
        if block.series.allSatisfy(\.x.isEmpty) {
            Text(block.empty ?? "No data yet").ui(Token.fs, .regular, look).foregroundStyle(look.palette.mute)
                .padding(.horizontal, Scale.pad).background(look.palette.card)
        }
    }

    private static func label(_ a: PlotAxis?) -> String {
        [a?.label ?? "", a?.unit.map { "(\($0))" } ?? ""].filter { !$0.isEmpty }.joined(separator: " ")
    }
}

private struct PlotLegend: View {
    @Environment(\.look) private var look
    let block: Blocks.Plot
    let drawn: PlotDrawn

    var body: some View {
        let p = look.palette
        let items = Group {
            ForEach(Array(block.series.enumerated()), id: \.offset) { i, s in
                HStack(spacing: Scale.pad) {
                    Rectangle().fill(ChartModel.colour(s.tone, i, p)).frame(width: Size.key, height: Size.stroke)
                    Text(s.name).foregroundStyle(p.mute)
                    if let v = drawn.last[safe: i], !v.isEmpty { Text(v).fontWeight(.semibold) }
                }
            }
            if let band = drawn.band {
                HStack(spacing: Scale.pad) {
                    Rectangle().fill(p.green.opacity(0.4)).frame(width: Size.dot, height: Size.dot)
                    Text("Target").foregroundStyle(p.mute)
                    Text(band).fontWeight(.semibold)
                }
            }
            if let peak = block.peak {
                HStack(spacing: Scale.pad) {
                    Rectangle().stroke(p.foreground, style: StrokeStyle(lineWidth: Size.stroke, dash: [Scale.pad, Scale.mark]))
                        .frame(width: Size.key, height: 1)
                    Text(peak.label).fontWeight(.semibold)
                }
            }
        }
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Token.s4) { items }
            VStack(alignment: .leading, spacing: Scale.pad) { items }
        }
        .ui(Scale.count, .regular, look).foregroundStyle(p.foreground)
    }
}

private struct PlotTicks: View {
    @Environment(\.look) private var look
    let drawn: PlotDrawn
    let across: Bool
    let phone: Bool

    var body: some View {
        GeometryReader { g in
            let (lo, hi) = across ? (drawn.x[0], drawn.x[1]) : (drawn.y[0], drawn.y[1])
            ZStack(alignment: .topLeading) {
                ForEach(Array((across ? drawn.xTicks : drawn.yTicks).enumerated()), id: \.offset) { _, t in
                    let f = (t.at - lo) / (hi - lo)
                    let hidden = across && ((f >= 0.001 && f <= 0.999 && (f < 0.04 || f > 0.96)) || (phone && t.odd))
                    if !hidden {
                        Text(t.text).fixedSize()
                            .alignmentGuide(.leading) { d in across ? (f < 0.001 ? 0 : f > 0.999 ? d.width : d.width / 2) : d.width }
                            .alignmentGuide(.top) { d in across ? 0 : d.height / 2 }
                            .offset(x: across ? g.size.width * f : g.size.width, y: across ? 0 : g.size.height * (1 - f))
                    }
                }
            }
        }
        .ui(Scale.count, .regular, look).foregroundStyle(look.palette.mute).monospacedDigit()
    }
}

private struct PlotMarks: View {
    @Environment(\.look) private var look
    let block: Blocks.Plot
    let drawn: PlotDrawn

    var body: some View {
        let p = look.palette, d = drawn, b = block
        Canvas { ctx, size in
            ctx.clip(to: Path(CGRect(origin: .zero, size: size)))
            let xf = { (v: Double) in size.width * (v - d.x[0]) / (d.x[1] - d.x[0]) }
            let yf = { (v: Double) in size.height * (1 - (v - d.y[0]) / (d.y[1] - d.y[0])) }
            let across = { (y: CGFloat) in Path { $0.addLines([CGPoint(x: 0, y: y), CGPoint(x: size.width, y: y)]) } }
            for t in d.yTicks { ctx.stroke(across(yf(t.at)), with: .color(abs(t.at - d.y[0]) < 1e-9 ? p.edge : p.line)) }
            for t in d.xTicks {
                let f = (t.at - d.x[0]) / (d.x[1] - d.x[0])
                guard f > 0.001, f < 0.999 else { continue }
                ctx.stroke(Path { $0.addLines([CGPoint(x: xf(t.at), y: 0), CGPoint(x: xf(t.at), y: size.height)]) }, with: .color(p.line))
            }
            if let t = b.target {
                let (top, bottom) = (yf(t.max), yf(t.min))
                ctx.fill(Path(CGRect(x: 0, y: top, width: size.width, height: max(0, bottom - top))), with: .color(p.green.opacity(0.14)))
                for y in [top, bottom] { ctx.stroke(across(y), with: .color(p.green)) }
            }
            if let peak = b.peak {
                ctx.stroke(across(yf(peak.y)), with: .color(p.foreground), style: StrokeStyle(lineWidth: 1, dash: [Scale.pad, Scale.mark]))
            }
            for (i, s) in b.series.enumerated() {
                let pts = (d.lines[safe: i] ?? []).map { CGPoint(x: xf(s.x[$0]), y: yf(s.y[$0])) }
                let line = StrokeStyle(lineWidth: Size.stroke, lineCap: .square, lineJoin: .round)
                ctx.stroke(Path { $0.addLines(pts) }, with: .color(ChartModel.colour(s.tone, i, p)), style: line)
            }
            for (i, s) in b.series.enumerated() {
                guard let x = s.x.last, let y = s.y.last, (0...1.0001).contains((x - d.x[0]) / (d.x[1] - d.x[0])) else { continue }
                let dot = CGRect(x: xf(x) - Size.dot / 2, y: yf(y) - Size.dot / 2, width: Size.dot, height: Size.dot)
                ctx.fill(Path(dot.insetBy(dx: -Size.stroke, dy: -Size.stroke)), with: .color(p.card))
                ctx.fill(Path(dot), with: .color(ChartModel.colour(s.tone, i, p)))
            }
        }
        .accessibilityHidden(true)
    }
}

extension Array {
    fileprivate subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
