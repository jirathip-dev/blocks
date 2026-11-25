import AppIntents
import Blocks
import SwiftUI

internal struct GlanceHand: Sendable {
    internal let link: @Sendable (Tap) -> URL?
    internal let intent: @Sendable (BlockAction) -> (any AppIntent)?
}

extension EnvironmentValues {
    @Entry internal var glanceHand: GlanceHand?
}

extension View {
    /// How a glance's taps leave: a tap's link, an action's intent. An act with neither is not drawn.
    public func glanceTaps(
        link: @escaping @Sendable (Tap) -> URL?, intent: @escaping @Sendable (BlockAction) -> (any AppIntent)?
    ) -> some View {
        environment(\.glanceHand, GlanceHand(link: link, intent: intent))
    }
}

internal struct GlanceLink<Content: View>: View {
    @Environment(\.glanceHand) private var hand
    internal let tap: Tap?
    @ViewBuilder internal let content: Content

    internal var body: some View {
        if let tap, let url = hand?.link(tap) {
            Link(destination: url) { content }.buttonStyle(.plain)
        } else {
            content
        }
    }
}

internal struct GlanceAct: View {
    @Environment(\.look) private var look
    @Environment(\.glanceHand) private var hand
    internal let act: Act
    internal let glance: String?

    internal var body: some View {
        if let tap = act.tap, let url = hand?.link(tap) {
            Link(destination: url) { label }.buttonStyle(.plain)
        } else if let action = act.action,
            let intent = hand?.intent(BlockAction(action: action, block: glance, values: act.values ?? [:]))
        {
            Button(intent: intent) { label }.buttonStyle(.plain)
        }
    }

    private var label: some View {
        let tint = look.palette.tone(act.tone?.rawValue) ?? look.palette.link
        return Text(look.label(.button, act.label)).ui(GlanceScale.text, .semibold, look).lineLimit(1)
            .foregroundStyle(look.solid ? look.palette.background : tint).padding(.horizontal, GlanceScale.act)
            .frame(height: GlanceScale.actHigh)
            .background(look.outline ? Color.clear : tint.opacity(look.solid ? 1 : 0.16), in: look.pill)
            .overlay { if look.outline { look.pill.stroke(tint, lineWidth: 1) } }
    }
}
