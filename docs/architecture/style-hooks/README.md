# style hooks: 14 named finishes a look's values are written against (#392)

## Summary

Decision: no per-part map as shadcn has it: that needs one style language, and blocks draws with CSS, SwiftUI and
egui. Instead 14 named finishes (surface, tint, button, mark and the ten labels): a kind tags a part with one, and a
style value is written against finishes only, never a renderer's private names. style.json does not change.
Slices: five: finishes and one file per axis in the crate; the web tags; the SwiftUI finish folder and its ban; the
guard; then the look gaps the new check lists. About 250 counted lines.
Open questions, answered by the owner (2026-11-24): an app's CSS may style `.as-<finish>` from the start; S5 closes the
gaps found, each S5 issue naming every baseline line as close or keep for the owner's yes.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: a look's file, a kind on the web and in SwiftUI, a new style value, an app's CSS, the checks |
| `adr.md` | the question, what was measured, the four options, the decision in eight parts, consequences, open questions, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the folders, `Finish`, `Rule`, `Axis`, what is generated, the worn file, the gap baseline, the harness report |
| `boundaries.md` | which module may call which and what enforces it; two statecharts (a part and its finish, a style value on one renderer) |

## The answer in one table

| The issue asks | Answer |
|---|---|
| a named hook on every part of every kind | no: about 550 private class names would become public and frozen; the six content parts (`b-<kind>__<part>`) stay as they are |
| a look file that maps hooks | style.json already is that file; what changes is what its values land on: 14 finishes, not private selectors |
| the HTML and React equivalents | one class, `as-<finish>`, in the one markup all three HTML writers share; the look's CSS selects nothing else |
| the SwiftUI equivalent | one file per finish in `BlocksUI/Finish/`: the only code that reads a style value; a kind calls it and reads none |
| how the lints and the guard check it | built so a style rule cannot name a private class; a ban; a per-kind parity check between renderers; one new fact in the measured look check; `css/private-selector` learns `.as-` |
| the migration of the Style axes | `surface`, `fills`, `buttons`, `marks`, `sections` and `labels` each move to finish rules with no pixel changed; `type`, `space`, `radius`, `motion` and `easing` are tokens and stay |

## The 14 finishes

| Finish | A part that is | Restyled by | Web today | SwiftUI today |
|---|---|---|---|---|
| `surface` | a tile: card ground, edge, corner | `surface` | a list of 9 private selectors, in `tiles.css` and again in `style.rs` | `.surface(look, radius:)`, 17 calls |
| `tint` | filled with a tint while it is on: a picked chip, a done mark, a pill | `fills` | `.chips button.on,.spi.done .spm` | `.chip`, `.accent`, `look.pill`, and 7 reads inside kind files |
| `button` | a button; `primary` is its one variant | `buttons` | the `button` and `a.btn` elements | `CardButton` |
| `mark` | a symbol a look may write as a word | `marks` | `.spi.done .spm`, with the word "done" in the crate's CSS | `Mark(text:) { symbol }`, and 2 reads inside kind files |
| `<role>-label`, ten | a label a look may decorate: kind, header, group, section, title, button, chip, back, said, picked | `labels.<role>`, `sections` | 6 roles by private selector, 4 with none | `look.label(role, text)`, 5 roles |

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`: 26,191 of 44,000 at `a9b4866` (`drover cap
blocks`). S2 and S3 change no pixel; their PR bodies carry the run that proves it (`adr.md` part 6).

| | Slice | Builds | Counted lines | After |
|---|---|---|---|---|
| S0 | this issue's PR | this folder | 0 | |
| S1 | crate: finishes and axes | `theme::Finish`, `Rule`, `Axis`; `style.rs`'s axes become one file each in `theme/axis/`; `css.rs` and the codegen read the one generated list; `gen/hooks.ts` and Swift's `Gen` get the finishes. Each finish's selector is still today's private one, so the CSS written is byte for byte the same | +120 | S0 |
| S2 | web: the tags | the three HTML writers tag parts `as-<finish>`; `css/look/<finish>.css`; each finish's selector becomes its class; `fixtures/look/worn.json`; `blocks-shot` reports what it drew; the look check's new fact; the first `web` lines of the gap baseline | +40 | S1 |
| S3 | SwiftUI: the finish folder | `Look+Style.swift`'s helpers move to `BlocksUI/Finish/`, one file each; the 10 stray reads move into them; the ban; `blocks-snap` reports; parity and the new fact; the first `swift` lines of the baseline | +80 | S1 |
| S4 | guard | `css/private-selector` knows `.as-<finish>`; its fixture; `renderers.md` and `docs/theme.md` name the finishes | +10 | S2 |
| S5 | the gaps | one issue per renderer: each baseline line is closed (the renderer draws it) or kept with its reason; the ban on a kind's CSS restating a tile | about 0 | S2, S3 |
| later | an app's SwiftUI finish | `.finishStyle(.surface, …)`, as `.blockStyle` is for a block; filed, not queued until an app asks | about +60 | S3 |

S2 and S3 can run side by side. The desktop renderer is not in these slices (`adr.md`, consequences).

## What was measured here

- #376 (filled buttons, merged 2026-11-23) is the last style value added: 25 files, `src` net +0, one review round,
  no file under `web/src/render` or `web/react/src`, 12 lines in two Swift files. A new value is already cheap.
- What is wrong is where a value lands. On the web it lands on private selectors kept in the crate: the tile list
  is written in `tiles.css` and again in `style.rs`'s `tiles!`, and steps (`.sp`), which restates the tile in
  `steps.css`, is in neither, so `surface: dashed` does not reach it; SwiftUI's steps calls `.surface(look)`.
- No table says which renderer draws which value: `sections: quiet` is read nowhere in SwiftUI; the `title` and
  `picked` labels are web only, `kind` is SwiftUI only, and `group`, `back` and `said` are drawn by neither;
  `fills: solid` writes no web rule.
- `web/src/css/kind/` has about 550 distinct class names; the public contract has 6 part names.
- The token baseline (`ci/tokens/baseline.txt`) has 623 raw values: 352 in the Swift kinds, 197 in the kinds' CSS.
