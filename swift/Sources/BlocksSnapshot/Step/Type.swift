import Blocks

extension Run {
    mutating func type(_ typing: StepType) throws {
        let json = try JSONValue(screen)
        let field = Self.find(json, typing.id).flatMap { $0.list("fields").first?.string("name") ?? $0.string("name") }
        let view = Behaviour(json, state: Behaviour.state(json, edits: edits))
        if let field, !view.hidden.contains(field), !view.disabled.contains(field) {
            edits[field] = .string(typing.text)
            redraw()
        } else {
            out.dropped.append("type \(typing.id)")
        }
    }
}
