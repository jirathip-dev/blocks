import Blocks
import SwiftUI
import WebKit

internal struct ComposerBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @State private var draft = ""
    @State private var picks: [String: JSONValue] = [:]
    @State private var editing: JSONValue?
    internal let block: JSONValue

    private var working: JSONValue? { block["working"].flatMap { $0 == .null ? nil : $0 } }

    internal var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let working { strip(working) }
            ForEach(Array(block.list("queued").enumerated()), id: \.offset) { _, item in queued(item) }
            HStack(alignment: .bottom, spacing: 8) {
                TextField(block.string("placeholder") ?? "", text: $draft, axis: .vertical).lineLimit(1...6)
                    .ui(15, .regular, look).textFieldStyle(.plain).padding(.horizontal, 12).padding(.vertical, 9)
                    .background(look.palette.background).accessibilityLabel("message")
                Button { send() } label: { CardButton(title: sendLabel, primary: true).fixedSize() }
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
        editing != nil ? "save" : working != nil && name("queue") != nil ? "queue" : block.string("label") ?? "send"
    }

    private func name(_ key: String) -> String? { block["acts"]?.string(key) }

    private func post(_ action: String?, _ values: [String: JSONValue]) {
        guard let action else { return }
        act(BlockAction(action: action, values: (block["values"]?.fields ?? [:]).merging(values) { $1 }))
    }

    private func send(_ steer: String? = nil) {
        guard !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let queue = steer == nil && (working != nil || editing != nil) ? name("queue") : nil
        var values = picks.merging(["text": .string(draft)]) { $1 }
        if queue != nil, let q = editing?["q"] { values["q"] = q }
        post(steer ?? queue ?? block.string("action"), values)
        (draft, editing) = ("", nil)
    }

    private func strip(_ working: JSONValue) -> some View {
        let since = working.string("since").flatMap { try? Date($0, strategy: .iso8601) }
        return HStack(spacing: 8) {
            Circle().fill(look.palette.foreground).frame(width: 6, height: 6)
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let seconds = Int(max(0, context.date.timeIntervalSince(since ?? context.date)))
                Text("working \(seconds >= 60 ? "\(seconds / 60)m " : "")\(seconds % 60)s").ui(13, .regular, look)
            }
            Spacer(minLength: 4)
            if let stop = name("stop") {
                Button("stop") { post(stop, [:]) }.buttonStyle(.plain).foregroundStyle(look.palette.red)
            }
        }
        .foregroundStyle(look.palette.mute)
    }

    private func queued(_ item: JSONValue) -> some View {
        let q = item["q"] ?? .null
        return HStack(spacing: 10) {
            Text(item.string("text") ?? "").ui(14, .regular, look).lineLimit(2)
            Spacer(minLength: 4)
            Button("send now") { post(name("steer"), ["q": q]) }.foregroundStyle(look.palette.foreground)
            Button("edit") { (editing, draft) = (item, item.string("text") ?? "") }
            Button("remove") { post(name("unqueue"), ["q": q]) }.foregroundStyle(look.palette.red)
        }
        .buttonStyle(.plain).ui(13, .regular, look).foregroundStyle(look.palette.mute)
    }

    private var chips: some View {
        HStack(spacing: 8) {
            ForEach(Array(block.list("chips").enumerated()), id: \.offset) { _, chip in
                let key = chip.string("name") ?? ""
                let cur = picks[key]?.string ?? chip.string("cur")
                Menu {
                    ForEach(chip.list("all").compactMap(\.string), id: \.self) { value in
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
    internal let block: JSONValue

    internal var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(block.list("parts").enumerated()), id: \.offset) { _, part in self.part(part) }
        }
        .textSelection(.enabled).frame(maxWidth: 720, alignment: .leading)
    }

    @ViewBuilder
    private func part(_ part: JSONValue) -> some View {
        let palette = look.palette
        switch part.string("part") {
        case "heading":
            let sizes: [Double: CGFloat] = [1: 28, 2: 22]
            Spans(spans: part.list("spans")).ui(sizes[part["level"]?.number ?? 3] ?? 18, .bold, look)
        case "list":
            let ordered = part["ordered"]?.bool == true
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(part.list("items").enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(ordered ? "\(index + 1)." : "•").foregroundStyle(palette.mute).frame(width: 18)
                        Spans(spans: item.items)
                    }
                }
            }
            .ui(15, .regular, look)
        case "quote":
            Spans(spans: part.list("spans")).ui(15, .regular, look).padding(.leading, 12)
                .overlay(alignment: .leading) { Rectangle().fill(palette.foreground).frame(width: 3) }
        case "code":
            Text(part.string("text") ?? "").font(.system(size: 13, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading).padding(12).background(palette.background)
                .overlay(alignment: .topTrailing) {
                    Text(part.string("lang") ?? "").ui(11, .regular, look).foregroundStyle(palette.mute).padding(6)
                }
        case "rule": Rectangle().fill(palette.edge).frame(height: 1)
        default: Spans(spans: part.list("spans")).ui(15, .regular, look)
        }
    }
}

private struct Spans: View {
    @Environment(\.look) private var look
    fileprivate let spans: [JSONValue]

    fileprivate var body: some View {
        Text(spans.reduce(into: AttributedString()) { text, span in
            var run = AttributedString(span.string("text") ?? "")
            let marks: [(String, InlinePresentationIntent)] = [
                ("bold", .stronglyEmphasized), ("italic", .emphasized), ("code", .code),
            ]
            run.inlinePresentationIntent = marks.reduce(into: []) { if span[$1.0]?.bool == true { $0.insert($1.1) } }
            if let link = span.string("link"), let url = URL(string: link) {
                (run.link, run.underlineStyle, run.foregroundColor) = (url, .single, look.palette.foreground)
            }
            text += run
        })
        .tint(look.palette.foreground).modifier(Follows())
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
    internal let block: JSONValue

    internal var body: some View {
        let ratio = (block["width"]?.number ?? 1) / max(block["height"]?.number ?? 1, 1)
        VStack(alignment: .leading, spacing: 6) {
            Button {
                if block["video"]?.bool == true { playing = true } else { zoomed = true }
            } label: {
                Color.clear.aspectRatio(ratio, contentMode: .fit)
                    .overlay { picture }.clipped()
            }
            .buttonStyle(.plain).accessibilityLabel(block.string("alt") ?? "")
            if let caption = block.string("caption") {
                Text(caption).ui(13, .regular, look).foregroundStyle(look.palette.mute)
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
        .sheet(isPresented: $zoomed) { ZoomedPicture(item: block) }
    }

    @ViewBuilder private var picture: some View {
        if block["video"]?.bool == true, playing, let url = block.string("src").flatMap(URL.init(string:)) {
            WebView(url: url)
        } else if block["video"]?.bool == true {
            Picture(item: block.with("src", block["poster"] ?? .null)).overlay {
                RoundButton(symbol: "play.fill", ascii: "play", size: 44)
            }
        } else {
            Picture(item: block)
        }
    }
}

internal struct HeroBlock: View {
    @Environment(\.look) private var look
    internal let block: JSONValue

    internal var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(block.string("title") ?? "").ui(34, .bold, look)
            if let subtitle = block.string("subtitle") {
                Text(subtitle).ui(17, .regular, look).foregroundStyle(look.palette.mute)
            }
            if let media = block["media"] { MediaBlock(block: media) }
            HStack(spacing: 8) {
                ForEach(Array(block.list("actions").enumerated()), id: \.offset) { index, item in
                    ActButton(source: item) { CardButton(title: item.string("label") ?? "", primary: index == 0) }
                        .fixedSize()
                }
            }
        }
        .frame(maxWidth: 720, alignment: .leading)
    }
}

internal struct NavBlock: View {
    @Environment(\.look) private var look
    internal let block: JSONValue

    internal var body: some View {
        HStack(spacing: 16) {
            if let brand = block["brand"] { link(brand).ui(16, .bold, look) }
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
            ForEach(Array(block.list("links").enumerated()), id: \.offset) { _, item in
                let current = item["current"]?.bool == true
                link(item).ui(14, .regular, look).underline(current)
                    .foregroundStyle(current ? look.palette.foreground : look.palette.mute)
            }
        }
    }

    private func link(_ item: JSONValue) -> some View {
        Text(item.string("label") ?? "").modifier(Linked(href: item.string("href")))
    }
}

private struct Linked: ViewModifier {
    @Environment(\.open) private var open
    @Environment(\.openURL) private var openURL
    fileprivate let href: String?

    fileprivate func body(content: Content) -> some View {
        Button {
            if let url = href.flatMap(URL.init(string:)) { Follows.follow(url, open: open, openURL: openURL) }
        } label: {
            content
        }
        .buttonStyle(.plain)
    }
}
