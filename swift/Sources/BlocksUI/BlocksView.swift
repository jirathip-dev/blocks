import Blocks
import SwiftUI

public struct BlocksView: View {
    /// The padding a host puts around the blocks; a full-bleed block cancels it.
    public static let inset: CGFloat = 16

    private let block: Block
    private let source: LayoutSource?
    private let act: @MainActor (BlockAction) -> Void
    private let open: @MainActor (String) -> Void
    private let openBeside: (@MainActor (String) -> Void)?
    private let pending: Set<String>
    private let openThread: @MainActor (String) -> Void
    private let refresh: (@MainActor () -> Void)?
    private let acted: (@MainActor (BlockAction) async -> Bool)?
    private let focus: String?
    private let picked: String?
    private let beside: Block?
    private let edits: BlockState
    @State private var own: BlockState = [:]
    @Environment(\.opened) private var opened
    @State private var flipped: Set<String> = []

    public var body: some View {
        let edited = edits.merging(own) { $1 }
        let json = (try? JSONValue(block)) ?? .null
        let state = Behaviour.state(json, edits: edited)
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
        .environment(\.act, act).environment(\.acted, acted).environment(\.open, open).environment(\.refresh, refresh)
        .environment(\.openBeside, openBeside).environment(\.pending, pending)
        .environment(\.openThread, openThread).environment(\.focus, focus).environment(\.picked, picked)
        .environment(\.card, CardContext(poster: source)).environment(\.screenId, block.id)
        .environment(\.behaved, Behaved(view: Behaviour(json, state: state), state: state, edited: Set(edited.keys), seek: seeks(json, state: state)))
        .environment(\.edit) { own.merge($0) { $1 } }
        .environment(\.folds, Folds(open: opened.symmetricDifference(flipped)) { flipped.formSymmetricDifference([$0]) })
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
        openBeside: (@MainActor (String) -> Void)? = nil,
        pending: Set<String> = [],
        openThread: @escaping @MainActor (String) -> Void = { _ in },
        refresh: (@MainActor () -> Void)? = nil,
        acted: (@MainActor (BlockAction) async -> Bool)? = nil
    ) {
        self.refresh = refresh
        self.acted = acted
        self.edits = state
        self.block = block
        self.source = source
        self.act = act
        self.open = open
        self.openBeside = openBeside
        self.pending = pending
        self.openThread = openThread
        self.focus = focus
        self.picked = picked
        self.beside = beside
    }
}

/// Who posted the cards below and the tint they take; the `card` environment entry.
public struct CardContext {
    public var poster: LayoutSource?
    public var tint: Color?

    public init(poster: LayoutSource? = nil, tint: Color? = nil) {
        (self.poster, self.tint) = (poster, tint)
    }
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

/// The tools drawn open, by id, and how a head opens or folds its tool.
internal struct Folds {
    internal var open: Set<String> = []
    internal var flip: @MainActor (String) -> Void = { _ in }
}

extension View {
    /// Draws the tools of these ids open, as a tap on each head does; for the harness.
    package func opened(_ ids: Set<String>) -> some View { environment(\.opened, ids) }
}

/// The local state a screen is drawn in and what it makes of the screen.
internal struct Behaved {
    internal var view = Behaviour()
    internal var state: BlockState = [:]
    internal var edited: Set<String> = []
    internal var seek: [String: Seek] = [:]
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
    /// The card context the blocks below are drawn in.
    @Entry public var card = CardContext()
    @Entry internal var form: Binding<[String: JSONValue]>?
    @Entry internal var behaved = Behaved()
    @Entry internal var actionBlock: String?
    @Entry internal var opened: Set<String> = []
    @Entry internal var folds = Folds()
    @Entry internal var pending: Set<String> = []

    internal var edit: @MainActor (BlockState) -> Void {
        get { self[EditKey.self] }
        set { self[EditKey.self] = newValue }
    }

    internal var act: @MainActor (BlockAction) -> Void {
        get {
            let (act, block) = (self[ActKey.self], actionBlock)
            return { act($0.from(block)) }
        }
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
