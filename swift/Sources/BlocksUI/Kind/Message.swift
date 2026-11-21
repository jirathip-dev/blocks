import Blocks
import SwiftUI

internal struct MessageBlock: View {
    @Environment(\.look) private var look
    @Environment(\.continues) private var continues
    internal let block: Blocks.Message

    internal var body: some View {
        if block.role == .system { system } else { spoken }
    }

    private var system: some View {
        let edge = Rectangle().fill(look.palette.line).frame(height: 1)
        return VStack(alignment: .leading, spacing: Scale.pad) {
            Text(block.name).ui(Scale.meta, .bold, look).lineLimit(1)
            BlockStack(blocks: block.blocks ?? [], spacing: Scale.pad)
            files
        }
        .foregroundStyle(look.palette.mute).padding(.vertical, Token.s2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { edge }.overlay(alignment: .bottom) { edge }
    }

    private var spoken: some View {
        let owner = block.role == .owner
        return HStack(alignment: .top, spacing: Token.s2) {
            if continues { Color.clear.frame(width: Scale.avatar, height: 1) } else { avatar(owner) }
            VStack(alignment: .leading, spacing: Scale.gap) {
                if !continues { head }
                BlockStack(blocks: block.blocks ?? []).padding(.leading, owner ? Token.s2 + Scale.mark : 0)
                    .overlay(alignment: .leading) {
                        if owner { Rectangle().fill(look.palette.foreground).frame(width: Scale.mark) }
                    }
                files
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var head: some View {
        let word = Role.all.contains(block.role) ? block.role.rawValue : Role.agent.rawValue
        return HStack(alignment: .firstTextBaseline, spacing: Scale.gap) {
            Text(block.name).ui(Scale.title, .bold, look).foregroundStyle(look.palette.foreground)
                .lineLimit(1).truncationMode(.tail)
            Text(word).ui(Scale.meta, .regular, look).foregroundStyle(look.palette.mute).fixedSize()
        }
    }

    @ViewBuilder private func avatar(_ owner: Bool) -> some View {
        let palette = look.palette
        Group {
            if let src = block.avatar {
                Picture(src: src, alt: nil)
            } else {
                Text(block.name.first.map { String($0).uppercased() } ?? "").ui(Scale.cell, .bold, look)
                    .foregroundStyle(owner ? palette.background : palette.foreground)
                    .frame(maxWidth: .infinity, maxHeight: .infinity).background(owner ? palette.foreground : palette.line)
            }
        }
        .frame(width: Scale.avatar, height: Scale.avatar).clipShape(.rect(cornerRadius: look.radius(Scale.pad)))
        .accessibilityHidden(true)
    }

    @ViewBuilder private var files: some View {
        let files = block.files ?? []
        let images = files.filter { $0.src != nil }
        if !images.isEmpty {
            let strip = HStack(spacing: Token.s2) {
                ForEach(Array(images.enumerated()), id: \.offset) { _, file in
                    Attached(file: file) {
                        Picture(src: file.src ?? "", alt: file.name, fit: true)
                            .frame(width: Scale.strip * 2, height: Scale.strip)
                            .clipShape(.rect(cornerRadius: look.radius(Scale.gap)))
                    }
                }
            }
            ViewThatFits(in: .horizontal) {
                strip
                ScrollView(.horizontal, showsIndicators: false) { strip }
            }
        }
        ForEach(Array(files.filter { $0.src == nil }.enumerated()), id: \.offset) { _, file in
            Attached(file: file) { FileLine(name: file.name) }
        }
    }
}

private struct Attached<Label: View>: View {
    fileprivate let file: Attachment
    @ViewBuilder fileprivate let label: Label

    fileprivate var body: some View {
        ActButton(source: Source(tap: file.tap)) { label.contentShape(.rect) }
            .frame(minWidth: 44, minHeight: 44).accessibilityLabel(file.name).help(file.name)
            .accessibilityAddTraits(file.tap.url == nil ? .isButton : .isLink)
    }
}

private struct FileLine: View {
    @Environment(\.look) private var look
    fileprivate let name: String

    fileprivate var body: some View {
        let dot = name.lastIndex(of: ".")
        HStack(spacing: Token.s2) {
            Text(dot.map { String(name[name.index(after: $0)...]) } ?? "").ui(Scale.meta, .bold, look)
                .foregroundStyle(look.palette.mute).fixedSize()
            Text(dot.map { String(name[..<$0]) } ?? name).ui(Scale.cell, .regular, look)
                .foregroundStyle(look.palette.foreground).lineLimit(1).truncationMode(.tail)
        }
        .padding(.horizontal, Token.s2).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .overlay(Rectangle().strokeBorder(look.palette.edge, lineWidth: 1))
    }
}
