import Blocks
import SwiftUI

/// A tapped act: confirms if asked, sets local state, then follows the tap's link, thread or sheet, or sends its action.
public struct ActButton<Label: View>: View {
    @Environment(\.act) private var act
    @Environment(\.behaved) private var behaved
    @Environment(\.edit) private var edit
    @Environment(\.openURL) private var openURL
    @Environment(\.openThread) private var openThread
    @Environment(\.open) private var open
    @Environment(\.openBeside) private var openBeside
    @Environment(\.pending) private var sent
    @State private var pending: Source?
    private let action: String?
    private let source: Source
    private let values: [String: JSONValue]
    private let label: Label

    public init(
        action: String? = nil, source: Source, values: [String: JSONValue] = [:], @ViewBuilder label: () -> Label
    ) {
        (self.action, self.source, self.values, self.label) = (action, source, values, label())
    }

    public var body: some View {
        Button {
            if source.confirm == nil { fire() } else { pending = source }
        } label: {
            label
        }
        .buttonStyle(.plain)
        .modifier(Confirming(pending: $pending) { _ in fire() })
        .modifier(Identified(id: sends, action: true))
        .disabled(sends.map { behaved.view.acts.contains($0) || sent.contains($0) } == true)
        .opacity(sends.map(sent.contains) == true ? 0.5 : 1)
    }

    private var sends: String? {
        let tap = source.tap
        return tap?.url ?? tap?.thread ?? tap?.open ?? tap?.sheet == nil ? source.sent(action)?.action : nil
    }

    private func fire() {
        let tap = source.tap
        let set = Behaviour.tap(tap?.set ?? [], state: behaved.state)
        if !set.isEmpty { edit(set) }
        if let link = tap?.url, linkable(link), let url = URL(string: link) {
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
