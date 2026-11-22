import Blocks

extension Run {
    mutating func unknown(_ value: JSONValue) {
        out.dropped.append("unknown \(value)")
    }
}
