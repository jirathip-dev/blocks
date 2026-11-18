public let blocksSchemaVersion = 1

public struct Frame: Codable, Equatable, Sendable {
    public let body: Body
    public let seq: UInt64
}

public enum Block: Codable, Equatable, Sendable {
    case text(text: String)
    case button(action: String, label: String)
}

public enum Body: Codable, Equatable, Sendable {
    case snapshot(screen: Screen)
    case ops(ops: [Op])
}

public enum Op: Codable, Equatable, Sendable {
    case insert(at: Int, row: Row)
    case remove(id: String)
    case update(row: Row)
}

public struct Row: Codable, Equatable, Sendable {
    public let block: Block
    public let id: String
}

public struct Screen: Codable, Equatable, Sendable {
    public let rows: [Row]
}
