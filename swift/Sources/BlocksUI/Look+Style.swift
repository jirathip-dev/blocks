import Blocks
import SwiftUI

extension Look {
    internal var type: TypeDesign { style.type }
    internal var glass: Bool { style.surface == .glass }
    internal var outline: Bool { style.fills == .outline }
    internal var solid: Bool { style.fills == .solid }
    internal var filled: Bool { style.buttons == .filled }
    internal var textMarks: Bool { style.marks == .text }
    internal var quiet: Bool { style.sections == .quiet }
    internal var square: Bool { tiles.map { $0.radius == 0 } ?? (style.radius == 0) }
    internal var motion: Double { style.motion ?? 1 }
    internal var pill: AnyShape { square ? AnyShape(Rectangle()) : AnyShape(Capsule()) }

    internal func label(_ role: LabelRole, _ text: String) -> String { style.labels[role.rawValue]?.apply(text) ?? text }

    internal func radius(_ value: CGFloat, least: CGFloat = 0) -> CGFloat {
        max(tiles?.radius ?? value * style.radius, least)
    }
}

internal enum Scale {
    static let title: CGFloat = 15
    static let cell: CGFloat = 14
    static let meta: CGFloat = 12
    static let count: CGFloat = 11
    static let glyph: CGFloat = 16
    static let gap: CGFloat = 6
    static let pad: CGFloat = 4
    static let mark: CGFloat = 3
    static let avatar: CGFloat = 28
    static let strip: CGFloat = 88
    static let fold: CGFloat = 200
    static let blink = 0.5
    static let caret = "▍"
}

extension View {
    internal func ui(_ size: CGFloat, _ weight: Font.Weight = .regular, _ look: Look) -> some View {
        font(.system(size: size, weight: weight, design: look.type == .mono ? .monospaced : look.type == .serif ? .serif : .default))
    }

    internal func surface(_ look: Look, radius: CGFloat = 22, interactive: Bool = false) -> some View {
        modifier(Surfaced(look: look, radius: radius, interactive: interactive))
    }

    @ViewBuilder internal func chip(_ look: Look) -> some View {
        if look.outline { self } else { surface(look, radius: 99, interactive: true) }
    }

    @ViewBuilder internal func chip(
        _ look: Look, fill: Color, edge: Color, radius: CGFloat? = nil, ground: Color = .clear, dash: [CGFloat] = []
    ) -> some View {
        if look.outline {
            background(ground).overlay(Rectangle().strokeBorder(edge, style: StrokeStyle(lineWidth: 1, dash: dash)))
        } else if let radius {
            background(fill, in: .rect(cornerRadius: radius))
        } else {
            background(fill, in: look.pill)
        }
    }

    @ViewBuilder internal func accent(_ look: Look, _ tint: Color, fill: Color, radius: CGFloat, ground: Color = .clear)
        -> some View
    {
        if look.outline {
            background(ground, in: .rect(cornerRadius: radius))
                .overlay(alignment: .leading) { Rectangle().fill(tint).frame(width: 3) }
        } else {
            background(fill, in: .rect(cornerRadius: radius))
        }
    }
}

internal struct Surfaced: ViewModifier {
    internal let look: Look
    internal let radius: CGFloat
    internal let interactive: Bool

    internal func body(content: Content) -> some View {
        let palette = look.palette
        if let tiles = look.tiles {
            let tile = content.background(palette.card, in: .rect(cornerRadius: tiles.radius))
                .overlay(RoundedRectangle(cornerRadius: tiles.radius).strokeBorder(palette.edge, lineWidth: 1))
            if interactive { tile } else { tile.modifier(Settles(tiles: tiles)) }
        } else {
            surfaced(content, palette)
        }
    }

    @ViewBuilder private func surfaced(_ content: Content, _ palette: Palette) -> some View {
        switch look.style.surface {
        case .dashed:
            content.background(palette.card.opacity(0.6))
                .overlay(Rectangle().strokeBorder(palette.edge, style: StrokeStyle(lineWidth: 1, dash: [3, 2])))
        case .solid:
            content.background(palette.card, in: .rect(cornerRadius: radius * 0.6))
                .overlay(RoundedRectangle(cornerRadius: radius * 0.6).strokeBorder(palette.edge, lineWidth: 1.5))
        case _ where look.still:
            content.background(stillGlass(palette)).overlay(stillRim(palette))
        default:
            content.glassEffect(interactive ? .regular.interactive() : .regular, in: .rect(cornerRadius: radius))
        }
    }

    private func stillGlass(_ palette: Palette) -> some View {
        RoundedRectangle(cornerRadius: radius)
            .fill(palette.dark ? Color.white.opacity(0.09) : Color.white.opacity(0.62))
            .shadow(color: .black.opacity(palette.dark ? 0.35 : 0.10), radius: 10, y: 4)
    }

    private func stillRim(_ palette: Palette) -> some View {
        let rim = [Color.white.opacity(palette.dark ? 0.28 : 0.9), .white.opacity(0.04)]
        return RoundedRectangle(cornerRadius: radius).strokeBorder(
            LinearGradient(colors: rim, startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1)
    }
}

internal struct Mark<Symbol: View>: View {
    @Environment(\.look) private var look
    internal let text: String
    internal var size: CGFloat = 13
    internal var weight: Font.Weight = .bold
    @ViewBuilder internal let symbol: Symbol

    internal var body: some View {
        if look.textMarks { Text(text).ui(size, weight, look) } else { symbol }
    }
}
