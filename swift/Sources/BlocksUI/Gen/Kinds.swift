import Blocks
import SwiftUI

extension Block {
    internal var typeAndID: (type: String, id: String?) {
        switch self {
        case .screen(let b): ("screen", b.id)
        case .modal(let b): ("modal", b.id)
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
        case .pages(let b): ("pages", b.id)
        case .timeline(let b): ("timeline", b.id)
        case .import(let b): ("import", b.id)
        case .message(let b): ("message", b.id)
        case .tool(let b): ("tool", b.id)
        case .sidebar(let b): ("sidebar", b.id)
        case .plot(let b): ("plot", b.id)
        case .appBlock(let b): (b.type, b.id)
        }
    }

    internal var variant: String? {
        switch self {
        case .modal(let b): b.variant?.rawValue
        case .sheet(let b): b.variant?.rawValue
        case .row(let b): b.style?.rawValue
        case .card(let b): b.kind?.rawValue
        case .button(let b): b.style?.rawValue
        case .text(let b): b.style?.rawValue
        case .images(let b): b.size?.rawValue
        case .message(let b): b.role.rawValue
        case .tool(let b): b.state.rawValue
        default: nil
        }
    }

    internal var source: Source {
        switch self {
        case .row(let b): Source(tap: b.tap)
        case .card(let b): Source(tap: b.tap)
        case .choice(let b): Source(action: b.action, values: b.values)
        case .form(let b): Source(action: b.action)
        case .config(let b): Source(action: b.action)
        case .secret(let b): Source(action: b.action, values: b.values)
        case .run(let b): Source(action: b.action)
        case .button(let b): Source(action: b.action, tap: b.tap, values: b.values)
        case .chips(let b): Source(action: b.action)
        case .editor(let b): Source(action: b.action)
        case .composer(let b): Source(action: b.action, values: b.values)
        case .lines(let b): Source(action: b.action)
        case .chart(let b): Source(tap: b.tap)
        case .import(let b): Source(action: b.action)
        default: Source()
        }
    }

    internal var named: [String?] {
        switch self {
        case .screen(let b): [b.title]
        case .modal(let b): [b.title]
        case .sheet(let b): [b.title]
        case .section(let b): [b.header]
        case .row(let b): [b.title]
        case .card(let b): [b.title]
        case .choice(let b): [b.question]
        case .secret(let b): [b.label, b.placeholder, b.name]
        case .run(let b): [b.command]
        case .button(let b): [b.label]
        case .chips(let b): [b.name]
        case .stat(let b): [b.label]
        case .diff(let b): [b.file]
        case .editor(let b): [b.name]
        case .scene(let b): [b.label]
        case .diagram(let b): [b.title]
        case .composer(let b): [b.label, b.placeholder]
        case .lines(let b): [b.label, b.name]
        case .hero(let b): [b.title]
        case .media(let b): [b.alt]
        case .island(let b): [b.name]
        case .table(let b): [b.title]
        case .steps(let b): [b.title]
        case .chart(let b): [b.title]
        case .toast(let b): [b.title]
        case .pages(let b): [b.title, b.file]
        case .timeline(let b): [b.title]
        case .import(let b): [b.title]
        case .message(let b): [b.name]
        case .tool(let b): [b.name]
        case .sidebar(let b): [b.label]
        case .plot(let b): [b.title]
        default: []
        }
    }

    internal static let roles = ["modal": "dialog", "sheet": "dialog", "section": "region", "form": "form", "config": "form", "nav": "navigation", "chart": "figure", "plot": "figure", "toast": "status", "message": "article", "sidebar": "navigation"]
    internal static let names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"]
}

internal struct KindView: View {
    internal let block: Block

    internal var body: some View {
        switch block {
        case .button(let block): ButtonBlock(block: block)
        case .card(let block): CardBlock(block: block)
        case .chart(let block): ChartBlock(block: block)
        case .chips(let block): ChipsBlock(block: block)
        case .choice(let block): ChoiceBlock(block: block)
        case .composer(let block): ComposerBlock(block: block)
        case .config(let block): ConfigBlock(block: block)
        case .diagram(let block): DiagramBlock(block: block)
        case .diff(let block): DiffBlock(block: block)
        case .form(let block): FormBlock(block: block)
        case .hero(let block): HeroBlock(block: block)
        case .images(let block): ImagesBlock(block: block)
        case .island(let block): IslandBlock(block: block)
        case .lines(let block): LinesBlock(block: block)
        case .list(let block): ListBlock(block: block)
        case .message(let block): MessageBlock(block: block)
        case .modal(let block): ModalBlock(block: block)
        case .nav(let block): NavBlock(block: block)
        case .pages(let block): PagesBlock(block: block)
        case .plot(let block): PlotBlock(block: block)
        case .prose(let block): ProseBlock(block: block)
        case .row(let block): RowBlock(block: block)
        case .run(let block): RunBlock(block: block)
        case .scene(let block): SceneBlock(block: block)
        case .screen(let block): ScreenBlock(block: block)
        case .secret(let block): SecretBlock(block: block)
        case .section(let block): SectionBlock(block: block)
        case .sheet(let block): SheetBlock(block: block)
        case .sidebar(let block): SidebarBlock(block: block)
        case .stat(let block): StatBlock(block: block)
        case .steps(let block): StepsBlock(block: block)
        case .table(let block): TableBlock(block: block)
        case .text(let block): TextBlock(block: block)
        case .timeline(let block): TimelineBlock(block: block)
        case .toast(let block): ToastBlock(block: block)
        case .tool(let block): ToolBlock(block: block)
        case .appBlock(let block): AppBlockView(block: block)
        #if !os(watchOS)
            case .editor(let block): EditorBlock(block: block)
            case .import(let block): ImportBlock(block: block)
            case .media(let block): MediaBlock(block: block)
            case .web(let block): WebBlock(block: block)
        #else
            default: EmptyView()
        #endif
        }
    }
}
