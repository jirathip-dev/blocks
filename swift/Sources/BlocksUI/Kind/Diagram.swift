import Blocks
import SwiftUI

internal struct DiagramBlock: View {
    @Environment(\.look) private var look
    @State private var was: [String: Int] = [:]
    internal let block: Diagram

    private var counts: [String: Int] { (block.counts ?? [:]).mapValues { Int($0) } }

    private var nodes: [String: Node] {
        switch block.nodes {
        case .list(let list): Dictionary(list.compactMap { n in n.id.map { ($0, n) } }) { first, _ in first }
        case .map(let map): map
        case nil: [:]
        }
    }

    internal var body: some View {
        let diagram = Chart(source: block.source)
        let map = { (metrics: DiagramMetrics) in
            DiagramMap(diagram: diagram, nodes: nodes, counts: counts, was: was, metrics: metrics)
        }
        ViewThatFits(in: .horizontal) {
            map(.wide)
            map(.phone)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 6)
        .background(
            look.outline ? look.palette.background : look.palette.card, in: .rect(cornerRadius: look.radius(16))
        )
        .onChange(of: counts) { old, _ in was = old }
        .accessibilityElement(children: .contain).accessibilityLabel(block.title ?? "Workflow")
    }
}

internal struct DiagramMetrics {
    internal static let phone = Self(widths: [-1: 108, 0: 100, 1: 78], gap: 22, gutter: 12, height: 46, rowGap: 20)
    internal static let wide = Self(widths: [-1: 156, 0: 176, 1: 140], gap: 40, gutter: 18, height: 54, rowGap: 22)
    internal static let top: CGFloat = 34

    internal let widths: [Int: CGFloat]
    internal let gap: CGFloat
    internal let gutter: CGFloat
    internal let height: CGFloat
    internal let rowGap: CGFloat
}

internal struct DiagramMap: View {
    @Environment(\.look) private var look
    internal let diagram: Chart
    internal let nodes: [String: Node]
    internal let counts: [String: Int]
    internal let was: [String: Int]
    internal let metrics: DiagramMetrics

    private var columns: [(side: Int, center: CGFloat)] {
        let used = Set(diagram.side.values)
        var left = metrics.gutter
        return [-1, 0, 1].filter(used.contains).map { side in
            let width = metrics.widths[side, default: 0]
            defer { left += width + metrics.gap }
            return (side, left + width / 2)
        }
    }

    private var size: CGSize {
        let right = columns.last.map { $0.center + metrics.widths[$0.side, default: 0] / 2 } ?? 0
        let rows = CGFloat(diagram.rows)
        return CGSize(
            width: right + metrics.gutter,
            height: DiagramMetrics.top + rows * (metrics.height + metrics.rowGap) - metrics.rowGap + 12)
    }

    private func box(_ id: String) -> CGRect {
        let side = diagram.side[id, default: 0]
        let center = columns.first { $0.side == side }?.center ?? 0
        let width = metrics.widths[side, default: 0]
        let top = DiagramMetrics.top + CGFloat(diagram.row[id, default: 0]) * (metrics.height + metrics.rowGap)
        return CGRect(x: center - width / 2, y: top, width: width, height: metrics.height)
    }

    internal var body: some View {
        ZStack(alignment: .topLeading) {
            Canvas { context, _ in draw(in: &context) }
            ForEach(diagram.order, id: \.self) { id in
                let node = nodes[id]
                ActButton(source: Source(tap: node?.tap)) {
                    DiagramNode(
                        name: diagram.name(id), node: node, count: counts[id] ?? 0, was: was[id],
                        optional: diagram.optional.contains(id), height: metrics.height)
                }
                .frame(width: box(id).width).position(x: box(id).midX, y: box(id).midY)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    private func draw(in context: inout GraphicsContext) {
        let palette = look.palette
        guard let first = diagram.spine.first.map(box) else { return }
        context.fill(
            Path(ellipseIn: CGRect(x: first.midX - 6, y: 4, width: 12, height: 12)), with: .color(palette.foreground))
        line([CGPoint(x: first.midX, y: 16), CGPoint(x: first.midX, y: first.minY)], color: palette.mute, in: &context)
        for edge in diagram.edges {
            let timer = nodes[edge.from]?.limit != nil || nodes[edge.into]?.limit != nil
            let points = route(box(edge.from), box(edge.into), outer: diagram.side[edge.from, default: 0])
            line(points, color: timer ? palette.link : palette.mute, dashed: timer, both: edge.both, in: &context)
        }
    }

    private func route(_ from: CGRect, _ end: CGRect, outer side: Int) -> [CGPoint] {
        if from.midY == end.midY {
            let right = from.midX < end.midX
            return [
                CGPoint(x: right ? from.maxX : from.minX, y: from.midY),
                CGPoint(x: right ? end.minX : end.maxX, y: end.midY),
            ]
        }
        if from.midX == end.midX { return column(from, end, outer: side) }
        let down = end.midY > from.midY
        if side == 0 {
            let start = CGPoint(x: end.midX > from.midX ? from.maxX : from.minX, y: from.midY)
            return [start, CGPoint(x: end.midX, y: from.midY), CGPoint(x: end.midX, y: down ? end.minY : end.maxY)]
        }
        let start = CGPoint(x: from.midX, y: down ? from.maxY : from.minY)
        return [
            start, CGPoint(x: from.midX, y: end.midY),
            CGPoint(x: end.midX > from.midX ? end.minX : end.maxX, y: end.midY),
        ]
    }

    private func column(_ from: CGRect, _ end: CGRect, outer side: Int) -> [CGPoint] {
        guard abs(from.midY - end.midY) > metrics.height + metrics.rowGap + 1 else {
            let down = end.midY > from.midY
            return [
                CGPoint(x: from.midX, y: down ? from.maxY : from.minY),
                CGPoint(x: end.midX, y: down ? end.minY : end.maxY),
            ]
        }
        let edge = side < 0 ? from.minX : from.maxX
        let gutter = edge + CGFloat(side < 0 ? -1 : 1) * (metrics.gutter - 3)
        return [
            CGPoint(x: edge, y: from.midY), CGPoint(x: gutter, y: from.midY), CGPoint(x: gutter, y: end.midY),
            CGPoint(x: edge, y: end.midY),
        ]
    }

    private func line(
        _ points: [CGPoint], color: Color, dashed: Bool = false, both: Bool = false, in context: inout GraphicsContext
    ) {
        var path = Path()
        path.addLines(points)
        let dash: [CGFloat] = dashed ? [2, 3] : []
        context.stroke(path, with: .color(color.opacity(0.7)), style: StrokeStyle(lineWidth: 1.4, dash: dash))
        for (tip, back) in [(points.last, points.dropLast().last)]
            + (both ? [(points.first, points.dropFirst().first)] : [])
        {
            guard let tip, let back else { continue }
            let angle = atan2(tip.y - back.y, tip.x - back.x)
            var head = Path()
            head.addLines(
                [-0.45, 0, 0.45].map { turn in
                    turn == 0 ? tip : CGPoint(x: tip.x - 8 * cos(angle + turn), y: tip.y - 8 * sin(angle + turn))
                })
            context.fill(head, with: .color(look.palette.mute))
        }
    }
}

internal struct DiagramNode: View {
    @Environment(\.look) private var look
    @Environment(\.picked) private var picked
    internal let name: String
    internal let node: Node?
    internal let count: Int
    internal let was: Int?
    internal let optional: Bool
    internal let height: CGFloat

    private var tone: String { node?.state?.rawValue ?? "idle" }

    internal var body: some View {
        if node?.limit != nil { timer } else { state }
    }

    private var timer: some View {
        let palette = look.palette
        return HStack(spacing: 4) {
            Mark(text: "⧗", size: 14, weight: .regular) { Text("⏱").ui(14, .regular, look) }
            VStack(alignment: .leading, spacing: 1) {
                Text(node?.label ?? name).ui(10.5, .regular, look).foregroundStyle(palette.mute)
                Text(node?.value ?? "").ui(13, .semibold, look)
            }
            Spacer(minLength: 0)
        }
        .lineLimit(1).minimumScaleFactor(0.8).foregroundStyle(palette.link).padding(.horizontal, 10)
        .frame(height: height)
        .background(look.outline ? .clear : palette.link.opacity(0.1), in: .rect(cornerRadius: look.radius(height / 2)))
        .overlay(outline(look.radius(height / 2), palette.link, dash: [3, 2]))
        .accessibilityLabel("\(node?.label ?? name) \(node?.value ?? ""), opens its setting")
    }

    private var state: some View {
        let palette = look.palette
        let tint = palette.tone(tone) ?? palette.mute
        let moved = was.map { $0 != count } ?? false
        let ring = moved || (picked != nil && node?.tap?.open == picked)
        return VStack(alignment: .leading, spacing: 0) {
            Text(name).ui(12.5, .medium, look).foregroundStyle(palette.mute)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(look.label(.chip, "\(count)")).ui(look.type == .mono ? 16 : 20, count == 0 ? .medium : .bold, look)
                    .foregroundStyle(count == 0 ? palette.mute : tint)
                if moved, let was { Text("was \(was)").ui(10.5, .semibold, look).foregroundStyle(tint) }
                if !moved, optional {
                    Text("optional").ui(10.5, .regular, look).italic(look.type == .default)
                        .foregroundStyle(palette.mute)
                }
            }
        }
        .lineLimit(1).minimumScaleFactor(0.8).padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .leading)
        .background(palette.background, in: .rect(cornerRadius: look.radius(12)))
        .overlay(
            outline(
                look.radius(12), moved ? tint : ring ? palette.lead : look.outline ? palette.foreground : palette.edge,
                width: ring ? 2 : 1)
        )
        .accessibilityLabel("\(name), \(count) issue\(count == 1 ? "" : "s")\(optional ? ", optional" : "")")
    }

    private func outline(_ radius: CGFloat, _ color: Color, width: CGFloat = 1, dash: [CGFloat] = []) -> some View {
        RoundedRectangle(cornerRadius: radius).strokeBorder(color, style: StrokeStyle(lineWidth: width, dash: dash))
    }
}
