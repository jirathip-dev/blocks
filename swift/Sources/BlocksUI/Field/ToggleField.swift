import Blocks

extension ToggleField: FieldKind {
    internal var start: JSONValue? { value?.json }
    internal var edit: FieldEdit { .flip }

    internal func shown(_ value: JSONValue?, edited: Bool) -> String {
        value?.bool == true ? "on" : "off"
    }
}
