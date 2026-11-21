import Blocks
import SwiftUI

/// A composer's send in flight: its nonce, kept for a retry until the send lands or the draft changes.
internal struct Outbox {
    private var nonce: String?

    internal mutating func values(_ text: String, picks: [String: JSONValue], q: UInt64?) -> [String: JSONValue] {
        let nonce = nonce ?? UUID().uuidString
        self.nonce = nonce
        var values = picks.merging(["text": .string(text), "nonce": .string(nonce)]) { $1 }
        if let q { values["q"] = .number(Double(q)) }
        return values
    }

    internal mutating func settle(_ ok: Bool) { if ok { nonce = nil } }

    internal mutating func edited() { nonce = nil }
}

internal struct ComposerBlock: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @Environment(\.acted) private var acted
    @State private var draft = ""
    @State private var picks: [String: JSONValue] = [:]
    @State private var editing: Queued?
    @State private var outbox = Outbox()
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
        .onChange(of: draft) { outbox.edited() }
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
        let action = steer ?? queue ?? block.action
        let values = outbox.values(draft, picks: picks, q: queue == nil ? nil : editing?.q)
        let a = BlockAction(action: action, values: (block.values ?? [:]).merging(values) { $1 })
        Task { @MainActor in
            var ok = true
            if let acted { ok = await acted(a) } else { act(a) }
            outbox.settle(ok)
            if ok { (draft, editing) = ("", nil) }
        }
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
