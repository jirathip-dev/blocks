# Fields

A `form`'s `fields` (and a `lines` block's `columns`) are a union tagged by `type`, as blocks are. The design is
`docs/architecture/form-v2/`; this page is how to work with what is built.

## The types

| `type` | Rust | Holds | Role in the drawn tree |
|---|---|---|---|
| `text` | `TextField` | `value`, `placeholder`, `keyboard` | `textbox` |
| `toggle` | `ToggleField` | `value` | `switch` |
| `picker` | `PickerField` | `value`, `options` | `combobox` |
| `secret` | `SecretField` | `placeholder`, `set` | `textbox` |
| `upload` | `UploadField` | `accept` (`image`, `pdf`, `sheet`), `capture`, `many`, `mb`, `files` | `group` |

Every type also has `name` (required), `label`, `doc`, `was`, `error`, `open`, `show`, `enabled` and `checks`.
Any other `type` is kept whole and drawn as a one-line text input; the drawn tree records it as `plain`.

```rust
Form::new(vec![
    TextField::new("email").label("Email").placeholder("you@example.org").into(),
    ToggleField::new("updates").label("Updates").value(FieldValue::Flag(true)).into(),
])
```

## Where a type lives

| Part | File |
|---|---|
| its shape, words, role and sample | `crates/blocks/src/kind/field/<type>.rs`, plus one line in `fields!` in its `mod.rs` |
| the static page | `crates/blocks/src/site/field/<type>.rs`, plus one line in `VIEWS` in its `mod.rs` |
| the HTML view | `web/src/render/field/<type>.ts`; `web/src/gen/fields.ts` lists it after `just gen` |
| SwiftUI | `swift/Sources/BlocksUI/Field/<Type>Field.swift`, plus one line in `FieldRow.swift`'s switch |

A file whose name starts with `_` holds a part two types share and is not a type. A form never names a type: it
draws each field with its type's view, or the plain text input when the renderer has none.

## Files

An upload never puts bytes in an action. The host passes a file handler: `file` in the HTML shell's `mount`,
`onFile` on React's `BlocksView`. Each picked file of the right kind and under `mb` goes to it with what it is for, a
progress callback and an abort signal (`Picked`), and the handler answers `{ id, name, src }`. A file of another kind
or over `mb` is refused in the field and never reaches the handler. The action then carries the ids, a list. While a
file is uploading or failed the form's submit is off and says why. With no handler the field is drawn off. The
static page writes the browser's own file input, and the page's form posts it as `multipart/form-data`. SwiftUI and
the desktop draw an upload as a text input until their own view lands.

## Locale and words

`screen` and `sheet` take `locale: { lang, era, today }`. A field draws its own words (the note's "was", a secret's
"not set") from the table each type lists as `(key, en, th)`; `just gen` writes it to `web/src/gen/words.ts` and
`swift/Sources/Blocks/Gen/Words.swift`. A `lang` other than `th` draws English.

## Local state

`behave::lit(field, held)` (`lit` in TS, `Behaviour.lit` in Swift) is what a field holding a value puts in local
state: a list (an upload's ids) puts its length, an empty one null, so `is filled` means "required" for every type.
`fixtures/behave/fields.json` holds its cases, run in all three languages.

## Fixtures

`just gen` writes `fixtures/fields/<type>.json`, a screen whose form has the type empty, filled, with an error, a
`was`, a `doc` and a long label, and `fixtures/fields/trees/<type>.json`, its drawn tree with each form's `fields`.
`fixtures/trees/swift/fields/<type>.json` is the same tree as SwiftUI draws it (a type with no Swift view is
`plain`), and `fixtures/fields/html/<type>.html` is the form as the static page writes it.

## Focus across a patch

When a frame redraws a form, the HTML patcher puts the focus, the typed text and the caret back on the field of the
same form id and name.
