# Shapes

The Rust types are the source; `just gen` writes the schema, the TS and the Swift from them, as for every kind.

## Where things live

```
crates/blocks/src/kind/
  field/mod.rs               the `Field` union: one line per type, and what every field shares
  field/<type>.rs            one type: its struct, its sample, its words
  locale.rs                  Locale, Lang, Era, the month and weekday names, day()
crates/blocks/src/behave.rs  lit(): what a field's value is in local state
crates/blocks/src/site/field/<type>.rs      the static page's writer for one type
web/src/core/field/          no DOM: calendar.ts, match.ts, files.ts, rich.ts (the core is #81's slice R1)
web/src/render/field/<type>.ts              the HTML view of one type
web/react/src/fields/<type>.ts              the React view of one type
swift/Sources/BlocksUI/Field/<Type>.swift   the SwiftUI view of one type
web/src/gen/fields.ts, web/react/src/gen/fields.ts    generated from those folders: the table of field views
web/src/gen/words.ts, swift/Sources/Blocks/Gen/Words.swift    generated: every word a field draws, per language
fixtures/fields/<type>.json                 generated: a form with that field in each of its states, the long, empty and many ones included
fixtures/behave/fields.json, days.json, rich.json    kept by hand: the cases all three languages run
```

`parts.rs` loses `Field`, `FieldKind` and the field half of `FieldValue`. `form.ts`, `site/views.rs` and
`BlockFields.swift` lose their chain of `if type is…`.

## The field union

```rust
field! {
    /// A search box: filters a list or table on the screen, or sends its text in a live form.
    pub struct SearchField {
        value: Option<String>,
        placeholder: Option<String>,
        filters: Option<String>,
    }
}

fields! {
    Text(TextField) = "text",
    Toggle(ToggleField) = "toggle",
    Picker(PickerField) = "picker",
    Secret(SecretField) = "secret",
    Search(SearchField) = "search",
    Slider(SliderField) = "slider",
    Upload(UploadField) = "upload",
    Signature(SignatureField) = "signature",
    Date(DateField) = "date",
    Days(DaysField) = "days",
    Hours(HoursField) = "hours",
    Combo(ComboField) = "combo",
    Tags(TagsField) = "tags",
}
```

`field!` adds what every field has (`name`, required; `label`, `doc`, `was`, `error`, `open`, `show`, `enabled`,
`checks`) and gives the type `new(name, <its required fields>)` and a setter per optional one, as `kind!` does.
`fields!` writes `enum Field`, tagged by `type`, with one more case, `Other`, for a type this version does not
know: it is kept whole and drawn as a one-line text input, which is what every renderer does with one today. A
known type of the wrong shape is refused, as a block is.

As generated for TS (the shared part left out of each line):

```ts
export type Field =
  | { type: "text"; value?: FieldValue; placeholder?: string; keyboard?: Keyboard; rows?: number; grow?: number; max?: number; rich?: boolean }
  | { type: "toggle"; value?: FieldValue }
  | { type: "picker"; value?: FieldValue; options?: string[] }
  | { type: "secret"; placeholder?: string; set?: boolean }
  | { type: "search"; value?: string; placeholder?: string; filters?: string }
  | { type: "slider"; min: number; max: number; step?: number; value?: number; unit?: string }
  | { type: "upload"; accept?: Accept[]; capture?: boolean; many?: boolean; mb?: number; files?: FileRef[] }
  | { type: "signature"; file?: FileRef }
  | { type: "date"; value?: Day; min?: Day; max?: Day }
  | { type: "days"; span?: Days; min?: Day; max?: Day }
  | { type: "hours"; span?: Shift; step?: number; rest?: Rest; over?: number }
  | { type: "combo"; value?: string; options?: Entry[]; free?: boolean; load?: string; placeholder?: string }
  | { type: "tags"; picked?: string[]; options?: Entry[]; free?: boolean; load?: string; placeholder?: string };

export type Day = string;                       // "2026-11-19", always the common era; refused if it is no real day
export type Clock = string;                     // "08:00", 24 hours; refused if it is no time
export type Days = { from: Day; to: Day };      // both ends count
export type Shift = { from: Clock; to: Clock }; // the same day; `to` is after `from`
export type Rest = { from: number; take: number }; // hours: a shift of `from` or more has `take` taken off
export type Entry = { value: string; label?: string; note?: string }; // `label` is `value` when left out; `note` is the second line
export type FileRef = { id: string; name?: string; src?: string };    // `src`: a picture of it the app serves
export type Accept = "image" | "pdf" | "sheet"; // sheet: CSV and XLSX; none listed means any file
```

| Field | Meaning |
|---|---|
| text `rows` | 2 or more makes it multi-line and is the height it starts at |
| text `grow` | the most rows it grows to as the text gets longer; left out, it does not grow |
| text `max` | the most characters; the input takes no more, and a counter shows near the end |
| text `rich` | the value is text with three marks and no others: `**bold**`, `*italic*`, a line starting `- ` |
| search `filters` | the id of a `list` or `table` on the screen whose rows it hides |
| slider `unit` | drawn after the number in the label: "110 %" |
| upload `capture` | on a phone, the camera first |
| upload `many`, `mb` | more than one file; the most megabytes one file may have |
| hours `step` | minutes between the times offered; 30 when left out |
| hours `over` | worked hours above this are flagged |
| combo `free` | a typed text that matches no option is kept as the value |
| combo `load` | the action that asks the app for options; it carries `{ q }` |

## Three views of a value

| Type | What it starts with | In local state (what `show`, `enabled` and `checks` read) | Sent in the action's `values` |
|---|---|---|---|
| text, search | `value`: text | the text | the text |
| toggle, picker, secret | as today | as today | as today |
| slider | `value`: a number | the number | the number |
| date | `value`: a day | the day, `""` when none | the day |
| days | `span`: `{ from, to }` | how many days, `null` when none | `{ from, to }` |
| hours | `span`: `{ from, to }` | hours worked, after `rest`; `null` when none | `{ from, to }` |
| combo | `value`: the picked entry's `value`, or the typed text | the same | the same |
| tags | `picked`: a list of them | how many, `null` when none | the list |
| upload | `files`: the files already there | how many are uploaded, `null` when none | their ids, a list |
| signature | `file`: the one already there | `true` when signed, else `null` | its id |

`value` stays what it is today on every type: text, a number or a switch. A start that is none of those has its
own name (`span`, `picked`, `files`, `file`). An older reader types `value` and would refuse a whole screen over
an object there; a name it does not know it ignores.

Local state stays what it is: null, a switch, a number or a string. A value that is not one of those puts its size
there, so `is filled` means "required" for every type. `behave::lit(field, held)` is the one function that says
so, in the crate, TS and Swift; `fixtures/behave/fields.json` holds its cases.

## Locale: on `screen` and `sheet`

```ts
export type Locale = { lang?: "en" | "th"; era?: "ce" | "be"; today?: Day };
```

- `lang` picks the words a field draws itself (month names, "clear", "no match", "over"). The app's own labels are
  the app's, as today. A language a renderer does not know is drawn in English.
- `era: "be"` adds 543 to every year drawn. Values never change.
- `today` marks that day in a calendar and gives it a today button. Left out, no day is marked: a renderer never
  asks the device for the date.
- `day(iso, locale)` is the one way a day is drawn: "19 Nov 2026", "19 Nov 2569", "19 พ.ย. 2569". It exists in
  the crate, TS and Swift, and `fixtures/behave/days.json` holds its cases. Table (#80) draws its date cells with it.

Each `field/<type>.rs` lists its words as `(key, en, th)`. `just gen` collects them into `words.ts` and
`Words.swift`, so the three renderers say the same thing.

## The file handler

```ts
/// What the renderer tells the app about one file. `progress` takes 0 to 1; `signal` aborts when the file is removed.
export type Picked = { screen: string; block?: string; field: string; name: string; mime: string; size: number; progress: (part: number) => void; signal: AbortSignal };
/// The app takes the bytes and answers with a small ref. A rejection is the failed state.
export type OnFile = (file: Blob, about: Picked) => Promise<FileRef>;
```

| Renderer | Where the handler is passed |
|---|---|
| React | `BlocksView`'s `onFile` |
| HTML shell | `boot`'s `file`, which becomes `Ctx.file` |
| SwiftUI | `.onFile { url, about in … }`; cancelling the task is the abort |
| static page | none: it writes a plain file input, and the browser posts the page's own form |

A signature's PNG is black ink on white, twice the size the pad is drawn at, named `<field>.png`.

## What a field view gives its form

```ts
export type FieldView<F> = (field: F, c: FieldCtx) => {
  el: HTMLElement;
  /// The value to send. A signature uploads here. `undefined` leaves the field out.
  sent(): Promise<unknown> | unknown;
  /// True while it cannot be sent: a file is uploading or failed.
  busy?(): boolean;
};
export type FieldCtx = { locale: Locale; words: Words; file?: OnFile; store: Store; set(value: unknown): void; load?(q: string): void };
```

The form no longer reads inputs out of the DOM. A view calls `set` on every change; the form turns that into local
state with `lit` and, in a live form, into an action. React's field view has the same parts as props.

## The drawn tree and check

A form's node in the drawn tree (`fixtures/trees/`) gains `fields`:

```json
{ "kind": "form", "id": "proof", "drawn": "native", "fields": [
  { "name": "photos", "type": "upload", "drawn": "native", "role": "group", "label": "Photo of the problem" },
  { "name": "signature", "type": "signature", "drawn": "plain", "role": "textbox", "label": "Recipient signature" } ] }
```

`plain` means this renderer has no view for the type yet and drew a text input; `hidden` means its `show` is false.

`check` gains one fault, `{ fault: "aim", field, id }`: a search whose `filters` names no list or table on the
screen. A `Day` or `Clock` that is no real day or time is a `shape` fault.
