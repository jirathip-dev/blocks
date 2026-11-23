# plot: how the callers read (#351)

Sketches, written before the code. Names are the ones in `shapes.md`.

## 1. An app builds the plot

```rust
fn pull() -> Plot {
    let force = Trace { name: "Force".into(), tone: Some(Tone::Accent), ..Trace::default() };
    Plot::new("Pull", vec![force])
        .id("pull")
        .x(Axis { label: Some("Time".into()), scale: Some(AxisScale::Time), ..Axis::default() })
        .y(Axis { label: Some("Force".into()), unit: Some("kg".into()), min: Some(0.into()), max: Some(60.into()), ..Axis::default() })
        .window(30)
        .target(Target { min: 20.into(), max: 30.into() })
}
```

A static plot is the same value with its points filled in and no `window`. `Built::check` refuses an unfit one.

## 2. The app streams: one call per sample, one put per frame

```rust
fn on_sample(state: &mut State, s: Sample) {
    if state.pull.push("Force", s.seconds, s.kg) && s.kg > state.best {
        state.best = s.kg;
        state.pull.peak = Some(peak(s.kg));
    }
}

fn on_tick(state: &State, shelf: &mut Shelf<Key>) -> Result<Option<Arc<str>>, Broken> {
    Ok(match shelf.put(&state.key, "/live", &state.screen())? {
        Put::Changed(delta) => Some(delta.frame),
        Put::Same | Put::First => None,
    })
}
```

The gauge calls `on_sample` 80 times a second; the app's timer calls `on_tick` once per display frame and sends
what it returns. `push` trims to the window. The app writes no op: `diff` does.

The frame one tick sends:

```json
{ "k": "/live", "from": 412, "rev": 413, "ops": [
  { "op": "merge", "id": "now", "fields": { "value": "41.6 kg" } },
  { "op": "merge", "id": "pull", "fields": { "peak": { "y": 41.6, "label": "Peak 41.6 kg" } } },
  { "op": "points", "id": "pull", "series": "Force", "drop": 2, "x": [30.0125, 30.025], "y": [41.2, 41.6] }
] }
```

## 3. A core in the view's own process may write the op itself

```rust
let op = Op::Points { id: "pull".into(), series: "Force".into(), drop: Some(gone), x, y };
```

It is the same op under the same three rules. Such a core keeps its own series bounded, since no `push` does it.

## 4. A web page changes nothing

```ts
import { mount } from "@jirathip-dev/blocks/shell";

mount({ root, layout, url });
```

`mount` opens the stream and makes the patcher; `host` hands the patcher the plot's in-place view. Inside blocks:

```ts
const patch = (root: HTMLElement, model: () => Block) => patcher({ root, model, draw, grow, sync: { plot: sync } });
```

```ts
case "points":
  return void v.late.add(op.id);
```

```ts
for (const id of v.late) late(v, id, model);
```

`late` finds the element and the block, skips an element drawn fresh in this pass, calls the kind's `sync` and
redraws when it answers false.

## 5. A Swift app changes nothing

```swift
replica.frames(burst)

BlocksView(replica.screen("/live") ?? waiting, source: source)
```

`burst` is every frame that arrived since the last display frame. Inside `Block.apply`:

```swift
case .points(let p):
    guard edit(p.id, { $0.grow(p) }) else { throw .shape("block `\(p.id)` does not take the points") }
```

## 6. The tests

Every language runs the shared cases and the stream:

```rust
#[test]
fn points_runs_every_fixture_case_and_the_stream_ends_on_its_screen() {
    for (name, case) in cases("plot") { /* op on the plot: the wanted series, or a Shape error */ }
    let s: Stream = read("plot/stream.json");
    let mut screen = s.start;
    for f in s.frames { apply(&mut screen, &f.ops).unwrap(); }
    assert_eq!(screen, s.end);
}
```

The HTML perf check the AC asks for, in `web/test/kind/plot.test.ts`:

```ts
test("80 points a second for 60 s keep every frame in 16.7 ms and each patch in 4 ms", async () => {
  const steps = Array.from({ length: 3600 }, (_, i) => ({ frame: { k: "live", from: i, rev: i + 1, ops: pointsOf(i) } }));
  const { report, trees } = await shot({ screen: live, steps: [...steps, { shot: { name: "end" } }] });
  strictEqual(report.timings.frames_over_budget, 0);
  ok(report.timings.longest_frame_ms <= 16.7);
  ok(report.timings.longest_patch_ms <= 4);
  deepStrictEqual(trees.end, (await shot({ screen: ended })).trees.shot);
});
```

`pointsOf(i)` gives one `points` op of one point, and of two on every third frame: 4,800 points over 3,600
frames at the harness's 60 a second, on a plot with no window, so it ends holding all 4,800.

The Swift gate, in `PlotTests.swift`: the same 4,800 points, each frame also merging a stat and the peak; no
frame's `apply` takes over 2 ms.
