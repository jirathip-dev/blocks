import Blocks
import SwiftUI

/// What an act sends: its action, tap and values, and the confirmation it asks first.
public struct Source {
    internal var action: String?
    internal var tap: Tap?
    internal var values: [String: JSONValue]?
    internal var confirm: Confirmation?

    public init(action: String? = nil, tap: Tap? = nil, values: [String: JSONValue]? = nil) {
        (self.action, self.tap, self.values) = (action, tap, values)
    }

    internal init(action: String? = nil, tap: Tap? = nil, values: [String: JSONValue]? = nil, confirm: Confirmation?) {
        (self.action, self.tap, self.values, self.confirm) = (action, tap, values, confirm)
    }

    internal func sent(_ action: String? = nil, values: [String: JSONValue] = [:]) -> BlockAction? {
        guard let name = action ?? self.action ?? tap?.action else { return nil }
        let own = tap?.values?.merging(self.values ?? [:]) { $1 } ?? self.values ?? [:]
        return BlockAction(action: name, values: own.merging(values) { $1 })
    }
}

extension Source {
    /// An act's source; a `bad` tone or a `confirm` asks first.
    public init(_ act: Act) {
        self.init(
            action: act.action, tap: act.tap, values: act.values,
            confirm: Confirmation(act.confirm, label: act.label, destructive: act.tone?.rawValue == "bad"))
    }
}
