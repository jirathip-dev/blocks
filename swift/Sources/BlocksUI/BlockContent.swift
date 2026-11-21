import Blocks
import SwiftUI
import WebKit

internal struct ComposerBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var draft = ""
    @State private var picks: [String: JSONValue] = [:]
    @State private var editing: Queued?
    internal let block: Composer

    private var working: Working? { block.working }

    internal var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let working { strip(working) }
            ForEach(Array((block.queued ?? []).enumerated()), id: \.offset) { _, item in queued(item) }
            HStack(alignment: .bottom, spacing: 8) {
                SwiftUI.TextField(block.placeholder ?? "", text: $draft, axis: .vertical).lineLimit(1...6)
                    .ui(15, .regular, look).textFieldStyle(.plain).padding(.horizontal, 12).padding(.vertical, 9)
                    .background(look.palette.background).accessibilityLabel("message")
                Button { send() } label: { CardButton(title: sendLabel, primary: true).fixedSize() }
                    .modifier(Identified(id: block.action, action: true))
                    .buttonStyle(.plain).keyboardShortcut(.return, modifiers: .command)
                    .contextMenu {
                        if let steer = name("steer"), working != nil { Button("steer now") { send(steer) } }
                    }
            }
            chips
        }
        .padding(12).surface(look, radius: 22)
    }

    private var sendLabel: String {
        editing != nil ? "save" : working != nil && name("queue") != nil ? "queue" : block.label ?? "send"
    }

    private func name(_ key: String) -> String? { block.acts?[key] }

    private func post(_ action: String?, _ values: [String: JSONValue]) {
        guard let action else { return }
        act(BlockAction(action: action, values: (block.values ?? [:]).merging(values) { $1 }))
    }

    private func send(_ steer: String? = nil) {
        guard !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let queue = steer == nil && (working != nil || editing != nil) ? name("queue") : nil
        var values = picks.merging(["text": .string(draft)]) { $1 }
        if queue != nil, let q = editing?.q { values["q"] = .number(Double(q)) }
        post(steer ?? queue ?? block.action, values)
        (draft, editing) = ("", nil)
    }

    private func strip(_ working: Working) -> some View {
        let since = working.since.date
        return HStack(spacing: 8) {
            Circle().fill(look.palette.foreground).frame(width: 6, height: 6)
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let seconds = Int(max(0, context.date.timeIntervalSince(since ?? context.date)))
                Text("working \(seconds >= 60 ? "\(seconds / 60)m " : "")\(seconds % 60)s").ui(13, .regular, look)
            }
            Spacer(minLength: 4)
            if let stop = name("stop") {
                Button("stop") { post(stop, [:]) }.buttonStyle(.plain).foregroundStyle(look.palette.red)
                    .modifier(Identified(id: stop, action: true))
            }
        }
        .foregroundStyle(look.palette.mute)
    }

    private func queued(_ item: Queued) -> some View {
        let q = JSONValue.number(Double(item.q))
        return HStack(spacing: 10) {
            Text(item.text).ui(14, .regular, look).lineLimit(2)
            Spacer(minLength: 4)
            Button("send now") { post(name("steer"), ["q": q]) }.foregroundStyle(look.palette.foreground)
                .modifier(Identified(id: name("steer"), action: true))
            Button("edit") { (editing, draft) = (item, item.text) }
            Button("remove") { post(name("unqueue"), ["q": q]) }.foregroundStyle(look.palette.red)
                .modifier(Identified(id: name("unqueue"), action: true))
        }
        .buttonStyle(.plain).ui(13, .regular, look).foregroundStyle(look.palette.mute)
    }

    private var chips: some View {
        HStack(spacing: 8) {
            ForEach(Array((block.chips ?? []).enumerated()), id: \.offset) { _, chip in
                let key = chip.name
                let cur = picks[key]?.string ?? chip.cur
                Menu {
                    ForEach(chip.all, id: \.self) { value in
                        Button(value) {
                            if let model = name("model") { post(model, [key: .string(value)]) }
                            picks[key] = .string(value)
                        }
                    }
                } label: {
                    Text(cur.map { "\(key) \($0)" } ?? key).ui(13, .regular, look)
                        .foregroundStyle(look.palette.foreground).padding(.horizontal, 10).frame(height: 28)
                        .overlay(Rectangle().strokeBorder(look.palette.edge, lineWidth: 1))
                }
                .menuIndicator(.hidden).buttonStyle(.plain).fixedSize()
            }
        }
    }
}

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

private struct Follows: ViewModifier {
    @Environment(\.open) private var open
    @Environment(\.openURL) private var openURL

    fileprivate func body(content: Content) -> some View {
        content.environment(
            \.openURL,
            OpenURLAction { url in
                Self.follow(url, open: open, openURL: openURL)
                return .handled
            })
    }

    @MainActor
    fileprivate static func follow(_ url: URL, open: (String) -> Void, openURL: OpenURLAction) {
        if url.scheme == nil { open(url.absoluteString) } else { openURL(url) }
    }
}

internal struct MediaBlock: View {
    @Environment(\.look) private var look
    @State private var zoomed = false
    @State private var playing = false
    internal let block: Media

    private var takes: Bool {
        block.id != nil && block.video != true && (block.draw ?? block.move ?? block.stretch ?? block.remove) != nil
    }

    private var named: String {
        let marks = block.marks ?? []
        guard !marks.isEmpty, block.video != true else { return block.alt }
        return "\(block.alt). \(marks.count) marks: \(marks.compactMap { block.named($0.id) }.joined(separator: "; "))"
    }

    internal var body: some View {
        let ratio = Double(block.width) / max(Double(block.height), 1)
        VStack(alignment: .leading, spacing: 6) {
            if takes {
                Marked(block: block)
            } else {
                Button {
                    if block.video == true { playing = true } else { zoomed = true }
                } label: {
                    Color.clear.aspectRatio(ratio, contentMode: .fit)
                        .overlay { picture }.overlay { MarkLayer(marks: block.video == true ? [] : block.marks ?? []) }.clipped()
                }
                .buttonStyle(.plain).accessibilityLabel(named)
            }
            if let caption = block.caption {
                Text(caption).ui(13, .regular, look).foregroundStyle(look.palette.mute)
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
        .sheet(isPresented: $zoomed) { ZoomedPicture(src: block.src, alt: block.alt) }
    }

    @ViewBuilder private var picture: some View {
        if block.video == true, playing, let url = URL(string: block.src) {
            WebView(url: url)
        } else if block.video == true {
            Picture(src: block.poster ?? "", alt: block.alt).overlay {
                RoundButton(symbol: "play.fill", ascii: "play", size: 44)
            }
        } else {
            Picture(src: block.src, alt: block.alt)
        }
    }
}

internal struct HeroBlock: View {
    @Environment(\.look) private var look
    internal let block: Hero

    internal var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(block.title).ui(34, .bold, look)
            if let subtitle = block.subtitle {
                Text(subtitle).ui(17, .regular, look).foregroundStyle(look.palette.mute)
            }
            if let media = block.media { MediaBlock(block: media) }
            HStack(spacing: 8) {
                ForEach(Array((block.actions ?? []).enumerated()), id: \.offset) { index, item in
                    ActButton(source: Source(item)) { CardButton(title: item.label, primary: index == 0) }
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
    }
}

internal struct NavBlock: View {
    @Environment(\.look) private var look
    internal let block: Nav

    internal var body: some View {
        HStack(spacing: 16) {
            if let brand = block.brand { link(brand).ui(16, .bold, look) }
            Spacer(minLength: 8)
            ViewThatFits(in: .horizontal) {
                links
                ScrollView(.horizontal) { links }.scrollIndicators(.hidden)
            }
        }
        .foregroundStyle(look.palette.foreground).padding(.horizontal, 16).frame(minHeight: 48)
    }

    private var links: some View {
        HStack(spacing: 16) {
            ForEach(Array(block.links.enumerated()), id: \.offset) { _, item in
                let current = item.current == true
                link(item).ui(14, .regular, look).underline(current)
                    .foregroundStyle(current ? look.palette.foreground : look.palette.mute)
            }
        }
    }

    private func link(_ item: NavLink) -> some View {
        Text(item.label).modifier(Linked(href: item.href))
    }
}

private struct Linked: ViewModifier {
    @Environment(\.open) private var open
    @Environment(\.openURL) private var openURL
    fileprivate let href: String?

    fileprivate func body(content: Content) -> some View {
        if let href, linkable(href), let url = URL(string: href) {
            Button {
                Follows.follow(url, open: open, openURL: openURL)
            } label: {
                content
            }
            .buttonStyle(.plain)
        } else {
            content
        }
    }
}
