import Blocks
import SwiftUI

/// An app's own block kinds, drawn by name; a core kind's name is refused but a stage's.
public struct AppBlocks: Sendable {
    public typealias Draw = @MainActor @Sendable (JSONValue) -> AnyView

    internal static let stages: Set<String> = ["scene"]

    internal let views: [String: Draw]
    internal let figure: Draw?
    internal let poster: Draw?
    internal let unknown: Unknown

    /// `figure` draws a lane's or a row's figure from its JSON; `poster` draws a card's poster in its header (`card` holds who posted).
    public init(
        _ views: [String: Draw], figure: Draw? = nil, poster: Draw? = nil, unknown: Unknown = .fallback
    ) throws(AppBlocksError) {
        if let clash = views.keys.sorted().first(where: { Self.isCore($0) && !Self.stages.contains($0) }) {
            throw .clash(clash)
        }
        (self.views, self.figure, self.poster, self.unknown) = (views, figure, poster, unknown)
    }

    /// Whether `type` is a core kind: the generated decoder takes it for one of its own.
    public static func isCore(_ type: String) -> Bool { Block.tags.contains(type) }

    /// What a kind with no view draws: its fallback row, or nothing.
    public enum Unknown: Sendable {
        case fallback
        case nothing
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

    /// Whether a screen draws its title line; an app with its own navigation title turns it off.
    public func screenTitle(_ shown: Bool) -> some View {
        environment(\.screenTitle, shown)
    }

    /// Wraps every block of `type` in `style`.
    public func blockStyle(_ type: String, _ style: some BlockStyle) -> some View {
        transformEnvironment(\.blockStyles) { $0[type] = { AnyView($0.modifier(style)) } }
    }
}

extension EnvironmentValues {
    @Entry internal var appBlocks: AppBlocks?
    @Entry internal var screenTitle = true
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
            let title = fallback["title"] ?? .string(block.type)
            FallbackRow(fallback: JSONValue.object(fallback.fields.merging(["title": title]) { $1 }))
        }
    }
}

internal struct FallbackRow: View {
    internal let fallback: any Encodable

    internal var body: some View {
        if let row = try? JSONValue(fallback).decode(Row.self) { RowBlock(block: row) }
    }
}
