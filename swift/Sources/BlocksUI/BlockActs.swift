import Blocks
import SwiftUI

internal struct BlockActs: ViewModifier {
    @Environment(\.act) private var act
    @Environment(\.look) private var look
    @State private var pending: Source?
    @State private var open: Bool?
    internal let menu: [Act]
    internal var swipe: [Act] = []

    private var shown: Bool { !swipe.isEmpty && open == true }

    private var acts: [Act] {
        #if os(iOS)
            menu
        #else
            menu + swipe
        #endif
    }

    internal func body(content: Content) -> some View {
        swiping(content)
            .contextMenu { MenuItems(acts: acts, run: ask) }
            .modifier(Confirming(pending: $pending, run: run))
    }

    @ViewBuilder
    private func swiping(_ content: Content) -> some View {
        if swipe.isEmpty {
            content
        } else {
            content.offset(x: shown ? -CGFloat(swipe.count) * SwipeButtons.width : 0)
                .overlay(alignment: .trailing) {
                    if shown {
                        SwipeButtons(acts: swipe) { item in
                            open = false
                            ask(item)
                        }
                    }
                }
                .clipped()
                #if os(iOS)
                    .simultaneousGesture(drag)
                #endif
                .animation(.snappy(duration: 0.5 * (look.style.motion ?? 1)), value: shown)
        }
    }

    #if os(iOS)
        private var drag: some Gesture {
            DragGesture(minimumDistance: 24).onEnded { drag in
                let (across, down) = (drag.translation.width, drag.translation.height)
                if abs(across) > abs(down) { open = across < 0 }
            }
        }
    #endif

    private func ask(_ item: Act) {
        let source = Source(item)
        if source.confirm == nil { run(source) } else { pending = source }
    }

    private func run(_ source: Source) {
        if let action = source.sent() { act(action) }
    }
}

/// Acts as menu buttons, a `bad` tone destructive; `run` gets the picked one.
public struct MenuItems: View {
    private let acts: [Act]
    private let run: (Act) -> Void

    public init(acts: [Act], run: @escaping (Act) -> Void) {
        (self.acts, self.run) = (acts, run)
    }

    public var body: some View {
        ForEach(Array(acts.enumerated()), id: \.offset) { _, item in
            Button(item.label, role: item.tone?.rawValue == "bad" ? .destructive : nil) { run(item) }
                .modifier(Identified(id: Source(item).sent()?.action, action: true))
        }
    }
}

private struct SwipeButtons: View {
    fileprivate static let width: CGFloat = 76
    @Environment(\.look) private var look
    fileprivate let acts: [Act]
    fileprivate let run: (Act) -> Void

    fileprivate var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(acts.enumerated()), id: \.offset) { _, item in
                Button {
                    run(item)
                } label: {
                    Text(item.label).ui(13, .semibold, look).foregroundStyle(look.palette.background)
                        .frame(width: Self.width).frame(maxHeight: .infinity)
                        .background(look.palette.tone(item.tone?.rawValue) ?? look.palette.link)
                }
                .buttonStyle(.plain)
                .modifier(Identified(id: Source(item).sent()?.action, action: true))
            }
        }
    }
}

private struct RefreshKey: EnvironmentKey {
    fileprivate static var defaultValue: (@MainActor () -> Void)? { nil }
}

extension EnvironmentValues {
    internal var refresh: (@MainActor () -> Void)? {
        get { self[RefreshKey.self] }
        set { self[RefreshKey.self] = newValue }
    }
}

/// Pull to refresh when `refresh` is set; the content as it is otherwise.
public struct Refreshing: ViewModifier {
    private let refresh: (@MainActor () -> Void)?

    public init(refresh: (@MainActor () -> Void)?) {
        self.refresh = refresh
    }

    public func body(content: Content) -> some View {
        if let refresh { content.refreshable { refresh() } } else { content }
    }
}
