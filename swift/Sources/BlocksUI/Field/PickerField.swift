import Blocks

extension PickerField: FieldKind {
    internal var start: JSONValue? { value?.json }
    internal var edit: FieldEdit { .pick(options ?? []) }
}
