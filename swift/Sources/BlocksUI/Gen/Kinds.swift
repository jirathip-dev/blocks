import Blocks
import SwiftUI

extension Block {
    internal var typeAndID: (type: String, id: String?) {
        switch self {
        case .screen(let b): ("screen", b.id)
        case .sheet(let b): ("sheet", b.id)
        case .section(let b): ("section", b.id)
        case .list(let b): ("list", b.id)
        case .row(let b): ("row", b.id)
        case .card(let b): ("card", b.id)
        case .choice(let b): ("choice", b.id)
        case .form(let b): ("form", b.id)
        case .config(let b): ("config", b.id)
        case .secret(let b): ("secret", b.id)
        case .run(let b): ("run", b.id)
        case .button(let b): ("button", b.id)
        case .chips(let b): ("chips", b.id)
        case .stat(let b): ("stat", b.id)
        case .text(let b): ("text", b.id)
        case .images(let b): ("images", b.id)
        case .web(let b): ("web", b.id)
        case .diff(let b): ("diff", b.id)
        case .editor(let b): ("editor", b.id)
        case .scene(let b): ("scene", b.id)
        case .diagram(let b): ("diagram", b.id)
        case .composer(let b): ("composer", b.id)
        case .lines(let b): ("lines", b.id)
        case .prose(let b): ("prose", b.id)
        case .hero(let b): ("hero", b.id)
        case .media(let b): ("media", b.id)
        case .nav(let b): ("nav", b.id)
        case .island(let b): ("island", b.id)
        case .table(let b): ("table", b.id)
        case .steps(let b): ("steps", b.id)
        case .chart(let b): ("chart", b.id)
        case .toast(let b): ("toast", b.id)
        case .timeline(let b): ("timeline", b.id)
        case .import(let b): ("import", b.id)
        case .appBlock(let b): (b.type, b.id)
        }
    }
}

internal struct KindView: View {
    internal let block: Block

    internal var body: some View {
        switch block {
        case .button(let block): ButtonBlock(block: block)
        case .card(let block): CardBlock(block: block)
        case .chips(let block): ChipsBlock(block: block)
        case .choice(let block): ChoiceBlock(block: block)
        case .import(let block): ImportBlock(block: block)
        case .list(let block): ListBlock(block: block)
        case .screen(let block): ScreenBlock(block: block)
        case .section(let block): SectionBlock(block: block)
        case .sheet(let block): SheetBlock(block: block)
        case .stat(let block): StatBlock(block: block)
        case .text(let block): TextBlock(block: block)
        case .timeline(let block): TimelineBlock(block: block)
        case .toast(let block): ToastBlock(block: block)
        case .web(let block): WebBlock(block: block)
        default: EmptyView()
        }
    }
}
