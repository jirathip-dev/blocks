# ADR: form v2, typed field types (#131)

## Summary

Decision: each field type gets its own typed shape, as each block kind has. New: search, slider, upload, signature,
date, days, hours, combo, tags; multi-line and rich are options of text. The renderer does what is the same for every
app (calendar, filter, hours, labels); the app answers a search or a long list with a new screen. Files and signature
PNGs go to a file handler the app passes in and travel as ids. Language, era and today are set once on the screen.
Slices: ten, about 3,200 counted lines: the fields folder, then search, slider, upload, signature, date, hours, combo, multi-line, rich.
Decided (q2301): (1) one cap raise; (2) hours takes a break off, as the client app does; (3) table (#80) reads the screen's era.

## Question

The client app's 80 block screens need eight inputs no `form` field covers. What is the shape of each, which of their
behaviour runs in the renderer and which is the app's, how do a file and a signature leave when an action is JSON,
where do language and era come in, and in what order is it built so that hub, then delivery, can migrate first?

## What exists, read from the code

- `Field` is one flat struct (`kind/parts.rs:186`) with a `type` word (`:34`): every option of every type is on
  every field. Four places draw it with a chain of `if type is…`: `web/src/render/form.ts:36`,
  `site/views.rs:357`, `BlockFields.swift:143`, and React's form, which #81's slice R7 has not built yet.
- A type a renderer does not know is drawn as a one-line text input in all of them.
- Local state holds null, a switch, a number or a string (`expr.rs:10`). A field's `value` seeds it
  (`behave.rs:77`); `show`, `enabled` and `checks` read it. `lt` already orders two strings, so ISO days compare.
- The HTML form reads its values out of `input` and `select` elements (`form.ts:69`).
- A form with `action` sends each change by itself. `config.ts:21` and `BlockFields.swift:107` do that;
  `form.ts` does not.
- An action's `values` is any JSON (`wire.rs:74`). The composer already sends files inside it, as base64
  (`composer.ts:13`, `:40`).
- No renderer knows a language: its own words are English in the code (`form.ts:16`). The crate reads no clock
  (a ban). #80 fixed how numbers and days are drawn so every renderer agrees, and q2275 speaks of "the screen's
  language", which no shape holds yet.
- The HTML patcher redraws a block it merges into (`patch.ts:111`): a form that changes while you type loses the focus.
- The client app today: delivery uploads each photo and the signature PNG, keeps the ids, then sends one submission of
  ids (`apps/delivery/src/App.tsx:260` to `:321`). Its worked hours take one hour off a span of five or more, and
  overtime is what is left over eight (`packages/domain/src/manpower.ts:184`). Hub's search and every list search
  keep their text in the URL (`usePersistentSearch`).

## Options

| Question | Options | Chosen |
|---|---|---|
| The shape of a field | **A** the flat struct with about 25 more options; **B** one struct per type in a union tagged by `type`, as `Block` is; **C** new block kinds beside `form`, as `secret` and `chips` are | **B**. A lets a slider carry `accept` and a toggle `options`, and the TS builders, which are what agents write, cannot refuse it. C loses the form: one submit, one set of checks, one draft. B is the same JSON on the wire as today |
| Whose rule runs where | all in the renderer (new expression operations for days and times, in three languages); all in the app (every change is an action and a new screen); split by whose rule it is | split. What is the same for every app runs in the renderer. What only the app knows (search results, a list of thousands) comes back as a new screen |
| How a range sits in local state | two names for one field; one string, `from/to`; an object, with its size in state | the object and its size: handlers get `{ from, to }`, and "over 8 hours" is one `lt` |
| How options and results come back | a new request and reply on the wire; an action, answered as every action is, by a new screen | the action. Nothing new on the wire, and Mode B's loader already works this way |
| How a file leaves | base64 inside the action (the composer's way); a URL in the field that the renderer posts to; a handler the app passes in, which answers with an id | the handler. A renderer may not fetch (a ban), and megabytes of base64 do not belong in an action or a stream |
| Language and era | the device's locale; an option on each field; a renderer prop; on the screen | on the screen: the server or the builder knows the user, the static page and the fixtures get it with no host code, and a field cannot disagree with the one beside it |

## Decision

1. **A field is a union of typed fields.** `kind/field/<type>.rs` holds one struct per type, written with a
   `field!` macro that adds the shared part and gives it `new` and setters. `Field` is the union, tagged by `type`,
   with an `Other` case for a type this version does not know. The four old types keep their fields and their JSON.

2. **The types.**

   | The issue's need | Type | Notes |
   |---|---|---|
   | search | `search` | `filters` for a local filter; in a live form its text is sent |
   | slider | `slider` | `min`, `max` required; `step`, `unit` |
   | file and photo upload | `upload` | `accept`, `capture`, `many`, `mb` |
   | signature | `signature` | |
   | date, single | `date` | `min`, `max` |
   | date, from and to | `days` | its own type, so its value is always a range |
   | time range | `hours` | `step`, `rest`, `over`; the same day, end after start |
   | combo box, one | `combo` | `options`, `free`, `load` |
   | combo box, many | `tags` | the same, and its value is a list |
   | multi-line, rich | `text` with `rows`, `grow`, `max`, `rich` | no new type: an old reader draws one line and keeps the text |

   A range and a list are their own types, not a flag on another, so a single date can never hold a range.

3. **What a field holds has three views** (`shapes.md` has the table): what it starts with, what local state holds, and
   what is sent. Local state does not grow: a range puts its length there (days, or hours worked), a list or a set
   of files its count, a signature `true`, and an empty one of any of them `null`. So "required" is `is filled` for every type,
   and "over 8 hours" is `lt(8, get shift)`. One function, `behave::lit`, says this in the crate, TS and Swift.

4. **Whose rule it is.**

   | Field | Runs in the renderer, nothing sent | The app's |
   |---|---|---|
   | search | typing, clear, hiding the rows of `filters` (every word in the row's drawn text, any case: #80's rule) | the results, as blocks of a new screen; the URL |
   | slider | the label following the thumb | what the number does |
   | upload | picking, the type and size check, thumbnails, remove | taking the bytes; checking them again |
   | signature | drawing, clear, empty or signed | taking the PNG |
   | date, days | the calendar, `min` and `max`, the era, today's mark | what `today` is (Bangkok's, for the client app) |
   | hours | the times offered, hours worked, the over flag | any finer rule (Sunday and holiday hours) |
   | combo, tags | filtering the options it holds, free text, the tags | the options, when `load` is set |
   | text | growing, the counter, the three marks | |

   Hub's grouped results need no new shape: the app answers the search with sections of rows.

5. **How a value leaves** (`boundaries.md`): with the form's submit; alone, when the form has an `action` and
   the field is committed; or never, when the form has neither. The HTML `form` learns the live rule `config` has.
   A search and a combo's `load` send 250 ms after the last key, only the newest text, and stay usable while the
   app answers. blocks never touches the URL: the app writes the search there and hands it back as `value`.

6. **Files and PNGs leave through a file handler, never through an action.** Every renderer takes one from its
   host (`onFile` in React, `file` in the HTML shell, `.onFile` in SwiftUI). It gets the bytes, what they are for,
   a progress callback and an abort signal, and answers with `{ id, name, src }`. An upload hands each file over
   when it is picked; a signature hands its PNG over when the form is sent. The action then carries ids. With no
   handler the two fields are drawn off. The static page writes a plain file input and the browser posts the
   page's own form; a signature there is drawn empty until the live page takes over.

7. **Locale is on the screen**: `locale: { lang, era, today }` on `screen` and `sheet`. `lang` picks the words a
   field draws itself, from one table in the crate that is generated into TS and Swift. `era: "be"` adds 543 to
   the years drawn and changes no value. `today` is data: no renderer asks the device for the date, so a phone in
   another zone marks the same day, and a fixture draws the same picture every run. `day(iso, locale)` is the one
   way a day is drawn.

8. **One file per type per renderer** (`shapes.md` has the folders), and a contract every renderer's field meets
   (`boundaries.md`): the row and its hooks, a role and a name, state through `lit`, nothing from the device,
   bytes only through the handler, and a field that keeps its text and focus when the screen changes under it.
   The web tables of field views are generated from the folders. The drawn tree lists each form's fields, and a
   type a renderer has no view for is drawn as a text input and recorded as `plain`, so a gap is visible and a
   slice can land one renderer at a time.

9. **An older reader** draws a new type as a one-line text input, as it draws any type it does not know.
   `value` stays text, a number or a switch on every type; a range, a list or a file starts under a name of its
   own (`span`, `picked`, `files`, `file`), which an older reader ignores where it would refuse an object in
   `value`. Nothing here changes a type or a meaning, so the schema's version stays.

10. **Not done.** Preset buttons for hours; marks on calendar days (the client app's crew schedule); underline in rich
    text; a results dropdown under a search; deleting an uploaded file from the app's storage when it is removed
    from the field. Each is an addition later. Whether a date can also be typed is the date slice's design stage;
    if it can, a typed year is read in the era shown.

## Consequences

- drover and cooee build fields with `TextField::new("name")` where they wrote `Field { kind: FieldKind::Text, .. }`:
  a source change at their next pin, no change to what they send. F1's PR says so for apps.
- The client app stores the quotation scope as HTML with underline today. It converts to the three marks at its edge, and
  underline is lost.
- The hours shown are the field's simple sum. An app with finer rules shows its own line beside it and works the
  hours out again when it receives the form.
- An upload sends its file when it is picked, so a form that is never sent leaves files with the app. The app
  clears them, or keeps the bytes itself until the submit (`usage.md` part 4).
- Three small functions now exist in three languages (`lit`, `day`, the rich marks), each held by a file of cases
  in `fixtures/behave/`, as `eval` and `view` are.
- A form's values no longer come from the DOM, so a field can hold what no input can. F1 moves the four old types
  to the new contract with no change to what is drawn or sent: its PR changes no fixture's tree, markup or picture.
- Found on the way, not fixed here: the composer's base64 attachments should move to the file handler. That
  changes what drover's server reads, so it is its own issue; until then one ban below names the composer as its
  exception.

## Open questions, decided by the owner (q2301)

All three recommendations were approved: (1) one cap raise, sized by `drover cap blocks`, in one orchestrator-filed
issue covering these slices and #81's R5, before whichever of R5 and F2 starts first; (2) hours takes the `rest`
option, so 08:00 to 17:00 shows 8 h and the over-8 flag matches the client app's overtime; (3) #80's date cells read the
screen's `locale` and the per-column `era` goes, made by whichever of #80 and F1 lands second. Also accepted: rich
text keeps bold, italic and bullets only, and underline is lost at the client app's edge; the composer's base64
attachments moving to the file handler is its own issue. The questions as they were put:


1. **Cap.** The ten slices add about 3,200 counted lines. Today's total is 16,464 of 19,000, and the 2,492 left
   were sized for the guard and React slices (#120). Recommended: one raise, sized by `drover cap blocks`, in one
   orchestrator-filed issue that covers these slices and R5's, before whichever of R5 and F2 starts first.
2. **Hours and the break.** With plain end minus start, the client app's default 08:00 to 17:00 reads "9 h · over 8",
   which is wrong by the client app's own rule (one hour off a span of five or more). Recommended: the `rest` option as
   specified, so the field shows 8 h and the flag matches the client app's overtime. The other way is no hours and no
   flag in the field at all, and the app draws them through a live form.
3. **Era on the table (#80).** #80's approved design puts `era` on each date column. With `locale` on the screen,
   a column and a date field could disagree. Recommended: an amendment to #80: its date cells read the screen's
   `locale` and the column's `era` goes; whichever of #80 and F1 lands second makes the change.

## Hot files

| File | Class | Becomes |
|---|---|---|
| `kind/parts.rs`: `Field` and `FieldKind`, which every field slice would edit | a central list | the folder `crates/blocks/src/kind/field/`, one file per type. `field/mod.rs` keeps one line per type and is `shared` under a size limit |
| `web/src/render/form.ts`: the chain in `field()` | a central list | the folder `web/src/render/field/`; `just gen` writes `web/src/gen/fields.ts` from it. A new type adds one file |
| React's form (R7) | a central list, not written yet | `web/react/src/fields/`, with `web/react/src/gen/fields.ts` generated the same way. R7 builds its four there if F1 has landed; else F1 moves them |
| `site/views.rs`: the `match` in `field` (760 of 1,000 lines) | a central list | the folder `crates/blocks/src/site/field/`, with one line per type in its `mod.rs`, `shared` under a size limit |
| `BlockFields.swift`: `FieldRow` | a central list | the folder `swift/Sources/BlocksUI/Field/`; `FieldRow.swift` keeps the one `switch`, `shared` under a size limit |
| the words a field draws | a central list, new | never one file: each type lists its own, and `words.ts` and `Words.swift` are generated |
| `fixtures/fields/*.json`, the generated tables | generated | written by `just gen`, never merged by hand |
| docs and CI | split per area | a new `docs/fields.md`; no new CI job: the fixtures run in the web, swift and rust jobs there are |

Nothing is frozen: the old lists are deleted, not kept beside the folders. This sits beside #113's `kind/` folders
whether that lands before or after.

## The `.drover/arch.toml` lines

F1 adds to `generated`: `"web/src/gen/fields.ts"`, `"web/src/gen/words.ts"`, `"swift/Sources/Blocks/Gen/Words.swift"`,
`"fixtures/fields/*.json"`; and to `shared`:
`"crates/blocks/src/kind/field/mod.rs"`, `"crates/blocks/src/site/field/mod.rs"`,
`"swift/Sources/BlocksUI/Field/FieldRow.swift"`; and these tables:

```toml
[[collect]]
dir = "crates/blocks/src/kind/field"
glob = "*.rs"

[[collect]]
dir = "crates/blocks/src/site/field"
glob = "*.rs"

[[collect]]
dir = "web/src/render/field"
glob = "*.ts"

[[collect]]
dir = "swift/Sources/BlocksUI/Field"
glob = "*.swift"

[[size]]
paths = ["crates/blocks/src/kind/field/mod.rs", "crates/blocks/src/site/field/mod.rs", "swift/Sources/BlocksUI/Field/FieldRow.swift"]
max_file_lines = 80

[[ban]]
pattern = "new Date("
paths = ["web/src/core/field/**", "web/src/render/field/**", "web/react/src/fields/**"]
reason = "a field takes today from the screen's locale; it never asks the device for the date"

[[ban]]
pattern = "Date.now"
paths = ["web/src/core/field/**", "web/src/render/field/**", "web/react/src/fields/**"]
reason = "a field takes today from the screen's locale; it never asks the device for the date"

[[ban]]
pattern = "Intl."
paths = ["web/src/core/field/**", "web/src/render/field/**", "web/react/src/fields/**"]
reason = "days and numbers are drawn by the rules every renderer shares, not by the device's locale"

[[ban]]
pattern = "Date()"
paths = ["swift/Sources/BlocksUI/Field/**"]
reason = "a field takes today from the screen's locale; it never asks the device for the date"

[[ban]]
pattern = "Locale.current"
paths = ["swift/Sources/BlocksUI/Field/**"]
reason = "days and numbers are drawn by the rules every renderer shares, not by the device's locale"
```

Whichever of F1 and R7 lands second adds `"web/react/src/gen/fields.ts"` to `generated` and:

```toml
[[collect]]
dir = "web/react/src/fields"
glob = "*.ts"
```

F4 (upload) adds:

```toml
[[ban]]
pattern = "readAsDataURL"
paths = ["web/src/**", "web/react/**"]
except = ["web/src/render/composer.ts"]
reason = "a file leaves as bytes through the file handler, never as base64 inside an action"

[[ban]]
pattern = "toDataURL"
paths = ["web/src/**", "web/react/**"]
reason = "a signature leaves as a PNG blob through the file handler, never as base64 inside an action"

[[ban]]
pattern = "fetch("
paths = ["web/react/src/**"]
reason = "the adapter sends nothing itself: bytes go to the app's file handler, actions to onAction"

[[ban]]
pattern = "URLSession"
paths = ["swift/Sources/BlocksUI/**"]
reason = "a view sends nothing itself: bytes go to the app's file handler, actions to act"
```

The cross-language cases (`fixtures/behave/fields.json`, `days.json`, `rich.json`) are kept by hand, like the
rest of that folder, and are not listed.
