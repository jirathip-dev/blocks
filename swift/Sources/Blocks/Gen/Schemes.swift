public enum SchemeMode: String, Codable, Equatable, Sendable {
    case dark, light
}

public struct Scheme: Equatable, Sendable {
    public let label: String
    public let mode: SchemeMode
    public let tokens: [String: String]
}

public let blocksDefaultLight = Scheme(label: "Default light", mode: .light, tokens: ["--bg": "#f6f6f6", "--card": "#ffffff", "--edge": "#d0d0d0", "--line": "#e4e4e4", "--scrim": "#0000004d", "--fg": "#1c1c1c", "--mute": "#5e5e5e", "--l": "#3d3d3d", "--link": "#3d3d3d", "--g": "#547850", "--a": "#927236", "--r": "#a75953", "--p": "#74678e", "--c": "#3c797d", "--fk-l": "#3d3d3d", "--fk-p": "#64597c", "--fk-c": "#31666a", "--fk-g": "#456642", "--fk-a": "#775d2c"])

public let blocksDefaultDark = Scheme(label: "Default dark", mode: .dark, tokens: ["--bg": "#161616", "--card": "#1f1f1f", "--edge": "#3a3a3a", "--line": "#2a2a2a", "--scrim": "#00000099", "--fg": "#ececec", "--mute": "#a3a3a3", "--l": "#d6d6d6", "--link": "#d6d6d6", "--g": "#769672", "--a": "#c5a370", "--r": "#bb776e", "--p": "#a295bb", "--c": "#6da1a5", "--fk-l": "#d6d6d6", "--fk-p": "#b8abce", "--fk-c": "#8ab9bc", "--fk-g": "#9bb996", "--fk-a": "#d1b184"])

public let blocksDefaultStyle: [String: String] = ["--radius": "0px", "--seam": "2px", "--dot-size": "2px", "--dot-gap": "16px", "--dot": "var(--edge)", "--settle": "160ms", "--rise": "8px", "--stagger": "40ms", "--build": "200ms", "--enter": "160ms", "--ease": "cubic-bezier(0.2, 0, 0, 1)"]
