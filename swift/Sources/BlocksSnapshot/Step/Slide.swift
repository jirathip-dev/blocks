import Blocks
import BlocksUI

extension Run {
    mutating func slide(_ s: StepSlide) throws {
        let json = try JSONValue(screen)
        let named = { (field: JSONValue) in field.string("name") == s.field && field.type == "slider" }
        let form = Self.first(json) { $0.list("fields").contains(where: named) }
        let view = Behaviour(json, state: Behaviour.state(json, edits: edits))
        guard let form, let field = try? form.list("fields").first(where: named)?.decode(SliderField.self),
            !view.hidden.contains(s.field), !view.disabled.contains(s.field)
        else { return out.dropped.append("slide \(s.field)") }
        let to = field.snapped(s.to)
        edits[s.field] = .number(to)
        if let action = form.string("action"), form["submit"] == nil {
            let values: JSONValue = .object([s.field: .number(to)])
            out.sent.append(.object(["screen": .string(key), "action": .string(action), "block": form.id.map(JSONValue.string) ?? .null, "values": values]))
        }
        redraw()
    }
}
