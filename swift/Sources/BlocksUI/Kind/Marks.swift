import Blocks
import SwiftUI

private enum Mk {
    static let line: CGFloat = 3
    static let halo: CGFloat = 7
    static let lineFixed: CGFloat = 2
    static let haloFixed: CGFloat = 5
    static let band: CGFloat = 4
    static let ring: CGFloat = 2.5
    static let focus: CGFloat = 2
    static let grip: CGFloat = 12
    static let s1: CGFloat = 4
    static let s2: CGFloat = 8
    static let noteX: CGFloat = 6
    static let noteY: CGFloat = 2
    static let note: CGFloat = 190
    static let input: CGFloat = 160
    static let meta: CGFloat = 11
    static let body: CGFloat = 13
}

private func point(_ p: [Double]?, _ size: CGSize) -> CGPoint? {
    guard let p, p.count == 2 else { return nil }
    return CGPoint(x: p[0] * size.width, y: p[1] * size.height)
}

private func drawn(_ m: Blocks.Mark, _ c: MarkChange?) -> Blocks.Mark {
    guard let c, let at = c.at else { return m }
    var out = m
    (out.at, out.to) = (at, c.to ?? m.to)
    return out
}

private func shape(_ m: Blocks.Mark, _ size: CGSize) -> Path {
    var path = Path()
    guard let a = point(m.at, size) else { return path }
    let t = point(m.to, size) ?? a
    let box = CGRect(x: min(a.x, t.x), y: min(a.y, t.y), width: abs(t.x - a.x), height: abs(t.y - a.y))
    if let points = m.path?.compactMap({ point($0, size) }), let first = points.first {
        path.move(to: first)
        points.dropFirst().forEach { path.addLine(to: $0) }
        return path
    }
    switch m.kind {
    case .line, .arrow:
        path.move(to: a)
        path.addLine(to: t)
    case .box, .highlight: path.addRect(box)
    case .ellipse: path.addEllipse(in: box)
    default: break
    }
    return path
}

private func head(_ m: Blocks.Mark, _ size: CGSize) -> Path? {
    guard m.kind == .arrow, m.path == nil, let a = point(m.at, size), let t = point(m.to, size) else { return nil }
    let (angle, len) = (atan2(t.y - a.y, t.x - a.x), 16.0)
    let (bx, by) = (t.x - len * cos(angle), t.y - len * sin(angle))
    let (s, c) = (len / 2 * sin(angle), len / 2 * cos(angle))
    return Path { $0.addLines([t, CGPoint(x: bx + s, y: by - c), CGPoint(x: bx - s, y: by + c)]) }
}

extension Palette {
    fileprivate func mark(_ tone: Tone?) -> Color {
        switch tone?.rawValue {
        case "ok": green
        case "warn": amber
        case "info": cyan
        case "accent": purple
        case "ink": lead
        default: red
        }
    }
}

/// A modifier when there is one.
internal struct Maybe<M: ViewModifier>: ViewModifier {
    internal let m: M?

    internal func body(content: Content) -> some View {
        if let m { content.modifier(m) } else { content }
    }
}

/// A picture's marks over it: drawn from the data, each candidate in place of its mark while it is out.
internal struct MarkLayer: View {
    @Environment(\.look) private var look
    internal let marks: [Blocks.Mark]
    internal var held: [String: MarkChange] = [:]

    internal var body: some View {
        GeometryReader { g in
            let all = marks.map { drawn($0, held[$0.id]) } + (held["draw"].flatMap(Self.new).map { [$0] } ?? [])
            ZStack(alignment: .topLeading) {
                Canvas { ctx, size in
                    for m in all {
                        let ink = look.palette.mark(m.tone)
                        var c = ctx
                        c.opacity = held[m.id] != nil || m.id.isEmpty ? 0.45 : 1
                        let p = shape(m, size)
                        if m.kind == .highlight && m.path == nil {
                            c.fill(p, with: .color(ink.opacity(0.32)))
                            continue
                        }
                        let fixed = m.fixed == true
                        c.stroke(p, with: .color(look.palette.card), style: StrokeStyle(lineWidth: fixed ? Mk.haloFixed : Mk.halo, lineCap: .round, lineJoin: .round))
                        c.stroke(p, with: .color(ink), style: StrokeStyle(lineWidth: fixed ? Mk.lineFixed : Mk.line, lineCap: .round, lineJoin: .round, dash: fixed ? [6, 4] : []))
                        if let h = head(m, size) {
                            c.stroke(h, with: .color(look.palette.card), style: StrokeStyle(lineWidth: Mk.band, lineJoin: .round))
                            c.fill(h, with: .color(ink))
                        }
                    }
                }
                ForEach(Array(all.enumerated()), id: \.offset) { _, m in label(m, g.size) }
            }
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    private static func new(_ c: MarkChange) -> Blocks.Mark? {
        try? JSONValue.object(c.value.fields.merging(["id": .string("")]) { a, _ in a }).decode(Blocks.Mark.self)
    }

    @ViewBuilder private func label(_ m: Blocks.Mark, _ size: CGSize) -> some View {
        let ink = look.palette.mark(m.tone)
        if let p = point(m.at, size), m.kind == .pin {
            Circle().fill(ink).overlay(Circle().stroke(look.palette.card, lineWidth: Mk.ring)).frame(width: Mk.grip, height: Mk.grip)
                .position(p)
            if let t = m.text, !t.isEmpty {
                Text(t).ui(Mk.meta, .bold, look).foregroundStyle(look.palette.card).padding(.horizontal, Mk.s1).background(ink)
                    .fixedSize().position(x: p.x + 14, y: p.y - 15)
            }
        } else if let p = point(m.at, size), m.kind == .text {
            Text(m.text ?? "").ui(Mk.body, .regular, look).lineLimit(3).foregroundStyle(look.palette.foreground)
                .padding(.horizontal, Mk.noteX).padding(.vertical, Mk.noteY).frame(maxWidth: Mk.note, alignment: .leading).fixedSize(horizontal: false, vertical: true)
                .background(look.palette.card).overlay(alignment: .leading) { Rectangle().fill(ink).frame(width: Mk.line) }
                .alignmentGuide(.leading) { _ in -p.x }.alignmentGuide(.top) { _ in -p.y }
        }
    }
}

/// A picture whose marks take gestures: its tools, a focus stop per mark and grips on the picked one, each through the driver.
internal struct Marked: View {
    @Environment(\.look) private var look
    @State private var sel: String?
    @State private var tool: MarkKind?
    @State private var words = ""
    @State private var into: String?
    @State private var held: [String: MarkChange] = [:]
    internal let block: Media

    private var marks: [Blocks.Mark] { block.marks ?? [] }
    private var groups: [String] { marks.filter { $0.fixed != true }.compactMap(\.group).reduce(into: []) { if !$0.contains($1) { $0.append($1) } } }
    private var group: String? { into.flatMap { groups.contains($0) ? $0 : nil } ?? groups.last }
    private var picked: MarkKind? { tool ?? (block.tools?.count == 1 ? block.tools?.first : nil) }
    private func pen(_ k: MarkKind, at: [Double]? = nil) -> Pen { Pen(k, at: at, text: k == .text ? words : nil, group: group) }

    internal var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if block.draw != nil, let tools = block.tools, !tools.isEmpty { bar(tools) }
            Color.clear.aspectRatio(Double(block.width) / max(Double(block.height), 1), contentMode: .fit)
                .overlay { Picture(src: block.src, alt: block.alt, fit: true) }
                .overlay { MarkLayer(marks: marks, held: held) }
                .overlay { GeometryReader { g in stops(g.size, g.frame(in: .global)) } }
                .clipped()
            if marks.isEmpty && block.draw != nil {
                Text("pick a tool, then drag on the photo").ui(Mk.meta, .regular, look).foregroundStyle(look.palette.mute).padding(.top, Mk.s1)
            }
        }
    }

    private func bar(_ tools: [MarkKind]) -> some View {
        HStack(spacing: Mk.s2) {
            ForEach(tools, id: \.rawValue) { toolButton($0) }
            if picked == .text { TextField("Words", text: $words).frame(maxWidth: Mk.input).accessibilityLabel("Text of the new mark") }
            if !groups.isEmpty {
                Picker("into", selection: Binding(get: { group ?? "" }, set: { into = $0 })) {
                    ForEach(groups, id: \.self) { Text($0).tag($0) }
                }
            }
            Spacer()
            if let id = sel, block.remove != nil {
                Text("delete").ui(Mk.body, .regular, look).foregroundStyle(look.palette.red).frame(minHeight: 44)
                    .accessibilityAddTraits(.isButton)
                    .modifier(gestured(.remove(id), block.remove, "Delete", id, .zero, tap: Nudge(.right)))
            }
        }
        .padding(.horizontal, Mk.s2).background(look.palette.card)
    }

    private func toolButton(_ k: MarkKind) -> some View {
        let on = picked == k
        let traits: AccessibilityTraits = on ? [.isButton, .isSelected] : .isButton
        return Text(k.rawValue).ui(Mk.body, on ? .bold : .regular, look).frame(minHeight: 44)
            .contentShape(Rectangle()).onTapGesture { tool = tool == k ? nil : k }
            .accessibilityAddTraits(traits)
            .modifier(gestured(.draw(pen(k, at: [0.5, 0.5])), block.draw, "\(said(k)) tool", "draw", .zero))
    }

    private func reach(_ frame: CGRect) -> (DragGesture.Value) -> MarkReach {
        let at = { (p: CGPoint) -> [Double] in
            [Double((p.x - frame.minX) / max(frame.width, 1)), Double((p.y - frame.minY) / max(frame.height, 1))]
        }
        return { MarkReach(from: at($0.startLocation), to: at($0.location)) }
    }

    private func gestured(
        _ grab: MarkGrab, _ g: Blocks.Gesture?, _ label: String, _ item: String, _ frame: CGRect, tap: Nudge? = nil
    ) -> Maybe<Gestured<Media>> {
        Maybe(
            m: g.map {
                Gestured(
                    rules: block, grab: grab, gesture: $0, label: label, reach: reach(frame), value: \.value,
                    show: { held[item] = $0 }, tapped: tap)
            })
    }

    @ViewBuilder private func stops(_ size: CGSize, _ frame: CGRect) -> some View {
        ZStack(alignment: .topLeading) {
            if let k = picked, block.draw != nil {
                Color.clear.contentShape(Rectangle())
                    .modifier(gestured(.draw(pen(k)), block.draw, "Draw \(said(k).lowercased())", "draw", frame))
            }
            ForEach(marks.filter { $0.fixed != true }, id: \.id) { m in
                stop(m, size, frame)
                if sel == m.id, m.to != nil, block.stretch != nil {
                    grip(m, .start(m.id), "Start", m.at, size, frame)
                    grip(m, .end(m.id), "End", m.to, size, frame)
                }
            }
        }
    }

    private func stop(_ m: Blocks.Mark, _ size: CGSize, _ frame: CGRect) -> some View {
        let all = [m.at] + (m.to.map { [$0] } ?? [])
        let ps = all.compactMap { point($0, size) }
        let (xs, ys) = (ps.map(\.x), ps.map(\.y))
        let box = CGRect(
            x: xs.min() ?? 0, y: ys.min() ?? 0, width: (xs.max() ?? 0) - (xs.min() ?? 0), height: (ys.max() ?? 0) - (ys.min() ?? 0))
        return Rectangle().fill(.clear).contentShape(Rectangle())
            .frame(width: max(44, box.width + 12), height: max(44, box.height + 12))
            .overlay { if sel == m.id { Rectangle().stroke(look.palette.lead, style: StrokeStyle(lineWidth: 1, dash: [4, 3])) } }
            .position(x: box.midX, y: box.midY)
            .onTapGesture { sel = sel == m.id ? nil : m.id }
            .accessibilityAddTraits(.isButton)
            .modifier(gestured(.body(m.id), block.move, block.named(m.id) ?? m.id, m.id, frame))
    }

    private func grip(_ m: Blocks.Mark, _ grab: MarkGrab, _ end: String, _ at: [Double]?, _ size: CGSize, _ frame: CGRect) -> some View {
        let c = held[m.id].flatMap { end == "Start" ? $0.at : $0.to } ?? at
        let p = point(c, size) ?? .zero
        return Rectangle().fill(look.palette.card).overlay(Rectangle().stroke(look.palette.lead, lineWidth: Mk.focus)).frame(width: Mk.grip, height: Mk.grip)
            .frame(width: 44, height: 44).contentShape(Rectangle()).position(p)
            .accessibilityAddTraits(.isButton)
            .modifier(gestured(grab, block.stretch, "\(end) of \(block.named(m.id) ?? m.id)", m.id, frame))
    }
}
