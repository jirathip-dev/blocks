# Usage: how the callers read

One client app route per field, then the file handler, a Rust server and the route's test. Every name is specified in
`shapes.md`. The routes are the ones in the client app's inventory (its inventory issue, the Missing kinds table).

Every screen gets its language, era and today once, from one helper of the app:

```ts
// packages/ui/src/blocksLocale.ts (the client app's): the user's preferences, and today in Bangkok
export const locale = (): Locale => ({ lang: prefs.language, era: prefs.buddhistEra ? "be" : "ce", today: bangkokToday() });
```

## 1. search: hub `/`, with grouped results

The search is a field of a live form. Its text leaves 250 ms after the last key. The app puts it in the URL, the
loader runs again, and the results are the screen's own blocks: one section of rows per group.

```ts
// apps/hub/src/screens/apps.ts
export function appsScreen(apps: AppTile[], q: string, hits: HitGroup[], locale: Locale): Built {
  const found = hits.map((g) => section({ id: `hits-${g.app}`, header: g.app, blocks: [list({ id: `rows-${g.app}`, rows: g.items.map(hitRow) })] }));
  return built(
    screen({
      id: "apps",
      title: "Apps",
      locale,
      blocks: [
        form({ id: "find", action: "find", fields: [{ type: "search", name: "q", label: "Search", value: q, placeholder: "Search every app" }] }),
        ...(q === "" ? [list({ id: "tiles", rows: apps.map(tileRow) })] : found.length ? found : [text({ id: "none", text: `Nothing matches “${q}”` })]),
      ],
    }),
  );
}
```

```tsx
// apps/hub/src/routes/index.tsx
export const Route = createFileRoute("/")({
  validateSearch: (s): { q: string } => ({ q: String(s.q ?? "") }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => appsScreen(await api.apps(), deps.q, deps.q ? await api.search(deps.q) : [], locale()),
  component: () => {
    const navigate = Route.useNavigate();
    return <BlocksView screen={Route.useLoaderData()} look={brand} onAction={on<"find">({ find: (a) => navigate({ search: { q: String(a.values?.q ?? "") }, replace: true }) })} />;
  },
});
```

The text being typed and the focus stay while the results change under it. A reload or a shared link opens with the
same search, because the URL holds it. The clear button empties the box and sends `q: ""` at once.

## 2. search: admin `/`, a local filter

Nothing is sent. `filters` names a list or table on the screen, and rows that do not match are hidden as you type.

```ts
form({ id: "find", fields: [{ type: "search", name: "q", label: "Search people", filters: "people" }] }),
table({ id: "people", filter: false, columns, rows }),
```

To keep this one in the URL too, give the form `action: "find"` and handle it as in part 1, passing the URL's text
back as the field's `value`.

## 3. slider: hub `/settings`

```ts
form({ id: "text-size", action: "text-size", fields: [{ type: "slider", name: "size", label: "Text size", min: 80, max: 130, step: 5, unit: "%", value: prefs.textSize }] }),
```

```ts
"text-size": (a) => prefs.setTextSize(Number(a.values?.size)),
```

The label ("110 %") follows the thumb with nothing sent. The action goes once, when the thumb is let go. The same
field with `min: 0, max: 12, step: 0.5, unit: "h"` and a submit is manpower-request's hours worked.

## 4. upload and signature: delivery `/driver`

```ts
// apps/delivery/src/screens/proof.ts
form({
  id: "proof",
  fields: [
    { type: "upload", name: "photos", label: "Photo of the problem", accept: ["image"], capture: true, many: true, mb: 10 },
    { type: "text", name: "recipient", label: "Recipient name", checks: [{ ok: expr.is(expr.get("recipient"), "filled"), say: "Enter the recipient's name" }] },
    { type: "signature", name: "signature", label: "Recipient signature", checks: [{ ok: expr.is(expr.get("signature"), "filled"), say: "Add a signature" }] },
    { type: "toggle", name: "ack", label: "I confirm the quantities above", checks: [{ ok: expr.get("ack"), say: "Confirm the quantities" }] },
  ],
  submit: { action: "record", label: "Record delivery" },
}),
```

```tsx
// apps/delivery/src/routes/driver.tsx
<BlocksView
  screen={screen}
  onFile={async (file, about) => {
    const kind = about.field === "signature" ? "signature" : "photo";
    const { evidenceId } = await api.uploadEvidence({ kind, bytes: file, mime: about.mime, onProgress: about.progress, signal: about.signal });
    return { id: evidenceId, name: about.name };
  }}
  onAction={on<"record">({
    record: (a) => api.submit({ recipientName: String(a.values?.recipient), signatureEvidenceId: String(a.values?.signature), photoEvidenceIds: strings(a.values?.photos) }),
  })}
/>
```

What the caller gets without writing it:

- A picked photo goes to `onFile` at once and shows its thumbnail with a progress bar, then a remove button. One
  that fails shows retry and remove. A file of the wrong type or over 10 MB is refused in the field and never
  reaches the app.
- The signature's PNG is made and handed to `onFile` when the form is sent, then `record` goes with its id. If
  `record` fails and is sent again, the PNG is not uploaded twice. A new stroke or clear drops the id.
- The submit stays off while a photo is uploading or failed, and while the signature is empty.
- `record` carries `photos: ["ev_1", "ev_2"]` and `signature: "ev_3"`: ids only, never bytes.

An app that wants one request for everything keeps the files itself: `onFile` stores the blob in a map and returns
a local id, and `record` reads the map.

## 5. date, hours and multi-line text: manpower-request `/`

```ts
// apps/manpower-request/src/screens/request.ts
form({
  id: "request",
  fields: [
    { type: "date", name: "day", label: t("Date"), value: draft.day, min: locale.today },
    { type: "hours", name: "shift", label: t("Work time"), span: { from: "08:00", to: "17:00" }, step: 30, rest: { from: 5, take: 1 }, over: 8 },
    { type: "text", name: "ot", label: t("OT reason"), rows: 2, max: 500, placeholder: t("Why past 8 h?"),
      show: expr.lt(8, expr.get("shift")), checks: [{ ok: expr.is(expr.get("ot"), "filled"), say: t("Say why") }] },
  ],
  submit: { action: "request", label: t("Send request") },
}),
```

- The date opens a month calendar. With the screen's `era: "be"` it reads "19 พ.ย. 2569" in Thai and "19 Nov
  2569" in English; the value sent is always `"2026-11-19"`.
- 08:00 to 17:00 shows "8 h": nine hours less the one-hour break that spans of five hours or more take. 08:00 to
  19:00 shows "10 h · over 8", and the OT reason appears, because the field's value in local state is the hours
  worked. Nothing is sent for any of this.
- `request` carries `day: "2026-11-19"`, `shift: { from: "08:00", to: "19:00" }` and `ot`. The app's own rules
  (Sunday and holiday hours) stay the app's: it works them out again from what it receives.

## 6. days: project-management `/manpower`, a date range

```ts
form({ id: "period", action: "period", fields: [{ type: "days", name: "period", label: "Period", span: { from: month.first, to: month.last }, max: locale.today }] }),
```

```ts
period: (a) => navigate({ search: (s) => ({ ...s, ...fromTo(a.values?.period) }) }),
```

The action goes once, when the second day is picked.

## 7. combo and tags: ledger `/ap/invoices`, manpower-request `/`, admin `/`

```ts
// options the app loads as you type: a supplier among thousands
{ type: "combo", name: "supplier", label: "Supplier", value: invoice.supplierId, load: "find-supplier",
  options: suppliers.map((s) => ({ value: s.id, label: s.name, note: s.taxId })) },

// a fixed list, filtered in the renderer, where a typed position that is not in it is kept
{ type: "combo", name: "position", label: t("Position"), options: positions.map((p) => ({ value: p.label })), free: true },

// several at once
{ type: "tags", name: "departments", label: "Departments", picked: person.departments, options: departments.map((d) => ({ value: d.id, label: d.name })) },
```

```ts
"find-supplier": (a) => navigate({ search: (s) => ({ ...s, supplier: String(a.values?.q ?? "") }), replace: true }),
```

`find-supplier` goes 250 ms after the last key; the loader runs again and the field's `options` change under the
typed text. The entry of the current value must be among the `options`, so the field can show its label.

## 8. rich text: project-management `/prospects`, the quotation's scope

```ts
{ type: "text", name: "scope", label: "Scope", rows: 6, grow: 16, rich: true, value: "**Supply and install**\n- 2 towers\n- crane *not* included" },
```

The value is that text. A `text` block with `markdown` draws it anywhere else.

## 9. The file handler in the other renderers

```ts
// Mode A, the HTML shell: the app that boots it passes the same handler
boot({ root, stream, file: (file, about) => put(`/upload/${about.field}`, file, about) });
```

```swift
BlocksView(screen: screen, act: act).onFile { url, about in try await api.upload(url, about) }
```

With no handler, an upload or a signature field is drawn off, with a line that says so.

## 10. A Rust server (Mode A)

```rust
Form::new(vec![
    SliderField::new("size", 80, 130).step(5).unit("%").value(100).into(),
    SearchField::new("q").filters("threads").into(),
    TextField::new("note").rows(3_u8).max(500_u32).into(),
])
.id("prefs")
.action("prefs")
```

A field that existed before reads `TextField::new("name")` where it read `Field { kind: FieldKind::Text, .. }`.

## 11. The route's test

```ts
test("request: the date, the hours and the reason", () => {
  const s = requestScreen(sample, locale);
  deepStrictEqual(check(s), []);
  deepStrictEqual(start(s).shift, 8);
  deepStrictEqual(view(s, { ...start(s), shift: 10, ot: "" }).says, { ot: "Say why" });
  deepStrictEqual(expect(tree(s, native), want), []);
});
```

`want`, the route's committed tree, lists each form's fields: name, type and whether it is drawn natively.
