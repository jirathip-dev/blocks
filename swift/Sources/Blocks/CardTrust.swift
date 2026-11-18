/// Who posted a screen: the app's core or one of its plugins.
public enum LayoutSource: Sendable, Equatable {
    case core
    case plugin(String)
}

/// The trust rule: a card's poster is the slot it sits in, never a field of its JSON.
public enum CardTrust {
    /// The kinds a card draws only with a known poster.
    public static let guarded: Set<String> = ["secret", "run", "confirm", "permissions"]

    /// Whether a card of `kind` from `poster` draws: a guarded kind needs a poster; only core posts `permissions`.
    public static func draws(_ kind: String?, from poster: LayoutSource?) -> Bool {
        guard let kind, guarded.contains(kind) else { return true }
        guard let poster else { return false }
        return kind != "permissions" || poster == .core
    }
}
