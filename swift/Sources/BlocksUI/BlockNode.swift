import Blocks
import SwiftUI

/// One block drawn as its kind, with its hidden, disabled and style state; an app block embeds its children with it.
public struct BlockNode: View {
    @Environment(\.behaved) private var behaved
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
        case .prose(let prose): prose.parts.isEmpty
        default: false
        }
    }

    private var drawn: some View {
        Group {
            switch block {
            case .screen(let screen): ScreenBlock(block: screen)
            case .sheet(let sheet): SheetBlock(block: sheet)
            case .section(let section): SectionBlock(block: section)
            case .list(let list): ListBlock(block: list)
            case .row(let row): RowView(row: row)
            case .card(let card): CardBlock(block: card)
            case .choice(let choice): ChoiceBlock(block: choice)
            case .form(let form), .config(let form): FieldsBlock(block: form)
            case .secret(let secret): SecretBlock(block: secret)
            case .run(let run): RunBlock(block: run)
            case .button(let button): ButtonBlock(block: button)
            case .chips(let chips): ChipsBlock(block: chips)
            case .stat(let stat): StatBlock(block: stat)
            case .text(let text): TextBlock(block: text)
            case .images(let images): ImagesBlock(block: images)
            case .web(let web): WebBlock(block: web)
            case .diff(let diff): DiffBlock(block: diff)
            case .editor(let editor): EditorBlock(block: editor)
            case .scene(let scene): LaneStage(block: scene)
            case .diagram(let diagram): DiagramBlock(block: diagram)
            case .composer(let composer): ComposerBlock(block: composer)
            case .lines(let lines): LinesBlock(block: lines)
            case .prose(let prose): ProseBlock(block: prose)
            case .hero(let hero): HeroBlock(block: hero)
            case .media(let media): MediaBlock(block: media)
            case .nav(let nav): NavBlock(block: nav)
            case .island(let island): IslandView(block: island)
            case .table(let table): TableBlock(block: table)
            case .steps(let steps): StepsBlock(block: steps)
            case .chart(let chart): ChartBlock(block: chart)
            case .toast(let toast): ToastBlock(block: toast)
            case .pages(let pages): PagesBlock(block: pages)
            case .timeline(let timeline): TimelineBlock(block: timeline)
            case .appBlock(let block): AppBlockView(block: block)
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
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in BlockNode(block: block) }
        }
    }
}
