import Blocks
import SwiftUI

private struct ActedKey: EnvironmentKey {
    fileprivate static var defaultValue: (@MainActor (BlockAction) async -> Bool)? { nil }
}

extension EnvironmentValues {
    internal var acted: (@MainActor (BlockAction) async -> Bool)? {
        get { self[ActedKey.self] }
        set { self[ActedKey.self] = newValue }
    }
}

private func announce(_ text: String) { AccessibilityNotification.Announcement(text).post() }

private func live<C>(_ p: Phase<C>?) -> Bool {
    switch p {
    case .pressed?, .dragging?, .previewing?: true
    default: false
    }
}

/// One item's gesture: a held drag, its keys and its named actions feed one machine; `show` draws a candidate.
internal struct Gestured<R: Rules>: ViewModifier where R.Change: Sendable {
    @Environment(\.act) private var act
    @Environment(\.acted) private var acted
    @Environment(\.accessibilityReduceMotion) private var still
    internal let rules: R
    internal let grab: R.Grab
    internal let gesture: Blocks.Gesture
    internal let label: String
    internal let reach: (CGSize) -> R.Reach
    internal let value: (R.Change) -> JSONValue
    internal let show: (R.Change?) -> Void
    @State private var driven: Driven<R>?

    internal func body(content: Content) -> some View {
        if let base = Driven(rules, grab) {
            let phase = driven?.phase ?? .idle
            content
                .opacity(phase == .dragging ? 0.6 : phase == .idle || phase == .pressed ? 1 : 0.5)
                .scaleEffect(phase == .pressed ? 1.02 : 1).animation(still ? nil : .snappy, value: phase)
                .gesture(
                    LongPressGesture(minimumDuration: 0.3).sequenced(before: DragGesture(coordinateSpace: .global))
                        .onChanged { if case .second(true, let d?) = $0 { moved(base) { $0.reach(reach(d.translation)) } } }
                        .onEnded { _ in released() }
                )
                .focusable()
                .onKeyPress(keys: [.space, .return, .escape, .upArrow, .downArrow, .leftArrow, .rightArrow]) { key($0, base) }
                .accessibilityLabel(label)
                .accessibilityActions {
                    ForEach(rules.steps(grab), id: \.0) { step in
                        Button(step.0) {
                            var d = base
                            if case .send(let c)? = d.named(step.1) { sent(c, d) }
                        }
                    }
                }
        } else {
            content
        }
    }

    private func moved(_ base: Driven<R>, _ change: (inout Driven<R>) -> Void) {
        var d = driven ?? base
        if case .sent = d.phase { return }
        if d.phase == .idle {
            d.on(.press)
            announce("\(label), grabbed, \(rules.says(grab, d.start))")
        }
        change(&d)
        driven = d
        show(d.candidate)
        if let c = d.candidate { announce(rules.says(grab, c)) }
    }

    private func released() {
        guard var d = driven else { return }
        if case .send(let c)? = d.on(.release) { return sent(c, d) }
        driven = nil
        show(nil)
    }

    private func key(_ press: KeyPress, _ base: Driven<R>) -> KeyPress.Result {
        let dirs: [KeyEquivalent: Nudge.Dir] = [.upArrow: .up, .downArrow: .down, .leftArrow: .left, .rightArrow: .right]
        switch (press.key, live(driven?.phase)) {
        case (.space, false): moved(base) { _ in }
        case (let k, true) where dirs[k] != nil:
            moved(base) { $0.nudge(Nudge(dirs[k] ?? .up, big: press.modifiers.contains(.shift))) }
        case (.space, true), (.return, true):
            if driven?.phase == .pressed { cancel() } else { released() }
        case (.escape, true): cancel()
        default: return .ignored
        }
        return .handled
    }

    private func cancel() {
        driven = nil
        show(nil)
    }

    private func sent(_ c: R.Change, _ d: Driven<R>) {
        driven = d
        show(c)
        announce("Sending")
        let a = BlockAction(action: gesture.action, values: [gesture.name: value(c)])
        Task { @MainActor in
            var ok = true
            if let acted { ok = await acted(a) } else { act(a) }
            driven = nil
            show(nil)
            announce(ok ? rules.says(grab, c) : "Not changed")
        }
    }
}

/// The one pinch and double-tap zoom: the image viewer's, and later pages' and marks'.
internal struct Zoomed: ViewModifier {
    @State private var scale: CGFloat = 1
    @State private var base: CGFloat = 1
    internal let most: CGFloat

    internal func body(content: Content) -> some View {
        content.scaleEffect(scale)
            .gesture(
                MagnifyGesture()
                    .onChanged { scale = min(most, max(1, base * $0.magnification)) }
                    .onEnded { _ in base = scale }
            )
            .onTapGesture(count: 2) { (scale, base) = scale > 1 ? (1, 1) : (2.5, 2.5) }
            .accessibilityAction(named: "Zoom in") { (scale, base) = (min(most, scale * 1.25), min(most, scale * 1.25)) }
            .accessibilityAction(named: "Zoom out") { (scale, base) = (max(1, scale / 1.25), max(1, scale / 1.25)) }
    }
}

/// What a typed cell tells its table: the typed candidate, a sent edit, and its answer.
internal struct TypedOut {
    internal let preview: (CellEdit?) -> Void
    internal let sent: (CellEdit, Bool?) -> Void
    internal let next: () -> Void
}

/// One typed cell, as `Gestured` is one drag: focus presses, typing previews, Return or leaving sends once, Escape puts it back.
internal struct Typed: View {
    @Environment(\.act) private var act
    @Environment(\.acted) private var acted
    internal let table: Blocks.Table
    internal let row: String
    internal let column: Column
    internal let label: String
    internal let out: TypedOut
    internal let cursor: FocusState<String?>.Binding
    internal let key: String
    @State private var text = ""
    @State private var driven: Driven<Blocks.Table>?

    private var grab: GridGrab { .cell(row: row, column: column.id) }
    private var was: String {
        switch table.rows.first(where: { $0.id == row })?.cells[column.id] {
        case .number(let n)?: Expr.cat([.lit(.number(n))]).eval([:]).json.string ?? ""
        case .string(let s)?: s
        default: ""
        }
    }

    internal var body: some View {
        TextField(label, text: $text)
            .focused(cursor, equals: key)
            .multilineTextAlignment(column.end ? .trailing : .leading)
            .onAppear { text = was }
            .onChange(of: was) { text = was }
            .onChange(of: cursor.wrappedValue == key) { _, focused in
                guard focused else { return release() }
                driven = Driven(table, grab)
                driven?.on(.press)
            }
            .onChange(of: text) {
                guard var d = driven else { return }
                d.reach(.text(text))
                driven = d
                if case .cell(let e)? = d.candidate { out.preview(e) }
            }
            .onSubmit {
                release()
                out.next()
            }
            .onKeyPress(.escape) {
                driven?.on(.cancel)
                driven = nil
                text = was
                out.preview(nil)
                return .handled
            }
            .accessibilityLabel(label)
    }

    private func release() {
        guard var d = driven, let edit = table.edit else { return }
        driven = nil
        out.preview(nil)
        guard case .send(let c)? = d.on(.release), case .cell(let e) = c else { return text = was }
        out.sent(e, nil)
        announce("Sending")
        let a = BlockAction(action: edit.action, values: [edit.name: c.json])
        Task { @MainActor in
            var ok = true
            if let acted { ok = await acted(a) } else { act(a) }
            out.sent(e, ok)
            if !ok { text = was }
            announce(ok ? table.says(grab, c) : "Not changed")
        }
    }
}
