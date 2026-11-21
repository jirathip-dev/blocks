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
        Group {
            switch block {
            case .row(let row): RowView(row: row)
            case .form(let form), .config(let form): FieldsBlock(block: form)
            case .secret(let secret): SecretBlock(block: secret)
            case .run(let run): RunBlock(block: run)
            case .images(let images): ImagesBlock(block: images)
            case .diff(let diff): DiffBlock(block: diff)
            case .editor(let editor): EditorBlock(block: editor)
            case .scene(let scene):
                if let draw = appBlocks?.views["scene"], let json = try? JSONValue(block) {
                    draw(json)
                } else {
                    LaneStage(block: scene)
                }
            case .diagram(let diagram): DiagramBlock(block: diagram)
            case .composer(let composer): ComposerBlock(block: composer)
            case .lines(let lines): LinesBlock(block: lines)
            case .prose(let prose): ProseBlock(block: prose)
            case .hero(let hero): HeroBlock(block: hero)
            case .media(let media): MediaBlock(block: media)
            case .nav(let nav): NavBlock(block: nav)
            case .sidebar(let sidebar): FallbackRow(fallback: JSONValue.object(["title": .string(sidebar.label)]))
            case .island(let island): IslandView(block: island)
            case .table(let table): TableBlock(block: table)
            case .steps(let steps): StepsBlock(block: steps)
            case .chart(let chart): ChartBlock(block: chart)
            case .appBlock(let block): AppBlockView(block: block)
            default: KindView(block: block)
            }
        }
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
