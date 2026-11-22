import Blocks
import BlocksUI

extension Run {
    mutating func file(_ f: StepFile) throws {
        if picks.pick(f, in: try JSONValue(screen)) { redraw() } else { out.dropped.append("file \(f.field)") }
    }
}

@MainActor
struct Picks {
    var rows: [String: [FileRow]] = [:]
    var handled = 0
    var picked = 0

    func waits(_ names: Set<String>) -> Bool { rows.filter { names.contains($0.key) }.values.joined().map(\.self).waits != nil }

    func ids(_ names: Set<String>) -> [String: JSONValue] {
        rows.filter { names.contains($0.key) }.mapValues { .array($0.ids.map(JSONValue.string)) }
    }

    mutating func pick(_ f: StepFile, in screen: JSONValue) -> Bool {
        let named = { (field: JSONValue) in field.string("name") == f.field && field.type == "upload" }
        let found = Run.first(screen) { $0.list("fields").contains(where: named) }?.list("fields").first(where: named)
        guard let field = try? found?.decode(UploadField.self) else { return false }
        picked += 1
        let key = "pick-\(picked)"
        var next = field.picked(rows[f.field] ?? field.held, [FileRow(key: key, name: f.name, size: f.size, mime: f.mime)])
        if let last = next.indices.last, next[last].key == key, !next[last].refused {
            handled += 1
            next[last].state = f.handler == .answers ? .done(FileRef("file-\(handled)", name: f.name)) : f.handler == .fails ? .failed : .uploading(0)
        }
        rows[f.field] = next
        return true
    }
}
