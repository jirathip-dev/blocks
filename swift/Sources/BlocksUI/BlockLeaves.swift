import Blocks
import SwiftUI
import WebKit

internal struct ButtonBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    internal let block: Blocks.Button

    internal var body: some View {
        let destructive = block.style == .destructive
        let tint = destructive ? look.palette.red : context.tint
        let confirm = Confirmation(block.confirm, label: block.label, destructive: destructive)
        ActButton(source: Source(action: block.action, tap: block.tap, values: block.values, confirm: confirm)) {
            CardButton(title: block.label, primary: block.style == .primary, tint: tint)
        }
    }
}

internal struct TextBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Text

    internal var body: some View {
        let markdown = block.markdown ?? block.text ?? ""
        let until = block.until?.date
        let footnote = block.style?.rawValue == "footnote"
        TimelineView(.everyMinute) { context in
            let text = Relative.filled(markdown, until: until, at: context.date)
            let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
            Text((try? AttributedString(markdown: text, options: options)) ?? AttributedString(text))
                .ui(footnote ? 12 : 16, .regular, look).foregroundStyle(footnote ? look.palette.mute : look.palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

internal struct ListBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.List

    internal var body: some View {
        let rows = block.rows
        if let tiles = look.tiles {
            VStack(spacing: tiles.seam) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    if case .row(let line) = row {
                        RowView(row: line).surface(look).modifier(Reordering(list: block, row: line))
                            .modifier(Reported(block: row)).modifier(Identified(id: row.id))
                    } else {
                        BlockNode(block: row)
                    }
                }
            }
        } else {
            lines(rows)
        }
    }

    private func lines(_ rows: [Block]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                if case .row(let line) = row {
                    RowView(row: line).modifier(Reordering(list: block, row: line)).modifier(Reported(block: row)).modifier(Identified(id: row.id))
                } else {
                    BlockNode(block: row)
                }
                if index < rows.count - 1 {
                    Rectangle().fill(look.palette.line).frame(height: 0.5).padding(.leading, 12)
                }
            }
        }
        .surface(look, radius: 16)
    }
}

internal struct StatBlock: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    internal let block: Stat

    internal var body: some View {
        HStack(spacing: look.tiles?.seam ?? 10) {
            if let items = block.items {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    tile(item.label, item.value, item.tone, item.unit, item.spark)
                }
            } else {
                tile(block.label, block.value, block.tone, block.unit, block.spark)
            }
        }
    }

    private func tile(_ label: String?, _ value: Shown?, _ tone: Tone?, _ unit: String?, _ spark: [Double]?)
        -> some View
    {
        let palette = look.palette
        return VStack(alignment: .leading, spacing: 4) {
            Text(label ?? "").ui(12, .regular, look).foregroundStyle(palette.mute)
                .fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                RelativeValue { value?.text(at: $0, behaved.view.values) ?? "" }.ui(22, .semibold, look)
                    .foregroundStyle(palette.tone(tone?.rawValue) ?? palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
                if let unit { Text(unit).ui(13, .regular, look).foregroundStyle(palette.mute) }
            }
            if let spark, !spark.isEmpty {
                Sparkline(points: spark).frame(height: 22)
            }
        }
        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
        .surface(look, radius: 16)
    }
}

internal struct Sparkline: View {
    @Environment(\.look) private var look
    internal let points: [Double]

    internal var body: some View {
        GeometryReader { size in
            let low = points.min() ?? 0
            let span = max((points.max() ?? 0) - low, 1)
            let step = size.size.width / CGFloat(max(points.count - 1, 1))
            Path { path in
                for (index, point) in points.enumerated() {
                    let point = CGPoint(x: CGFloat(index) * step, y: size.size.height * (1 - (point - low) / span))
                    if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
                }
            }
            .stroke(look.palette.lead, lineWidth: 1.5)
        }
    }
}

internal struct ChipsBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var picked: [String]?
    internal let block: Chips

    internal var body: some View {
        let selected = picked ?? block.selected ?? []
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(block.options.map(\.value), id: \.self) { value in
                    Button {
                        pick(value, from: selected)
                    } label: {
                        chip(value, selected: selected.contains(value))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    private func chip(_ value: String, selected: Bool) -> some View {
        let label = block.options.first { $0.value == value }?.label ?? value
        return Text(label).ui(13, .semibold, look).foregroundStyle(
            selected ? look.palette.background : look.palette.foreground
        )
        .padding(.horizontal, 12).frame(height: 30)
        .background(selected ? look.palette.lead : look.palette.edge.opacity(0.35), in: look.pill)
    }

    private func pick(_ value: String, from selected: [String]) {
        let multi = block.multi == true
        let next = multi ? (selected.contains(value) ? selected.filter { $0 != value } : selected + [value]) : [value]
        picked = next
        let chosen: JSONValue = multi ? .array(next.map(JSONValue.string)) : .string(value)
        if let action = block.action {
            act(BlockAction(action: action, values: [block.name: chosen]))
        }
    }
}

internal struct WebBlock: View {
    @Environment(\.look) private var look
    @State private var page: WebPage = {
        var configuration = WebPage.Configuration()
        configuration.websiteDataStore = .nonPersistent()
        return WebPage(configuration: configuration)
    }()
    internal let block: Web

    internal var body: some View {
        let height = CGFloat(block.height)
        if let url = URL(string: block.src), url.scheme == "https" || url.scheme == "http" {
            WebView(page).frame(height: height)
                .onAppear { _ = page.load(URLRequest(url: url)) }
        } else {
            Color.clear.frame(maxWidth: .infinity).frame(height: height).surface(look, radius: 12)
        }
    }
}
