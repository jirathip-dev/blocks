import Blocks
import SwiftUI

internal struct RoundButton: View {
    @Environment(\.look) private var look
    internal let symbol: String
    internal var ascii = ""
    internal var size: CGFloat = 40

    internal var body: some View {
        Mark(text: "[\(ascii)]", size: 15) {
            Image(systemName: symbol).font(.system(size: size * 0.42, weight: .semibold))
        }
        .fixedSize().foregroundStyle(look.palette.foreground).frame(minWidth: size, minHeight: size)
        .chip(look)
    }
}

internal struct CardButton: View {
    @Environment(\.look) private var look
    internal let title: String
    internal var primary = false
    internal var tint: Color?

    internal var body: some View {
        let palette = look.palette
        let tint = tint ?? palette.link
        Text(look.label(.button, title)).ui(15, primary ? .semibold : .regular, look)
            .foregroundStyle(primary ? (palette.dark ? Color.black : .white) : tint)
            .padding(.horizontal, 14).frame(height: 36).frame(maxWidth: .infinity)
            .background(primary ? tint : tint.opacity(look.outline ? 0 : 0.12), in: look.pill)
            .accessibilityLabel(title)
    }
}

internal struct Confirmation: Sendable, Equatable {
    internal let title: String
    internal let message: String?
    internal let accept: String
    internal let destructive: Bool
}

extension Confirmation {
    internal init?(_ confirm: Confirm?, label: String?, destructive: Bool = false) {
        guard confirm != nil || destructive else { return nil }
        self.init(
            title: confirm?.title ?? label ?? "", message: confirm?.message, accept: confirm?.ok ?? label ?? "OK",
            destructive: destructive || confirm?.destructive == true)
    }
}

internal struct Source {
    internal var action: String?
    internal var tap: Tap?
    internal var values: [String: JSONValue]?
    internal var confirm: Confirmation?

    internal func sent(_ action: String? = nil, values: [String: JSONValue] = [:]) -> BlockAction? {
        guard let name = action ?? self.action ?? tap?.action else { return nil }
        let own = tap?.values?.merging(self.values ?? [:]) { $1 } ?? self.values ?? [:]
        return BlockAction(action: name, values: own.merging(values) { $1 })
    }
}

extension Source {
    internal init(_ act: Act) {
        self.init(
            action: act.action, tap: act.tap, values: act.values,
            confirm: Confirmation(act.confirm, label: act.label, destructive: act.tone?.rawValue == "bad"))
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

extension String {
    internal var date: Date? { try? Date(self, strategy: .iso8601) }
}
