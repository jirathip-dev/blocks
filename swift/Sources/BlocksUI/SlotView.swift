import Blocks
import SwiftUI

/// A resolved layout drawn: `nav` sets its `column` nodes beside its first `main` node, every other node is the app's.
public struct SlotView<Content: View>: View {
    internal let node: LayoutNode<LayoutPlace>
    private let content: (LayoutNode<LayoutPlace>) -> Content

    public init(_ node: LayoutNode<LayoutPlace>, @ViewBuilder content: @escaping (LayoutNode<LayoutPlace>) -> Content) {
        (self.node, self.content) = (node, content)
    }

    public var body: some View {
        if node.place != .hidden {
            Group {
                if node.content == .component("nav") { nav } else { content(node) }
            }
            .transition(node.transition.entering)
        }
    }

    private var nav: some View {
        let columns = node.slots.keys.sorted().flatMap { node.slots[$0] ?? [] }.filter { $0.place == .column }
        let main = node.slots["main"]?.first { [.push, .panel, .inline].contains($0.place) }
        return HStack(alignment: .top, spacing: 0) {
            ForEach(columns, id: \.id) { SlotView($0, content: content) }
            if let main { SlotView(main, content: content).frame(maxWidth: .infinity) }
        }
    }
}

extension LayoutTransition {
    /// How a node placed with this transition comes in.
    public var entering: AnyTransition {
        switch self {
        case .sheet: .move(edge: .bottom)
        case .fade: .opacity
        case .none: .identity
        default: .push(from: .trailing)
        }
    }
}
