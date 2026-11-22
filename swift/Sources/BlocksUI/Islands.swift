import Blocks
import SwiftUI

/// Sends an island's event by name with its values; a name outside the island's `events` is dropped.
public typealias IslandSend = @MainActor (String, [String: JSONValue]) -> Void

/// Draws an island's component from its props, given its `send`.
public typealias IslandDraw = @MainActor @Sendable (JSONValue, @escaping IslandSend) -> AnyView

extension View {
    /// Draws each island with the app's view of its name; an island with none draws its fallback.
    public func islands(_ views: [String: IslandDraw]) -> some View {
        transformEnvironment(\.islands) { $0.merge(views) { $1 } }
    }

    /// Hears every event an island sends: its block id, its name and its values, nil when dropped, for the harness.
    package func hearsIslands(_ heard: @escaping @MainActor (String, String, [String: JSONValue]?) -> Void) -> some View {
        environment(\.heard, heard)
    }
}

private struct HeardKey: EnvironmentKey {
    fileprivate static var defaultValue: (@MainActor (String, String, [String: JSONValue]?) -> Void)? { nil }
}

extension EnvironmentValues {
    @Entry internal var islands: [String: IslandDraw] = [:]

    internal var heard: (@MainActor (String, String, [String: JSONValue]?) -> Void)? {
        get { self[HeardKey.self] }
        set { self[HeardKey.self] = newValue }
    }
}
