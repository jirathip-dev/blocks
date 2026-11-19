import Blocks
import SwiftUI

/// An app's own block kinds, drawn by name; a core kind's name is refused.
public struct AppBlocks: Sendable {
    public typealias Draw = @MainActor @Sendable (JSONValue) -> AnyView

    internal let views: [String: Draw]

    public init(_ views: [String: Draw]) throws(AppBlocksError) {
        if let clash = views.keys.sorted().first(where: Self.isCore) { throw .clash(clash) }
        self.views = views
    }

    /// Whether `type` is a core kind: the generated decoder takes it for one of its own.
    public static func isCore(_ type: String) -> Bool {
        guard let block = try? JSONValue.object(["type": .string(type)]).decode(Block.self) else { return true }
        guard case .appBlock = block else { return true }
        return false
    }
}

public enum AppBlocksError: Error, Equatable, Sendable {
    case clash(String)
}

/// Wraps the drawn content of every block of one kind, core or the app's.
public protocol BlockStyle: ViewModifier, Sendable {}

extension View {
    /// Draws the app's own kinds with `blocks`; a kind with no view draws its fallback.
    public func appBlocks(_ blocks: AppBlocks) -> some View {
        environment(\.appBlocks, blocks)
    }

    /// Wraps every block of `type` in `style`.
    public func blockStyle(_ type: String, _ style: some BlockStyle) -> some View {
        transformEnvironment(\.blockStyles) { $0[type] = { AnyView($0.modifier(style)) } }
    }
}

extension EnvironmentValues {
    @Entry internal var appBlocks: AppBlocks?
    @Entry internal var blockStyles: [String: @MainActor @Sendable (AnyView) -> AnyView] = [:]
}

internal struct Styled: ViewModifier {
    @Environment(\.blockStyles) private var styles
    internal let type: String

    internal func body(content: Content) -> some View {
        if let style = styles[type] { style(AnyView(content)) } else { content }
    }
}

internal struct AppBlockView: View {
    @Environment(\.appBlocks) private var blocks
    internal let block: JSONValue

    internal var body: some View {
        if let draw = blocks?.views[block.type] {
            draw(block)
        } else {
            let fallback = block["fallback"] ?? .null
            RowView(row: fallback.with("title", fallback["title"] ?? .string(block.type)))
        }
    }
}

extension JSONValue {
    internal func with(_ key: String, _ value: Self) -> Self { .object(fields.merging([key: value]) { $1 }) }
}
