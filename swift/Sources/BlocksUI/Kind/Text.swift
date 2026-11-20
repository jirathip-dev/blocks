import Blocks
import SwiftUI

internal struct TextBlock: View {
    @Environment(\.look) private var look
    internal let block: Blocks.Text

    internal var body: some View {
        let markdown = block.markdown ?? block.text ?? ""
        let until = block.until?.date
        let footnote = block.style?.rawValue == "footnote"
        TimelineView(.everyMinute) { context in
            let text = Relative.filled(markdown, until: until, at: context.date)
            let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
            Text((try? AttributedString(markdown: text, options: options)) ?? AttributedString(text))
                .ui(footnote ? 12 : 16, .regular, look).foregroundStyle(footnote ? look.palette.mute : look.palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
