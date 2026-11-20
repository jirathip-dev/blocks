import Blocks
import SwiftUI

/// The row under a table's or list's last row while it has `more`: it asks once as it appears, then for each new page while it is in view, and turns into a retry if the app refuses.
internal struct MoreRow: View {
    @Environment(\.look) private var look
    @Environment(\.act) private var act
    @Environment(\.acted) private var acted
    internal let page: Page
    internal var held = false
    @State private var asked: String?
    @State private var failed = false
    @State private var seen = false

    internal var body: some View {
        HStack(spacing: Scale.gap) {
            if failed {
                Text("Couldn’t load more.")
                Button("load more") { (asked, failed) = (nil, false); ask() }.buttonStyle(.plain).foregroundStyle(look.palette.link)
            } else {
                Text(held ? "more below · loads once the row is placed" : "Loading more ↻")
            }
            Spacer(minLength: 0)
        }
        .ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute)
        .frame(minHeight: 44).padding(.horizontal, Scale.pad * 3)
        .overlay(alignment: .leading) { if failed { Rectangle().fill(look.palette.red).frame(width: Scale.mark) } }
        .accessibilityElement(children: .combine)
        .accessibilityValue(failed || held ? "" : "loading")
        .onAppear(perform: ask)
        .onScrollVisibilityChange(threshold: 0.01) { seen = $0; if $0 { ask() } }
        .onChange(of: page.cursor) { failed = false; if seen { ask() } }
        .onChange(of: held) { if seen { ask() } }
    }

    private func ask() {
        guard asked != page.cursor, !held else { return }
        asked = page.cursor
        let a = BlockAction(action: page.action, values: ["cursor": .string(page.cursor)])
        Task { @MainActor in
            var ok = true
            if let acted { ok = await acted(a) } else { act(a) }
            failed = !ok
        }
    }
}

/// Says how many rows a page brought, once a table or list that had `more` grows.
internal struct PageSaid: ViewModifier {
    internal let count: Int
    internal let paging: Bool
    @State private var was = false

    internal func body(content: Content) -> some View {
        content
            .onAppear { was = paging }
            .onChange(of: paging) { if paging { was = true } }
            .onChange(of: count) { old, new in
                if was, new > old { AccessibilityNotification.Announcement("\(new - old) more row\(new - old == 1 ? "" : "s") loaded, \(new) in all").post() }
                was = paging
            }
    }
}
