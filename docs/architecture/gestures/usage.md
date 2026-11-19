# Usage: how the callers read

Five callers: a Rust server, a client-built route, a kind's author in the web renderer and in SwiftUI, and a test.
Every name is specified in `shapes.md`. The app names here are made up.

## 1. A Rust server (Mode A): a timeline whose bars move

The block says which gestures it allows. Each one names the action it sends and the name its result goes under.

```rust
fn plan(jobs: &[Job]) -> Block {
    let rows: Vec<TimeRow> = jobs.iter().map(row).collect();
    let schedule = |enabled| Gesture { action: "schedule".into(), name: "bar".into(), enabled };
    Block::Timeline(Box::new(
        Timeline::new("2026-12-01", "2026-12-31", rows)
            .id("plan")
            .off(holidays())
            .moves(schedule(Some(Expr::Get("planner".into()))))
            .stretch(schedule(None)),
    ))
}

fn row(j: &Job) -> TimeRow {
    let bar = |r: &Range| Bar { id: r.id.clone(), start: r.start.clone(), end: r.end.clone(), fixed: Some(j.finished), ..Bar::default() };
    TimeRow { id: j.id.clone(), title: j.name.clone(), bars: j.ranges.iter().map(bar).collect(), ..TimeRow::default() }
}
```

The handler gets one action when the bar is let go. It decides. Nothing was saved before it ran.

```rust
fn schedule(a: &Action, db: &Db) -> Result<Answer, Refusal> {
    let span: Span = a.read("bar")?;
    let before = screen(db);
    let plan = db.plan(&span)?;
    if let Some(day) = plan.blocked.first() {
        return Err(Refusal::new(format!("{day} has timesheet hours")));
    }
    if !plan.effects.is_empty() {
        return Ok(Answer { open: Some(format!("/screens/schedule/confirm/{}", plan.id)), ..Answer::default() });
    }
    db.save(&plan)?;
    Ok(Answer { ops: diff(&before, &screen(db)), ..Answer::default() })
}
```

What the user sees in each of the three endings:

| The handler | The bar |
|---|---|
| answers with ops | stays where it was dropped, dimmed, until the ops land; then it is drawn from the data |
| refuses | goes back to where the data has it; the reason is shown and spoken |
| answers with no change to the bar (here: it opens a confirm sheet) | goes back to where the data has it, with no reason shown |

`Refusal` is the app's own type. blocks has no transport: a refusal is the action's request failing, with the
reason in the `toast` of its body, as every action does today.

## 2. A client-built route (Mode B): a grid whose cells are typed into

```ts
// screens/markup.ts
export function markupScreen(lines: Line[], locale: Locale): Built {
  return built(
    screen({
      id: "markup",
      title: "Mark-up",
      locale,
      blocks: [
        table({
          id: "lines",
          columns: [
            { id: "name", label: "Description", kind: "text", edit: true },
            { id: "qty", label: "Qty", kind: "number", edit: true },
            { id: "price", label: "Unit price", kind: "money", edit: true },
            { id: "margin", label: "Margin %", kind: "number", edit: true },
            { id: "cost", label: "Cost", kind: "money", total: "sum" },
            { id: "sell", label: "Price", kind: "money", total: "sum" },
            { id: "final", label: "Final", kind: "money" },
          ],
          calc: {
            cost: { mul: [{ get: "qty" }, { get: "price" }] },
            sell: { div: [{ get: "cost" }, { sub: [1, { div: [{ get: "margin" }, 100] }] }] },
          },
          rows: lines.map((l) => ({ id: l.id, cells: { name: l.name, qty: l.qty, price: l.price, margin: l.margin, final: l.final } })),
          edit: { action: "set-cell", name: "cell" },
          reorder: { action: "order", name: "rows" },
        }),
      ],
    }),
  );
}
```

```tsx
// routes/markup.tsx
onAction={on<"set-cell" | "order">({
  "set-cell": (a) => setCell.mutateAsync(a.values?.cell),
  order: (a) => setOrder.mutateAsync(a.values?.rows),
})}
```

- `cost` and `sell` change as the user types, by `calc`. Their column totals follow.
- `final` is rounded by a rule only the app knows. It has no `calc`, so it is drawn dimmed from the moment the cell
  is sent until the loader's new screen arrives.
- A handler that rejects or resolves `false` is a refusal: the cell shows the data's value again and the error's
  message is the reason.
- `values.cell` is a `CellEdit`: `{ row, column, value }`. `values.rows` is the row ids in the new order, as a
  `list`'s `reorder` has always sent them.

## 3. A kind's author, web renderer

A view never listens for a drag. It tells the driver what can be grabbed and how to show a candidate. The driver
runs the machine, the keys, the spoken words and the send.

```ts
// web/src/render/timeline.ts
import { timeline as rules } from "../core/kind/timeline.ts";
import { gestured } from "../gesture.ts";

function bar(b: Timeline, r: TimeRow, x: Bar, scale: Scale, c: Ctx): HTMLElement {
  const e = h("div", "tlb", x.label ?? "");
  place(e, scale, c.held(b.id, x.id) ?? x);
  for (const part of ["body", "start", "end"] as const) {
    gestured(part === "body" ? e : grip(e, part), c, {
      block: b,
      rules,
      grab: { bar: x.id, part },
      reach: (dx) => ({ days: Math.round(dx / scale.day) }),
      show: (span) => place(e, scale, span ?? x),
    });
  }
  return e;
}
```

- `rules` is the kind's own part, with no DOM in it: which gesture a grab belongs to, the candidate for a reach,
  the candidates the arrow keys walk, and the words for a candidate. Rust, TS and Swift each have it, and
  `fixtures/gesture/timeline.json` holds them equal.
- `place` sets a transform and nothing else.
- `c.held` gives the candidate of a bar whose action is out. The patcher may redraw the block meanwhile, and the
  bar is still drawn where it was dropped.

## 4. A kind's author, SwiftUI

```swift
// swift/Sources/BlocksUI/Kind/Timeline.swift
BarView(bar: held[bar.id] ?? bar, scale: scale)
    .gestured(block, grab: .init(bar: bar.id, part: .body), rules: TimelineRules.self) { drag in
        .init(days: Int((drag.width / scale.day).rounded()))
    }
```

`.gestured` adds the drag, the focus and its keys, one named accessibility action per step the rules list, the
announcements, and the pending look. `held` comes from the environment, as `act` does.

## 5. A test: three ways in, one action out

A fixture case names a grab, a reach and the action that must be sent.

```json
{
  "block": { "type": "timeline", "id": "plan", "from": "2026-12-01", "to": "2026-12-31",
    "rows": [{ "id": "j1", "title": "Tower A", "bars": [{ "id": "b7", "start": "2026-12-03", "end": "2026-12-05" }] }],
    "move": { "action": "schedule", "name": "bar" } },
  "cases": [
    { "grab": { "bar": "b7", "part": "body" }, "reach": { "days": 3 },
      "want": { "id": "b7", "start": "2026-12-06", "end": "2026-12-08" }, "says": "6 Dec to 8 Dec, 3 days" },
    { "grab": { "bar": "b7", "part": "body" }, "reach": { "days": 40 }, "want": null }
  ]
}
```

The crate, `core/kind/timeline.ts` and Swift's `TimelineRules` each run every case. The harnesses then run it
through the real view, once per way in, and `report.sent` must hold the same one action each time:

```json
[
  { "gesture": { "id": "plan", "grab": { "bar": "b7", "part": "body" }, "reach": [{ "days": 1 }, { "days": 3 }], "via": "pointer" } },
  { "shot": { "name": "dropped" } },
  { "refuse": { "toast": "6 Dec has timesheet hours" } },
  { "shot": { "name": "back" } }
]
```

`via` is `pointer`, `keys` or `action` (the named accessibility action). `answer`, which exists, confirms.
