import Blocks
import SwiftUI

internal struct ActButton<Label: View>: View {
    @Environment(\.act) private var act
    @Environment(\.behaved) private var behaved
    @Environment(\.edit) private var edit
    @Environment(\.openURL) private var openURL
    @Environment(\.openThread) private var openThread
    @Environment(\.open) private var open
    @Environment(\.openBeside) private var openBeside
    @State private var pending: Source?
    internal var action: String?
    internal let source: Source
    internal var values: [String: JSONValue] = [:]
    @ViewBuilder internal let label: Label

    internal var body: some View {
        Button {
            if source.confirm == nil { fire() } else { pending = source }
        } label: {
            label
        }
        .buttonStyle(.plain)
        .modifier(Confirming(pending: $pending) { _ in fire() })
        .modifier(Identified(id: sends, action: true))
    }

    private var sends: String? {
        let tap = source.tap
        return tap?.url ?? tap?.thread ?? tap?.open ?? tap?.sheet == nil ? source.sent(action)?.action : nil
    }

    private func fire() {
        let tap = source.tap
        let set = Behaviour.tap(tap?.set ?? [], state: behaved.state)
        if !set.isEmpty { edit(set) }
        if let url = tap?.url.flatMap(URL.init(string:)) {
            openURL(url)
        } else if let thread = tap?.thread {
            openThread(thread)
        } else if let path = tap?.open, let openBeside {
            openBeside(path)
        } else if let tap, let path = tap.sheet ?? tap.open {
            open(tap.focus.map { "\(path)#\($0)" } ?? path)
        } else if let action = source.sent(action, values: values) {
            act(action)
        }
    }
}

internal struct Confirming: ViewModifier {
    @Binding internal var pending: Source?
    internal let run: (Source) -> Void

    internal func body(content: Content) -> some View {
        let confirm = pending?.confirm
        content.confirmationDialog(
            confirm?.title ?? "",
            isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }),
            titleVisibility: .visible,
            presenting: pending
        ) { source in
            Button(confirm?.accept ?? "OK", role: confirm?.destructive == true ? .destructive : nil) { run(source) }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            if let message = confirm?.message { Text(message) }
        }
    }
}

internal struct CardBlock: View {
    @Environment(\.look) private var look
    @Environment(\.card) private var context
    internal let block: Card

    private struct Kind {
        fileprivate let label: String
        fileprivate let symbol: String
        fileprivate let tint: Color
    }

    private var kind: Kind? {
        let palette = look.palette
        let poster =
            if case .plugin(let name) = context.poster { " · \(name)" } else { "" }
        switch block.kind?.rawValue {
        case "ask": return Kind(label: "ask\(poster)", symbol: "hand.raised.fill", tint: palette.red)
        case "config": return Kind(label: "config\(poster)", symbol: "slider.horizontal.3", tint: palette.cyan)
        case "proposal":
            return Kind(label: "config proposal\(poster)", symbol: "slider.horizontal.3", tint: palette.cyan)
        case "secret": return Kind(label: "secret\(poster)", symbol: "key.fill", tint: palette.amber)
        case "run": return Kind(label: "run card\(poster)", symbol: "terminal.fill", tint: palette.lead)
        case "confirm": return Kind(label: "confirm\(poster)", symbol: "checkmark.shield.fill", tint: palette.red)
        case "permissions":
            return Kind(label: "permissions\(poster)", symbol: "lock.shield.fill", tint: palette.purple)
        default: return nil
        }
    }

    internal var body: some View {
        if CardTrust.draws(block.kind?.rawValue, from: context.poster) {
            card
        } else {
            MissingPoster(kind: block.kind?.rawValue ?? "")
        }
    }

    @ViewBuilder private var card: some View {
        let tint = kind?.tint ?? look.palette.tone(block.tone?.rawValue) ?? look.palette.lead
        VStack(alignment: .leading, spacing: 10) {
            header(tint)
            if let title = block.title {
                Text(title).ui(16, .semibold, look).foregroundStyle(look.palette.foreground)
            }
            if let subtitle = block.subtitle {
                Text(subtitle).ui(13, .regular, look).foregroundStyle(look.palette.mute).lineLimit(2)
            }
            if let buttons = block.buttons, !buttons.isEmpty {
                HStack(spacing: 8) {
                    ForEach(Array(buttons.enumerated()), id: \.offset) { _, button in
                        BlockNode(block: button)
                    }
                }
            }
            BlockStack(blocks: block.blocks ?? []).environment(
                \.card, CardContext(poster: context.poster, tint: tint))
        }
        .padding(14)
        .surface(look, radius: 20)
        .overlay(alignment: .leading) {
            if look.glass {
                RoundedRectangle(cornerRadius: look.radius(2)).fill(tint).frame(width: 3).padding(.vertical, 16)
            }
        }
        .modifier(BlockActs(menu: block.menu ?? []))
    }

    @ViewBuilder
    private func header(_ tint: Color) -> some View {
        let meta = block.meta
        let badge = block.badge
        if kind != nil || meta != nil || badge != nil {
            HStack(spacing: 6) {
                if let kind {
                    if !look.textMarks { Image(systemName: kind.symbol).font(.system(size: 12, weight: .bold)) }
                    Text(look.label(.kind, kind.label)).ui(11, .bold, look)
                }
                Spacer(minLength: 4)
                if let badge { Pill(badge: badge) }
                if let meta { Text(meta).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
            }
            .foregroundStyle(tint)
        }
    }
}

internal struct MissingPoster: View {
    @Environment(\.look) private var look
    internal let kind: String

    internal var body: some View {
        let label = "\(kind) · source unknown · not drawn"
        Label(look.label(.kind, label), systemImage: "exclamationmark.octagon.fill")
            .labelStyle(.titleAndIcon).ui(11, .bold, look).foregroundStyle(look.palette.red)
            .frame(maxWidth: .infinity, alignment: .leading).padding(14).surface(look, radius: 20)
    }
}

internal struct Pill: View {
    @Environment(\.look) private var look
    internal let badge: Blocks.Label

    internal var body: some View {
        let tint = look.palette.tone(badge.tone?.rawValue) ?? look.palette.mute
        Text(badge.text).ui(11, .bold, look).foregroundStyle(tint)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(tint.opacity(0.15), in: look.pill)
    }
}

internal struct ChoiceBlock: View {
    @Environment(\.look) private var look
    @State private var other = ""
    internal let block: Choice

    private var options: [ChoiceOption] {
        let recommended = block.recommended
        return block.options.filter { $0.value == recommended } + block.options.filter { $0.value != recommended }
    }

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 8) {
            if let question = block.question { Text(question).ui(15, .semibold, look) }
            ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                let source = Source(values: option.values, confirm: Confirmation(option.confirm, label: option.label))
                ActButton(action: block.action, source: source, values: values(option)) {
                    CardButton(
                        title: title(option),
                        primary: option.value == block.recommended,
                        tint: index == options.count - 1 && options.count > 1 ? palette.red : nil
                    )
                }
            }
            if let box = block.other {
                TextField(box.placeholder ?? "", text: $other).ui(14, .regular, look)
                    .padding(.horizontal, 12).frame(height: 38)
                    .background(palette.background.opacity(0.5), in: .rect(cornerRadius: look.radius(10)))
            }
            if let fallback = block.default {
                RelativeText(template: fallback.label ?? "", until: fallback.until.date)
                    .ui(12, .regular, look).foregroundStyle(palette.amber)
            }
        }
    }

    private func title(_ option: ChoiceOption) -> String {
        let recommended = option.value == block.recommended && !look.textMarks
        return recommended ? "\(option.label) · recommended" : option.label
    }

    private func values(_ option: ChoiceOption) -> [String: JSONValue] {
        let tied = block.other?.for
        let text = tied == nil || tied == option.value ? other : ""
        return ["choice": .string(option.value), "other": .string(text)]
    }
}

extension String {
    internal var date: Date? { try? Date(self, strategy: .iso8601) }
}
