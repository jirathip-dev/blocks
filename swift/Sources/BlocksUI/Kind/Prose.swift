import Blocks
import SwiftUI

internal struct ProseBlock: View {
    @Environment(\.look) private var look
    @Environment(\.accessibilityReduceMotion) private var reduce
    internal let block: Prose

    internal var body: some View {
        let streaming = block.streaming == true
        Group {
            if streaming, !reduce, !look.still {
                TimelineView(.periodic(from: .now, by: Scale.blink)) { time in
                    parts(Int(time.date.timeIntervalSinceReferenceDate / Scale.blink) % 2 == 0 ? look.palette.foreground : .clear)
                }
            } else {
                parts(streaming ? look.palette.foreground : nil)
            }
        }
        .accessibilityAddTraits(streaming ? .updatesFrequently : [])
    }

    private func parts(_ caret: Color?) -> some View {
        let last = block.parts.indices.last
        let inline = block.parts.last.map(\.holdsText) ?? false
        return VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(block.parts.enumerated()), id: \.offset) { index, part in
                self.part(part, caret: index == last ? caret : nil)
            }
            if let caret, !inline { Text(Scale.caret).ui(Scale.title, .regular, look).foregroundStyle(caret) }
        }
        .textSelection(.enabled).frame(maxWidth: 720, alignment: .leading)
    }

    @ViewBuilder
    private func part(_ part: Part, caret: Color?) -> some View {
        let palette = look.palette
        switch part {
        case .heading(let heading):
            let sizes: [UInt8: CGFloat] = [1: 28, 2: 22]
            Spans(spans: heading.spans, caret: caret).ui(sizes[heading.level] ?? 18, .bold, look)
        case .list(let list):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(list.items.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(list.ordered ? "\(index + 1)." : "•").foregroundStyle(palette.mute).frame(width: 18)
                        Spans(spans: item, caret: index == list.items.count - 1 ? caret : nil)
                    }
                }
            }
            .ui(15, .regular, look)
        case .quote(let quote):
            Spans(spans: quote.spans, caret: caret).ui(15, .regular, look).padding(.leading, 12)
                .overlay(alignment: .leading) { Rectangle().fill(palette.foreground).frame(width: 3) }
        case .code(let code):
            Text(Spans.caret(AttributedString(code.text), caret)).font(.system(size: 13, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading).padding(12).background(palette.background)
                .overlay(alignment: .topTrailing) {
                    Text(code.lang ?? "").ui(11, .regular, look).foregroundStyle(palette.mute).padding(6)
                }
        case .rule: Rectangle().fill(palette.edge).frame(height: 1)
        case .para(let para): Spans(spans: para.spans, caret: caret).ui(15, .regular, look)
        case .unknown: Spans(spans: []).ui(15, .regular, look)
        }
    }
}

extension Part {
    fileprivate var holdsText: Bool {
        switch self {
        case .heading(let p): !p.spans.isEmpty
        case .para(let p): !p.spans.isEmpty
        case .quote(let p): !p.spans.isEmpty
        case .list(let p): !(p.items.last ?? []).isEmpty
        case .code: true
        case .rule, .unknown: false
        }
    }
}

private struct Spans: View {
    @Environment(\.look) private var look
    fileprivate let spans: [Span]
    fileprivate var caret: Color?

    fileprivate var body: some View {
        Text(Self.caret(spans.reduce(into: AttributedString()) { text, span in
            var run = AttributedString(span.text)
            let marks: [(Bool?, InlinePresentationIntent)] = [
                (span.bold, .stronglyEmphasized), (span.italic, .emphasized), (span.code, .code),
            ]
            run.inlinePresentationIntent = marks.reduce(into: []) { if $1.0 == true { $0.insert($1.1) } }
            if let link = span.link, linkable(link), let url = URL(string: link) {
                (run.link, run.underlineStyle, run.foregroundColor) = (url, .single, look.palette.foreground)
            }
            text += run
        }, caret))
        .tint(look.palette.foreground).modifier(Follows())
    }

    fileprivate static func caret(_ text: AttributedString, _ caret: Color?) -> AttributedString {
        guard let caret else { return text }
        var sign = AttributedString(Scale.caret)
        sign.foregroundColor = caret
        return text + sign
    }
}
