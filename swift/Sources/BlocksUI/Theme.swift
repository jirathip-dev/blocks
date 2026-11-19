import Blocks
import SwiftUI

public struct Palette: Sendable, Equatable {
    public static let defaultDark = Palette(
        background: .hex(0x161616), card: .hex(0x1f1f1f), edge: .hex(0x3a3a3a), line: .hex(0x2a2a2a),
        foreground: .hex(0xececec), mute: .hex(0xa3a3a3), lead: .hex(0xd6d6d6), link: .hex(0xd6d6d6),
        green: .hex(0x769672), amber: .hex(0xc5a370), red: .hex(0xbb776e), purple: .hex(0xa295bb),
        cyan: .hex(0x6da1a5), dark: true
    )
    public static let defaultLight = Palette(
        background: .hex(0xf6f6f6), card: .hex(0xffffff), edge: .hex(0xd0d0d0), line: .hex(0xe4e4e4),
        foreground: .hex(0x1c1c1c), mute: .hex(0x5e5e5e), lead: .hex(0x3d3d3d), link: .hex(0x3d3d3d),
        green: .hex(0x547850), amber: .hex(0x927236), red: .hex(0xa75953), purple: .hex(0x74678e),
        cyan: .hex(0x3c797d), dark: false
    )

    public var background: Color
    public var card: Color
    public var edge: Color
    public var line: Color
    public var foreground: Color
    public var mute: Color
    public var lead: Color
    public var link: Color
    public var green: Color
    public var amber: Color
    public var red: Color
    public var purple: Color
    public var cyan: Color
    public var dark: Bool
}

extension Palette {
    /// A pack's scheme, from its `--bg`, `--fg`, … tokens; nil when one is missing or not `#rrggbb`.
    public init?(tokens: [String: String], dark: Bool) {
        let keys = [
            "--bg", "--card", "--edge", "--line", "--fg", "--mute", "--l", "--link", "--g", "--a", "--r", "--p", "--c",
        ]
        let colors = keys.compactMap { key in tokens[key].flatMap(Color.hex) }
        guard colors.count == keys.count else { return nil }
        self.init(
            background: colors[0], card: colors[1], edge: colors[2], line: colors[3], foreground: colors[4],
            mute: colors[5], lead: colors[6], link: colors[7], green: colors[8], amber: colors[9], red: colors[10],
            purple: colors[11], cyan: colors[12], dark: dark
        )
    }
}

extension Color {
    internal static func hex(_ value: UInt32) -> Color {
        Color(
            red: Double((value >> 16) & 0xff) / 255,
            green: Double((value >> 8) & 0xff) / 255,
            blue: Double(value & 0xff) / 255
        )
    }

    internal static func hex(_ token: String) -> Color? {
        token.count == 7 && token.hasPrefix("#") ? UInt32(token.dropFirst(), radix: 16).map(hex) : nil
    }
}

public struct Look: Sendable {
    public var palette: Palette
    public var style: Style
    public var still: Bool
    public var tiles: Tiles?

    public init(palette: Palette = .defaultDark, style: Style = .bundled, still: Bool = false, tiles: Tiles? = .default) {
        self.palette = palette
        self.style = style
        self.still = still
        self.tiles = tiles
    }
}

private struct LookKey: EnvironmentKey {
    fileprivate static let defaultValue = Look()
}

extension EnvironmentValues {
    public var look: Look {
        get { self[LookKey.self] }
        set { self[LookKey.self] = newValue }
    }
}

extension Palette {
    internal func tone(_ name: String?) -> Color? {
        switch name {
        case "ok", "done": green
        case "warn", "needs": amber
        case "bad", "fail": red
        case "info": link
        case "working": cyan
        case "accent": lead
        case "mute", "idle": mute
        default: nil
        }
    }
}
