# Generated files

`just gen` derives the rest, and CI's arch-check fails a PR whose generated files differ from what it writes:

- `schema/blocks.schema.json`: the JSON Schema of a `Frame`; `$defs` hold `Block`, `Op`, `Hello`, `Bye`, `Sync`, `Synced`
  and the old per-screen `OldFrame`
- `schema/sample.json`: old per-screen frames serialized by the Rust code, which the Swift test decodes
- `web/src/gen/types.ts` and `web/src/gen/sample.ts`: the TS types, and the sample type-checked against them
- `web/src/gen/hooks.ts`: each kind's style hooks, its `variant` field and its `parts`
- `web/src/gen/schemes.ts` and `swift/Sources/Blocks/Gen/Schemes.swift`: the theme's scheme tokens
- `swift/Sources/Blocks/Gen/Blocks.swift`: the Swift `Codable` types (`JSONValue.swift` beside it is kept by hand)
- `swift/Sources/Blocks/Gen/Style.swift`: `theme::Style`, an app's `style.json`, which `fixtures/styles/` holds good and bad
- `swift/Sources/Blocks/Gen/LayoutShapes.swift`: `layout::Place` and `layout::Transition`, the words a `layout.json`
  places with; `fixtures/layouts/` holds cooee's default and the bad files both readers refuse with `refused.json`'s reasons
- `fixtures/blocks/<kind>.json`: each kind's typed sample (`blocks::samples()`), one file per kind
