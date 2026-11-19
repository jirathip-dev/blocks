import Blocks
import SwiftUI

internal struct BlockNode: View {
    @Environment(\.behaved) private var behaved
    internal let block: Block

    internal var body: some View {
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
            case .toast(let toast): ToastBlock(block: toast)
            case .timeline(let timeline): TimelineBlock(block: timeline)
            case .appBlock(let block): AppBlockView(block: block)
            }
        }
        .modifier(Styled(type: block.type)).modifier(Reported(block: block)).modifier(Identified(id: block.id))
    }
}

internal struct BlockStack: View {
    @Environment(\.look) private var look
    internal let blocks: [Block]
    internal var spacing: CGFloat?

    internal var body: some View {
        VStack(alignment: .leading, spacing: spacing ?? look.tiles?.seam ?? 10) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in BlockNode(block: block) }
        }
    }
}
