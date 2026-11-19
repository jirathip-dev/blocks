import Blocks
import SwiftUI

private let zooms: [CGFloat] = [48, 32, 24, 16, 8, 4]
private let weekdays = ["T", "F", "S", "S", "M", "T", "W"]
private let monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
]

private struct Axis {
    let f: Int
    let t: Int
    let day: CGFloat
    var n: Int { t - f + 1 }
    var level: Int { day >= 24 ? 1 : day >= 12 ? 2 : 3 }
}

private func lanes(_ bars: [TimeBar]) -> (of: [String: Int], n: Int) {
    var ends: [Int] = []
    var of: [String: Int] = [:]
    for x in bars.sorted(by: { (dayNumber($0.start) ?? 0) < (dayNumber($1.start) ?? 0) }) {
        let s = dayNumber(x.start) ?? 0
        let i = ends.firstIndex { $0 < s } ?? ends.count
        if i == ends.count { ends.append(0) }
        ends[i] = dayNumber(x.end) ?? s
        of[x.id] = i
    }
    return (of, max(1, ends.count))
}

private struct Grabbed: ViewModifier {
    let block: Timeline
    let grab: BarGrab
    let gesture: Blocks.Gesture?
    let label: String
    let day: CGFloat
    let show: (DaySpan?) -> Void

    func body(content: Content) -> some View {
        if let gesture {
            content.modifier(
                Gestured(
                    rules: block, grab: grab, gesture: gesture, label: label, reach: { Days(Int(($0.width / day).rounded())) },
                    value: { (try? JSONValue($0)) ?? .null }, show: show))
        } else {
            content.accessibilityElement(children: .ignore).accessibilityLabel(label)
        }
    }
}

private func height(_ subs: Int) -> CGFloat { max(44, 12 + CGFloat(subs) * 32) }

internal struct TimelineBlock: View {
    @Environment(\.look) private var look
    @State private var width: CGFloat = 390
    @State private var zoom: CGFloat?
    @State private var held: [String: DaySpan] = [:]
    internal let block: Timeline

    private var lab: CGFloat { width < 600 ? 128 : 200 }

    internal var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Rectangle().fill(look.palette.line).frame(height: 1)
            if let f = dayNumber(block.from), let t = dayNumber(block.to), t >= f, !block.tracks.isEmpty {
                grid(Axis(f: f, t: t, day: zoom ?? min(48, max(24, (width - lab) / CGFloat(t - f + 1)))))
            } else {
                Text(block.empty ?? "Nothing scheduled").ui(15, .regular, look).foregroundStyle(look.palette.mute)
                    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(look.palette.card)
        .overlay(Rectangle().strokeBorder(look.palette.edge, lineWidth: 1))
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(block.title ?? "Timeline")
    }

    private var header: some View {
        HStack(spacing: 4) {
            Text(block.title ?? "").ui(15, .semibold, look).foregroundStyle(look.palette.foreground)
            Spacer()
            zoomButton("−", "zoom out", disabled: zoom == 4) { zooms.first { $0 < (zoom ?? 24) } ?? 4 }
            zoomButton("fit", "fit to width", disabled: zoom == nil) { nil }
            zoomButton("+", "zoom in", disabled: zoom == 48) { zooms.reversed().first { $0 > (zoom ?? 24) } ?? 48 }
        }
        .padding(.horizontal, 12).frame(minHeight: 44)
    }

    private func zoomButton(_ text: String, _ name: String, disabled: Bool, to: @escaping () -> CGFloat?) -> some View {
        Button(text) { zoom = to() }.buttonStyle(.plain).frame(minWidth: 44, minHeight: 44).disabled(disabled)
            .accessibilityLabel(name)
    }

    private func grid(_ ax: Axis) -> some View {
        let off = Set((block.off ?? []).compactMap(dayNumber))
        let rows = block.tracks.map { ($0, lanes($0.bars)) }
        return HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: ax.level == 3 ? 24 : 56)
                ForEach(rows, id: \.0.id) { r, l in title(r).frame(height: height(l.n)) }
            }
            .frame(width: lab)
            Rectangle().fill(look.palette.line).frame(width: 1)
            ScrollView(.horizontal) {
                VStack(alignment: .leading, spacing: 0) {
                    axis(ax, off)
                    ForEach(rows, id: \.0.id) { r, l in lane(r, l, ax, off) }
                }
                .frame(width: CGFloat(ax.n) * ax.day)
            }
        }
    }

    private func title(_ r: TimeRow) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(r.title).ui(15, .regular, look).foregroundStyle(look.palette.foreground).lineLimit(1)
            if let s = r.subtitle { Text(s).ui(12, .regular, look).foregroundStyle(look.palette.mute).lineLimit(1) }
        }
        .padding(.horizontal, 12).frame(maxWidth: .infinity, alignment: .leading)
    }

    private func axis(_ ax: Axis, _ off: Set<Int>) -> some View {
        var months: [(Int, Int)] = []
        var d = ax.f
        while d <= ax.t {
            let m = civil(d).month
            let k = (d...ax.t).prefix { civil($0).month == m }.count
            months.append((d, k))
            d += k
        }
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                ForEach(months, id: \.0) { start, k in
                    let name = monthNames[civil(start).month - 1]
                    Text("\(ax.level == 3 && CGFloat(k) * ax.day < 90 ? String(name.prefix(3)) : name) \(String(civil(start).year))")
                        .ui(12, .semibold, look).lineLimit(1).padding(.leading, 8)
                        .frame(width: CGFloat(k) * ax.day, height: 24, alignment: .leading)
                }
            }
            if ax.level < 3 {
                HStack(spacing: 0) {
                    ForEach(ax.f...ax.t, id: \.self) { d in
                        let wd = weekdays[((d % 7) + 7) % 7]
                        VStack(spacing: 0) {
                            if ax.level == 1 || wd == "M" || d == ax.f {
                                Text(String(civil(d).day)).ui(12, .semibold, look)
                            }
                            if ax.level == 1 { Text(wd).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
                        }
                        .frame(width: ax.day, height: 32)
                        .background(off.contains(d) ? look.palette.background : .clear)
                    }
                }
            }
        }
        .foregroundStyle(look.palette.foreground)
        .accessibilityHidden(true)
    }

    private func lane(_ r: TimeRow, _ l: (of: [String: Int], n: Int), _ ax: Axis, _ off: Set<Int>) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(Array(off.filter { $0 >= ax.f && $0 <= ax.t }).sorted(), id: \.self) { d in
                Rectangle().fill(look.palette.background).frame(width: ax.day)
                    .offset(x: CGFloat(d - ax.f) * ax.day).accessibilityHidden(true)
            }
            drawing(r, ax)
            ForEach(r.bars.filter { visible($0, ax) }, id: \.id) { x in bar(x, CGFloat(l.of[x.id] ?? 0), ax) }
        }
        .frame(width: CGFloat(ax.n) * ax.day, height: height(l.n), alignment: .topLeading)
        .clipped()
        .overlay(alignment: .bottom) { Rectangle().fill(look.palette.line).frame(height: 1) }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(r.title)
    }

    private func visible(_ x: TimeBar, _ ax: Axis) -> Bool {
        guard let s = dayNumber(x.start), let e = dayNumber(x.end) else { return false }
        return e >= ax.f && s <= ax.t
    }

    @ViewBuilder
    private func drawing(_ r: TimeRow, _ ax: Axis) -> some View {
        let key = "row:\(r.id)"
        let target = Color.clear.contentShape(Rectangle())
        if block.draw != nil {
            ZStack(alignment: .topLeading) {
                target.modifier(
                    Grabbed(block: block, grab: .row(r.id), gesture: block.draw, label: "\(r.title), Add a bar", day: ax.day) {
                        held[key] = $0
                    })
                if let s = held[key], let a = dayNumber(s.start), let b = dayNumber(s.end) {
                    Rectangle().strokeBorder(look.palette.lead, style: StrokeStyle(lineWidth: 1, dash: [3]))
                        .frame(width: CGFloat(b - a + 1) * ax.day, height: 28)
                        .offset(x: CGFloat(a - ax.f) * ax.day, y: 8).allowsHitTesting(false)
                }
            }
        } else {
            target
        }
    }

    private func tone(_ x: TimeBar) -> Color {
        let p = look.palette
        switch x.tone?.rawValue {
        case "ok": return p.green
        case "warn": return p.amber
        case "bad": return p.red
        case "info": return p.cyan
        case "accent": return p.purple
        case "mute": return p.edge
        default: return .clear
        }
    }

    private func bar(_ x: TimeBar, _ y: CGFloat, _ ax: Axis) -> some View {
        let (s, e) = (dayNumber(held[x.id]?.start ?? x.start) ?? ax.f, dayNumber(held[x.id]?.end ?? x.end) ?? ax.f)
        let (a, b) = (max(s, ax.f), min(e, ax.t))
        let name =
            "\(x.label ?? "Bar"), \(dayWords(x.start, x.end))\(x.progress.map { ", \($0) % done" } ?? "")\(x.fixed == true ? ", fixed" : "")"
        let fixed = x.fixed == true
        let grips = !fixed && block.stretch != nil && ax.level == 1
        return ZStack(alignment: .leading) {
            Rectangle().fill(look.palette.card)
            Rectangle().fill(tone(x)).frame(width: 3)
            if let p = x.progress {
                Rectangle().fill(fixed ? look.palette.mute : look.palette.lead).frame(height: 2)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .scaleEffect(x: CGFloat(p) / 100, anchor: .leading)
            }
            Text(x.label ?? "").ui(13, .regular, look).lineLimit(1).truncationMode(.tail).padding(.leading, 11)
                .padding(.trailing, 8).foregroundStyle(fixed ? look.palette.mute : look.palette.foreground)
        }
        .overlay(Rectangle().strokeBorder(fixed ? look.palette.edge : look.palette.lead, lineWidth: 1))
        .frame(width: max(ax.day, CGFloat(b - a + 1) * ax.day), height: 28)
        .modifier(Grabbed(block: block, grab: .bar(x.id, .body), gesture: block.move, label: name, day: ax.day) { held[x.id] = $0 })
        .overlay(alignment: .leading) { if grips && s >= ax.f { grip(x, .start, ax) } }
        .overlay(alignment: .trailing) { if grips && e <= ax.t { grip(x, .end, ax) } }
        .offset(x: CGFloat(a - ax.f) * ax.day, y: 8 + y * 32)
    }

    private func grip(_ x: TimeBar, _ part: BarGrab.Part, _ ax: Axis) -> some View {
        Rectangle().fill(look.palette.mute).frame(width: 2, height: 12).frame(width: 22, height: 44)
            .contentShape(Rectangle())
            .modifier(
                Grabbed(
                    block: block, grab: .bar(x.id, part), gesture: block.stretch,
                    label: "\(part == .start ? "Start" : "End") of \(x.label ?? "bar")", day: ax.day
                ) { held[x.id] = $0 })
    }
}
