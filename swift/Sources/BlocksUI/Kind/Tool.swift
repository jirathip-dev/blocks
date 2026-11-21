import Blocks
import SwiftUI

internal struct ToolBlock: View {
    @Environment(\.look) private var look
    @Environment(\.folds) private var folds
    internal let block: Blocks.Tool

    private var key: String { block.id ?? block.name }
    private var open: Bool { folds.open.contains(key) }

    internal var body: some View {
        let palette = look.palette
        let failed = block.state == .failed
        VStack(alignment: .leading, spacing: 0) {
            if let text = block.body {
                Button { folds.flip(key) } label: { head(chevron: true) }
                    .buttonStyle(.plain).accessibilityLabel(block.name).accessibilityValue(open ? "expanded" : "collapsed")
                if open { shown(text) }
            } else {
                head(chevron: false)
            }
        }
        .background(palette.card).overlay(Rectangle().strokeBorder(palette.edge, lineWidth: 1))
        .overlay(alignment: .leading) {
            if failed { Rectangle().fill(palette.red).frame(width: Scale.mark) }
        }
        .accessibilityAddTraits(block.state == .running ? .updatesFrequently : [])
    }

    private func head(chevron: Bool) -> some View {
        let palette = look.palette
        let glyph: (String, Color) =
            switch block.state {
            case .running: ("↻", palette.green)
            case .failed: ("✕", palette.red)
            default: ("✓", palette.foreground)
            }
        return HStack(spacing: Token.s2) {
            Text(glyph.0).ui(Scale.cell, .bold, look).foregroundStyle(glyph.1).accessibilityHidden(true)
            Text(block.name).font(.system(size: Scale.cell, weight: .bold, design: .monospaced))
                .foregroundStyle(palette.foreground).lineLimit(1).layoutPriority(1)
            Text(block.summary ?? "").ui(Scale.meta, .regular, look)
                .foregroundStyle(block.state == .failed ? palette.red : palette.mute).lineLimit(1)
            Spacer(minLength: 0)
            if chevron {
                Text("›").ui(Scale.cell, .bold, look).foregroundStyle(palette.mute)
                    .rotationEffect(.degrees(open ? 90 : 0)).accessibilityHidden(true)
            }
        }
        .padding(.horizontal, Token.s2 + Scale.pad).frame(maxWidth: .infinity, minHeight: 44).contentShape(.rect)
    }

    @ViewBuilder private func shown(_ text: String) -> some View {
        let lines = Text(text).font(.system(size: Token.fs, design: .monospaced)).foregroundStyle(look.palette.foreground)
            .fixedSize().padding(Token.s2 + Scale.pad)
        Group {
            if text.split(separator: "\n", omittingEmptySubsequences: false).count > 12 {
                ScrollView([.horizontal, .vertical]) { lines }.frame(height: Scale.fold)
            } else {
                ViewThatFits(in: .horizontal) {
                    lines
                    ScrollView(.horizontal) { lines }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading).background(look.palette.background)
    }
}
