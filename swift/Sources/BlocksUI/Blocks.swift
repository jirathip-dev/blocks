import Blocks
import SwiftUI

public struct BlocksView: View {
    /// The padding a host puts around the blocks; a full-bleed block cancels it.
    public static let inset: CGFloat = 16

    private let block: JSONValue
    private let source: LayoutSource?
    private let act: @MainActor (BlockAction) -> Void
    private let open: @MainActor (String) -> Void
    private let openThread: @MainActor (String) -> Void
    private let refresh: (@MainActor () -> Void)?
    private let focus: String?
    private let picked: String?
    private let beside: JSONValue?
    private let edits: BlockState
    @State private var own: BlockState = [:]

    public var body: some View {
        let edited = edits.merging(own) { $1 }
        let state = Behaviour.state(block, edits: edited)
        return Group {
            if let beside {
                HStack(alignment: .top, spacing: 24) {
                    BlockNode(block: block).fixedSize(horizontal: true, vertical: false)
                    BlockNode(block: beside).frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                BlockNode(block: block)
            }
        }
        .environment(\.act, act).environment(\.open, open).environment(\.refresh, refresh)
        .environment(\.openThread, openThread).environment(\.focus, focus).environment(\.picked, picked)
        .environment(\.card, CardContext(poster: source))
        .environment(\.behaved, Behaved(view: Behaviour(block, state: state), state: state, edited: Set(edited.keys)))
        .environment(\.edit) { own.merge($0) { $1 } }
    }

    public init(
        _ block: Block,
        source: LayoutSource?,
        focus: String? = nil,
        picked: String? = nil,
        beside: Block? = nil,
        state: BlockState = [:],
        act: @escaping @MainActor (BlockAction) -> Void = { _ in },
        open: @escaping @MainActor (String) -> Void = { _ in },
        openThread: @escaping @MainActor (String) -> Void = { _ in },
        refresh: (@MainActor () -> Void)? = nil
    ) {
        self.refresh = refresh
        self.edits = state
        self.block = (try? JSONValue(block)) ?? .null
        self.source = source
        self.act = act
        self.open = open
        self.openThread = openThread
        self.focus = focus
        self.picked = picked
        self.beside = beside.flatMap { try? JSONValue($0) }
    }
}

internal struct CardContext {
    internal var poster: LayoutSource?
    internal var tint: Color?
}

private struct ActKey: EnvironmentKey {
    fileprivate static var defaultValue: @MainActor (BlockAction) -> Void { { _ in } }
}

private struct OpenKey: EnvironmentKey {
    fileprivate static var defaultValue: @MainActor (String) -> Void { { _ in } }
}

private struct OpenThreadKey: EnvironmentKey {
    fileprivate static var defaultValue: @MainActor (String) -> Void { { _ in } }
}

/// The local state a screen is drawn in and what it makes of the screen.
internal struct Behaved {
    internal var view = Behaviour()
    internal var state: BlockState = [:]
    internal var edited: Set<String> = []
}

private struct EditKey: EnvironmentKey {
    fileprivate static var defaultValue: @MainActor (BlockState) -> Void { { _ in } }
}

private struct OpenBesideKey: EnvironmentKey {
    fileprivate static var defaultValue: (@MainActor (String) -> Void)? { nil }
}

extension EnvironmentValues {
    @Entry internal var focus: String?
    @Entry internal var picked: String?
    @Entry internal var card = CardContext()
    @Entry internal var form: Binding<[String: JSONValue]>?
    @Entry internal var behaved = Behaved()

    internal var edit: @MainActor (BlockState) -> Void {
        get { self[EditKey.self] }
        set { self[EditKey.self] = newValue }
    }

    internal var act: @MainActor (BlockAction) -> Void {
        get { self[ActKey.self] }
        set { self[ActKey.self] = newValue }
    }

    internal var open: @MainActor (String) -> Void {
        get { self[OpenKey.self] }
        set { self[OpenKey.self] = newValue }
    }

    internal var openThread: @MainActor (String) -> Void {
        get { self[OpenThreadKey.self] }
        set { self[OpenThreadKey.self] = newValue }
    }

    internal var openBeside: (@MainActor (String) -> Void)? {
        get { self[OpenBesideKey.self] }
        set { self[OpenBesideKey.self] = newValue }
    }
}

extension Palette {
    internal func tone(_ name: String?) -> Color? {
        switch name {
        case "ok", "done": green
        case "warn", "needs": amber
        case "bad", "fail": red
        case "info": link
        case "working": cyan
        case "accent": lead
        case "mute", "idle": mute
        default: nil
        }
    }
}

internal struct BlockNode: View {
    @Environment(\.behaved) private var behaved
    internal let block: JSONValue

    internal var body: some View {
        if let id = block.id, behaved.view.hidden.contains(id) {
            Color.clear.frame(width: 0, height: 0).modifier(Reported(block: block, hidden: true))
        } else {
            drawn.disabled(!["form", "config"].contains(block.type) && block.id.map(behaved.view.disabled.contains) == true)
        }
    }

    private var drawn: some View {
        Group {
            switch block.type {
            case "screen", "sheet", "section", "list": GroupBlock(block: block)
            case "card": CardBlock(block: block)
            case "row", "text", "stat", "chips", "button", "web": LeafBlock(block: block)
            case "choice", "secret", "run": AnswerBlock(block: block)
            case "form", "config": FieldsBlock(block: block)
            case "images": ImagesBlock(block: block)
            case "scene": LaneStage(block: block)
            case "diff": DiffBlock(block: block)
            case "editor": EditorBlock(block: block)
            case "diagram": DiagramBlock(block: block)
            case "composer": ComposerBlock(block: block)
            case "prose": ProseBlock(block: block)
            case "media": MediaBlock(block: block)
            case "hero": HeroBlock(block: block)
            case "nav": NavBlock(block: block)
            default: AppBlockView(block: block)
            }
        }
        .modifier(Styled(type: block.type)).modifier(Reported(block: block))
    }
}

internal struct BlockStack: View {
    internal let blocks: [JSONValue]
    internal var spacing: CGFloat = 10

    internal var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in BlockNode(block: block) }
        }
    }
}

internal struct RelativeText: View {
    internal let template: String
    internal let until: Date?

    internal var body: some View {
        TimelineView(.everyMinute) { context in
            Text(Relative.filled(template, until: until, at: context.date))
        }
    }
}

internal struct GroupBlock: View {
    @Environment(\.look) private var look
    @Environment(\.refresh) private var refresh
    internal let block: JSONValue

    internal var body: some View {
        switch block.type {
        case "screen": screen
        case "sheet": SheetBlock(block: block)
        case "section": section
        default: ListBlock(block: block)
        }
    }

    private var screen: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(block.string("title") ?? "").ui(block["large"]?.bool == false ? 17 : 30, .bold, look)
                Spacer(minLength: 4)
                ForEach(Array(block.list("actions").enumerated()), id: \.offset) { _, item in
                    ToolbarItemView(item: item)
                }
                if block["refresh"]?.bool == true, let refresh {
                    Button(action: refresh) { RoundButton(symbol: "arrow.clockwise", ascii: "r", size: 36) }
                        .buttonStyle(.plain).accessibilityLabel("Refresh")
                }
                if let done = block["done"] { DoneButton(done: done) }
            }
            BlockStack(blocks: block.list("blocks"), spacing: 14)
        }
    }

    private var section: some View {
        let palette = look.palette
        return VStack(alignment: .leading, spacing: 6) {
            if let header = block.string("header") {
                Text(look.label(.header, header)).ui(12, .semibold, look)
                    .foregroundStyle(palette.mute)
            }
            BlockStack(blocks: block.list("blocks"))
            if let footer = block.string("footer") { Text(footer).ui(12, .regular, look).foregroundStyle(palette.mute) }
        }
    }
}

internal struct ToolbarItemView: View {
    internal let item: JSONValue

    private var symbol: String {
        let symbols = [
            "plus": "plus", "gear": "gearshape", "share": "square.and.arrow.up", "info": "info.circle",
            "filter": "line.3.horizontal.decrease", "more": "ellipsis",
        ]
        return symbols[item.string("icon") ?? ""] ?? "ellipsis"
    }

    internal var body: some View {
        let icon = RoundButton(symbol: symbol, ascii: item.string("label") ?? "", size: 36)
            .accessibilityLabel(item.string("label") ?? "")
        if item["menu"] == nil {
            ActButton(source: item) { icon }
        } else {
            Menu {
                ForEach(Array(item.list("menu").enumerated()), id: \.offset) { _, entry in
                    ActButton(source: entry) { Text(entry.string("label") ?? "") }
                }
            } label: {
                icon
            }
            .buttonStyle(.plain)
        }
    }
}

internal struct SheetBlock: View {
    @Environment(\.look) private var look
    @State private var values: [String: JSONValue] = [:]
    internal let block: JSONValue

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(block.string("cancel") ?? "").ui(16, .regular, look).foregroundStyle(palette.link)
                Spacer()
                Text(block.string("title") ?? "").ui(16, .semibold, look)
                Spacer()
                if let done = block["done"] { DoneButton(done: done, values: block.fieldValues.merging(values) { $1 }) }
            }
            BlockStack(blocks: block.list("blocks"), spacing: 14).environment(\.form, $values)
        }
    }
}
