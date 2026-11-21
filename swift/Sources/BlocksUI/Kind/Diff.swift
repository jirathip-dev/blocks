import Blocks
import SwiftUI

internal struct DiffBlock: View {
    @Environment(\.look) private var look
    internal let block: Diff

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(block.file).fontWeight(.semibold)
                Spacer(minLength: 4)
                if let summary = block.summary { Text(summary).foregroundStyle(palette.mute) }
            }
            .padding(.horizontal, 10).padding(.bottom, 4)
            ForEach(Array(block.hunks.enumerated()), id: \.offset) { _, hunk in
                Text(hunk.at).foregroundStyle(palette.link).padding(.horizontal, 10).padding(
                    .vertical, 4)
                ForEach(Array(hunk.lines.enumerated()), id: \.offset) { _, line in
                    DiffLine(line: line)
                }
            }
        }
        .font(.system(size: 12, design: .monospaced)).padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: 12)
    }
}

internal struct DiffLine: View {
    @Environment(\.look) private var look
    internal let line: String

    internal var body: some View {
        let palette = look.palette
        let tint: Color? =
            switch line.first ?? " " {
            case "+": palette.green
            case "-": palette.red
            default: nil
            }
        Text(line).foregroundStyle(tint == nil ? palette.mute : palette.foreground)
            .padding(.horizontal, 10).frame(maxWidth: .infinity, alignment: .leading)
            .background(tint?.opacity(0.18) ?? .clear)
    }
}
