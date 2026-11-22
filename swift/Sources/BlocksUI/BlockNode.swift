import Blocks
import SwiftUI

/// One block drawn as its kind, with its hidden, disabled and style state; an app block embeds its children with it.
public struct BlockNode: View {
    @Environment(\.behaved) private var behaved
    @Environment(\.appBlocks) private var appBlocks
    private let block: Block

    public init(block: Block) {
        self.block = block
    }

    public var body: some View {
        if bare || block.id.map(behaved.view.hidden.contains) == true {
            Color.clear.frame(width: 0, height: 0).modifier(Reported(block: block, hidden: true))
        } else {
            drawn.disabled(!["form", "config"].contains(block.type) && block.id.map(behaved.view.disabled.contains) == true)
        }
    }

    private var bare: Bool {
        switch block {
        case .list(let list): list.rows.isEmpty
        case .chips(let chips): chips.options.isEmpty
        case .images(let images): images.items.isEmpty
        case .prose(let prose): prose.parts.isEmpty && prose.streaming != true
        case .appBlock(let app): appBlocks?.unknown == .nothing && appBlocks?.views[app.type] == nil
        default: false
        }
    }

    private var drawn: some View {
        KindView(block: block)
            .modifier(Styled(type: block.type)).modifier(Reported(block: block)).modifier(Identified(id: block.id))
    }
}

/// Blocks drawn top to bottom, `spacing` apart (the tile seam by default).
public struct BlockStack: View {
    @Environment(\.look) private var look
    private let blocks: [Block]
    private let spacing: CGFloat?

    public init(blocks: [Block], spacing: CGFloat? = nil) {
        (self.blocks, self.spacing) = (blocks, spacing)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: spacing ?? look.tiles?.seam ?? 10) {
            ForEach(ChildKey.keyed(blocks, \.id), id: \.key) { child in
                let speaker = Self.speaker(child.item)
                BlockNode(block: child.item)
                    .environment(\.continues, speaker != nil && child.index > 0 && Self.speaker(blocks[child.index - 1]) == speaker)
            }
        }
    }

    private static func speaker(_ block: Block) -> String? {
        if case .message(let m) = block { "\(m.role.rawValue) \(m.name)" } else { nil }
    }
}

extension EnvironmentValues {
    @Entry internal var continues = false
}

internal enum ChildKey: Hashable {
    case id(String)
    case at(Int)

    internal static func keyed<T>(_ items: [T], _ id: (T) -> String?) -> [(key: Self, index: Int, item: T)] {
        var seen = Set<String>()
        return items.enumerated().map { index, item in
            let key: Self = if let id = id(item), seen.insert(id).inserted { .id(id) } else { .at(index) }
            return (key, index, item)
        }
    }
}
