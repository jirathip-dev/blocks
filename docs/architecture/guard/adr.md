# ADR: the guard kit blocks ships to every app (#79)

## Summary

Decision: all rules and verdicts live in the Rust crate. One new command lints an app's screens from seeded fixture
files, has the existing harnesses draw them at 390 and only measure, and fails only on new findings in changed files,
against a per-screen baseline that can only shrink. Every finding carries its fix.
Slices: nine in blocks (codegen folder, lint, command and ratchet, render at 390, skill, SwiftUI, explore, kind
folders, new-kind scaffold), then drover's hook and one adopting issue each in drover, cooee and synergy.
Open questions: the line cap (about +2,400 lines); cooee's render per UI PR or nightly; kind folders now or later.

## The question

Agents keep hand-drawing UI and screens overflow on the phone. blocks checks only its own fixtures:
`blocks-shot --check` (inside the width, over no sibling) and `Built::check` (unknown kinds, fields, shapes). How
does blocks give drover, cooee and synergy one guard for their own screens that is cheap in CI, runs before a lane
ends its turn, and does not fail an app for the debt it already has?

## What exists, and what it lacks

| Exists | Lacks |
|---|---|
| `Built::check(app) -> Vec<Fault>`: a screen unfit to send | nothing about a screen that is fit to send and bad to use |
| `blocks-shot --check`, `blocks-snap --check`: tree, size, width, overlap, as lines of text on stderr | clipped text, tap targets, contrast in place; a rule id, a fix, a shape a machine reads |
| `tree::expect`, `behave::view`, `patch::apply`: the crate can say what a screen draws and how it changes | a use of them to walk a screen |
| `fixtures/screens/`: 42 goldens of two apps, kept here | the same in each app, per screen and seed |
| one harness launch per fixture in `web/test/shot.test.ts` (27 WebKit launches) | one launch for many screens |

Three apps of three shapes: drover (Rust and TS), cooee (Rust and Swift, no Node), synergy (TS, with a Rust
toolchain). Rust is the one runtime all three have.

## The options

| Choice | Options | Taken | Why |
|---|---|---|---|
| Where rules and verdicts live | (a) in each harness, TS and Swift; (b) in the crate, the harnesses only measure | b | one rule table, one fix text, one ratchet; a harness cannot emit a finding without a fix because it has no finding type. The repo already works this way: Rust is the source |
| What is linted | (a) the builders' source; (b) screens as JSON fixtures the builders write from seeded data | b | a screen is data; one reader for Rust and TS apps; a fixture is a file, so "changed files" is `git diff` |
| The command | (a) grow `blocks-shot` (Node): cooee has no Node; (b) a release binary per commit: apps pin commits, not tags, so a new release line to run and trust; (c) a Rust crate with `pub fn main`, run by a three-line bin in the app at the same pin | c | no install step, the app's own cache, one pin, the pin test already covers it |
| The baseline | (a) one count per rule: any new finding hides behind a fixed one; (b) one file of entries: every PR edits it; (c) one file of entries per fixture | c | a PR edits only the baseline of the screen it touches; a merge conflict there means the fixture conflicts too |
| Explore | (a) a random monkey in the browser: needs a server, WebKit decides, hard to replay; (b) the crate walks its own model of the screen and the harness replays the steps | b | seeded and replayable by construction; the shrinker and the lint run with no browser; SwiftUI replays the same file |
| An existing kit | adopt pbakaus/impeccable; build our own | own | owner decision; taken as ideas: rule ids, severities, ignore with a reason, unused ignores, SARIF, a check before the turn ends |

## The decision

**1. Rules are data in the crate.** `blocks::guard` holds a table of `Rule { id, severity, since, what, fix }`, one
file per rule in `guard/rules/`, listed by a generated `mod.rs`. An id is `<engine>/<name>`: `lint/` (the crate, on a
`Built`), `render/` and `css/` (a harness, at 390), `explore/` (a walk), `guard/` (the ratchet itself). Two
severities: `error` fails when it is new; `warn` is printed and never fails, never baselined.

**2. Every finding carries its fix.** `Finding.fix` is a required field, filled from the rule table and from nowhere
else. A harness reports a `Seen` (rule id, block, what it measured), which has no fix and no severity; only the crate
turns a `Seen` into a `Finding`. A test over the table fails a rule with an empty `what` or `fix`, a duplicate id, a
`since` over `guard::VERSION`, or no failing fixture of its own. clippy, `web/lint.mjs` and arch-check keep their
own messages.

**3. One command, four passes.** `blocks check` loads `.blocks/guard.json`, picks the fixtures in scope, then:
static (`Built::check` and the `lint/` rules, in process); render with `--render` (one harness run for all screens in
scope, at 390×844); explore with `--explore`; judge (ignores, baseline, scope). It prints text, or one `Outcome` as
JSON, or SARIF 2.1.0. Exit 0 clean, 1 a new error, 2 a broken setup. `--shot` draws PNGs at 390 and 1440 through the
same plan with no checks and no verdict, with no server. The command holds no rule: it reads files, runs `git`,
starts the harness and the answerer, and reads the clock for `--minutes`.

**4. The harnesses take a plan and report what they see.** `blocks-shot --plan <file>` and `blocks-snap --plan <file>`
draw every run of the plan in one process (one WebKit launch), run the probes and write `seen.json`. On the web a
probe is one file in `web/shot/probe/`, found by reading the folder. `--check` stays for one screen and prints the
same `Seen`s as lines, so there is one implementation of each check. SwiftUI v1 reports the four tree rules it can
measure today; clipped text, tap targets and contrast are HTML only until a later slice.

**5. The ratchet.** A finding is known by `(rule, fixture, at)`, where `at` is the block's path by kind and id
(`screen#queue/list#rows/row#12`), never a line or an index, so moving a block does not make it new. In a PR
(`--base`), scope is the fixtures the branch changed; `--render` widens it to every fixture when the app's CSS,
scripts or `inputs` changed. In scope, a new error fails; so does a baseline entry that is no longer found
(`guard/baseline-stale`: run `--tighten`) and an ignore that matches nothing (`guard/unused-ignore`). Against base, a
baseline may gain an entry only for a rule newer than the `guard` version that file recorded, so a pin move that
brings a rule does not break the app and nothing else can grow (`guard/baseline-grew`). Out of scope nothing fails a
PR; the nightly sweep runs with everything in scope.

**6. Explore, nightly only.** `guard::explore` walks a screen on the crate's own model: from a seed it picks a
declared step (tap a block that sends an action or sets state, type a pool string into a field), applies it with
`behave` and `patch::apply`, asks the app's answerer for the `Answer` (or answers with nothing when the app has
none), and lints each state. The steps are the existing `Step` list, answers included, so one harness run replays
them and probes after each. Default properties: every action answered (`explore/unanswered`), no error screen
(`explore/error-screen`), the renderer sends what the screen declares (`explore/sent-differs`), and after each step
no overflow, the fallbacks drawn and no console error (the `render/` rules). A failure is shrunk by dropping steps
while the same rule fires at the same block, at most 40 replays, and written as `steps.json` with its replay line.
The walk is boxed by steps (30 a walk) and `--minutes` stops new walks from starting; it never cuts one.

**7. Escape hatches are linted, not exempt.**

| Hatch | Static | At 390 |
|---|---|---|
| app CSS (`css` in `guard.json`) | `css/private-selector` (a `.b-` class that is no generated hook), `css/fixed-width`, `css/motion`, `css/raw-colour` (a colour that is no scheme token), run by the HTML harness on the files | loaded after `blocks.css`, so every `render/` rule sees its effect |
| an island | every `lint/` rule on its fallback; `lint/island-unsized` | `scripts` in `guard.json` defines the element, so the real component is probed in its box (light DOM and open shadow roots); with no script its fallback is |
| an app block | every `lint/` rule on its fallback and its child blocks; its own fields are opaque | `scripts` registers its renderer on `window.blocksApps`; with none its fallback is drawn and probed. SwiftUI: the app's own bin calls `BlocksSnapshot`'s plan runner with its views |

A raw-UI ban (no hand-built DOM or views outside app blocks and islands) is each app's own `[[ban]]`, by owner
decision; `docs/guard.md` gives the lines to copy.

**8. The skill is generated.** `just gen` writes `skill/blocks/`: `SKILL.md`, `kinds/<kind>.md` (fields and the
constructor from the schema, hooks, the kind's fixture and the tree it draws), `rules.md` (the rule table),
`examples/` (each `fixtures/guard/ok/` screen; codegen refuses one with a finding). It is listed under `generated`,
so a hand edit fails arch-check. `blocks skill --to <dir>` writes the same files from the binary and adds the app's
own passing fixtures as examples. Prose that cannot be generated lives in `docs/guard.md`, which `SKILL.md` links.

**9. The rule table, the probes and codegen are folders.** New rules, probes and generators are the files PRs will
add most, and `codegen.rs` (902 of 1,000 lines, 15 PRs in 14 days) and `shot.ts` (8 PRs) are hot already. So:
`codegen.rs` becomes `codegen/` with one file per output before anything is added to it; a rule is one file in
`guard/rules/` and `just gen` writes `guard/rules/mod.rs` from the folder; a probe is one file in `web/shot/probe/`.

**10. A new kind is five files.** Today a kind edits six shared files (`kind/mod.rs`, `kind/sample.rs`,
`site/views.rs`, `render/index.ts`, `blocks.css`, `BlocksUI/Blocks.swift`), four of them hot. Slice G8 moves each
kind's part into its own file and lets `just gen` write the lists (`kind/core/mod.rs`, `site/core/mod.rs`,
`web/src/gen/renderers.ts`, `BlocksUI/Gen/Kinds.swift`; `web/dist/blocks.css` from `web/src/css/*.css`). Then
`blocks new kind <name>` copies five templates and runs nothing else.

## Rule list v1

Limits come from the 26 golden screens (their largest value in brackets). `fix` is the text a finding carries.

| Id | Severity | Fires when | Fix |
|---|---|---|---|
| `lint/fault` | error | `Built::check` returns a fault | Build the block with its typed constructor; `Built::check` must return nothing. |
| `lint/primary-twice` | error | two `primary` buttons among one block's children, or one at the top of a screen that has `done` | Keep one primary action in a group; make the others `plain`. |
| `lint/destructive-unconfirmed` | error | a `destructive` button or act sends an action with no `confirm` | Add a `confirm` whose title names what is lost. |
| `lint/empty-state` | error | a `list` with no rows or a `section` with no blocks, and no visible `text`, `prose`, `hero` or `card` beside it | Add a `text` beside it that says what will appear here. |
| `lint/label-empty` | error | a blank button, act, chip, option or field label, or row title | Give it a label of one to three words. |
| `lint/label-twice` | error | two buttons or acts in one group with one label and different actions | Rename one so that each says what it does. |
| `lint/title-long` | error | a `title`, `header` or `question` over 60 characters (51) | Shorten it to 60 characters or fewer; move the detail to `subtitle` or to a `text` block. |
| `lint/label-long` | error | a button, act or chip label over 30 characters (27), a badge over 20 | Shorten it to a verb and its object; move the rest to a `confirm` or a `text` block. |
| `lint/buttons-many` | error | more than 3 buttons in one group | Keep up to three; move the rest into a `menu`. |
| `lint/depth` | error | blocks nested deeper than 6 (5) | Flatten it: open the inner part as a sheet or a screen of its own with `tap.open`. |
| `lint/level-blocks` | warn | more than 12 blocks in one level, rows not counted (9) | Group them into sections, or split the screen. |
| `lint/actions-many` | warn | more than 12 actions on a screen, the rows' own not counted (7) | Move the rare actions into a `menu` or a sheet. |
| `lint/untitled` | warn | a screen with no `title` | Give the screen a title of one to three words. |
| `lint/action-no-id` | warn | a block that sends an action has no `id` | Give the block an `id`; tests, the harness and explore find it by id. |
| `lint/island-unsized` | warn | an island with no `size` | Reserve its box with `size`, so the page does not jump when it loads. |
| `lint/text-wall` | warn | a `text` block's markdown over 600 characters | Use `prose`, or split it under section headers. |
| `render/tree` | error | the drawn tree is not the one the crate expects: a block missing, or a fallback where a view was expected | Register the kind's view, or send a kind this renderer draws. |
| `render/no-size` | error | a drawn block has no width or no height | Give the block content, or hide it with `show`. |
| `render/overflow` | error | a block leaves the 390 px width, or the page scrolls sideways | Let the block wrap: remove the fixed width or the unbroken text that holds it open. |
| `render/overlap` | error | two sibling blocks cover each other | Remove the app rule that positions the block; let the layout place it. |
| `render/clipped-text` | error | text is cut by its box with no ellipsis | Let the text wrap, or shorten it. |
| `render/tap-target` | error | a control under 44 by 44 px; a link inside running text is exempt | Give the control at least 44 px each way: use the kind's own button, or drop the app rule that shrinks it. |
| `render/contrast` | error | text under 4.5:1 against what is drawn behind it (3:1 from 24 px, or 18.66 px bold); text over an image is skipped and counted | Use a token pair the scheme gate passes: `--fg` on `--bg`, or a tone's own pair. |
| `render/no-name` | error | an actionable element or image with no accessible name (after #91) | Give it a label, or an `alt` for an image. |
| `render/console` | error | a console error or an uncaught exception | Fix the script error; the message is in the finding. |
| `render/truncated` | warn | a title or label ends in an ellipsis | Shorten it, or let it take two lines. |
| `render/frame-budget` | warn | first paint over 300 ms, or a frame over 16.7 ms | Draw fewer blocks at first: page the list, or fold the rest. |
| `render/dropped` | warn | an island sent an event its `events` does not name | Name the event in the island's `events`, or stop sending it. |
| `css/private-selector` | error | an app selector names a `.b-` class that is no generated hook | Style a hook from the renderer contract (`.b-<kind>`, `.b-<kind>__<part>`, `[data-variant]`, `[data-tone]`). |
| `css/fixed-width` | error | a `width` or `min-width` over 390 px | Use `max-width`, or a width in `%`. |
| `css/motion` | error | a transition or keyframe of anything but `transform` and `opacity` | Animate `transform` or `opacity` only. |
| `css/raw-colour` | error | an app colour property set to anything but a scheme token (`var(--fg)`, `var(--card)`, …), `currentColor`, `transparent` or `inherit` | Use the scheme token for that role, or add the colour to the app's scheme so the gate checks it. |
| `explore/unanswered` | error | the answerer gave no answer to an action the screen declares | Handle the action in the app, or remove the control. |
| `explore/error-screen` | error | an answer is an error, its ops do not apply, or the screen they give has a fault | Answer with ops that apply to the screen as it is; `Built::check` the result. |
| `explore/sent-differs` | error | the renderer sent other actions than the screen declares for the step | Send the action from the block that declares it; an app view posts through the `act` it is handed. |
| `explore/unstable` | error | the answerer gave another answer to the same walk | Make the answerer a function of its seed and the actions so far. |
| `guard/baseline-grew` | error | a baseline gained an entry for a rule older than the file | Fix the finding, or add an ignore with a reason. |
| `guard/baseline-stale` | error | a baseline entry is no longer found | Run `blocks check --tighten`. |
| `guard/unused-ignore` | error | an ignore matches no finding | Delete the ignore. |
| `guard/seed-missing` | warn | a screen with a list has no `empty` fixture, or no `long` one | Add the fixture from the app's fixture writer. |

`render/frame-budget` is a warning on purpose: shared CI runners are noisy, and a finding that flickers cannot be
ratcheted. An app's hard perf gate keeps reading `report.json`'s timings, as today.

## The CI cost per PR

| When | What runs | Where | Cost |
|---|---|---|---|
| every PR | static lint and the ratchet on the changed fixtures | a step in the app's existing Rust job | seconds. `blocks-cli` builds once per pin move (serde only, cached with the app); the run is under 1 s. Gate here: `perf.rs` holds the lint of all 42 goldens under 50 ms |
| a PR on the app's UI paths | `--render`: the changed screens at 390; every screen when CSS, scripts or the lock moved | `guard.yml`, a `paths:` filter, ubuntu | estimated 60 to 90 s, of which about 45 s is setup (Node, `npm ci`, WebKit from a cache); one WebKit launch, about half a second a screen. For scale: this repo's whole `web` job (27 launches, tsc, every node test) has a median of 102 s |
| the same, for SwiftUI | `blocks-snap --plan` | a macOS runner | estimated 90 to 150 s at ten times the minute price (this repo's `swift` job: median 92 s). Open question 2 |
| a PR on no UI path | nothing beyond the static step | | 0 |
| nightly | every screen, static and at 390; then seeded walks | `guard.yml`, `schedule`, ubuntu | at most 15 min a night per app: `--minutes 10` plus setup |

In this repo: one static step in `ci` (about 1 s) and a nightly `guard.yml`; no new job on PRs.

## Consequences

- An app adopts in one PR: the tool bin, `guard.json`, its fixture writer, `--tighten`. From then on a lane cannot add
  a finding to a screen it touches, and the count per screen only falls.
- A rule added here reaches an app with its next pin move and never breaks that PR; the nightly sweep shows the new
  findings, and one `--tighten` may record them.
- The guard sees a screen only through its fixtures. A state no seed builds is not checked, and explore reaches
  only what its answerer answers. `guard/seed-missing` and the skill push toward `empty` and `long`.
- The limits (60, 30, 12, 6, 3) are fixed in the rule files, with no setting per app: an ignore with a reason is the
  one way out. If an app needs many ignores for one rule, the limit is wrong and changes here, with a `since` bump.
- Contrast in place is checked in the light scheme only; the dark scheme stays the token gate's (`theme::gate`).
- `crates/blocks-cli` is the first crate here allowed to start a process, read a clock and write files outside
  codegen. The library stays pure; the bans get an `except` for that one folder, and the rules line says so.
- `docs/deps.md` gains one line, `blocks`: the CLI's path dependency on this repo's own crate, which the deps gate
  reads like any other. No external dependency is added: flags are parsed by hand and the config is JSON.
- The schema gains `Seen`, `Plan`, `Finding` and `Outcome`. They are additive, so `SCHEMA_VERSION` stays.
- `--check`'s messages on stderr change wording once (they become `Seen`s); `.drover/verify.md` reads only its exit code.
- Rust builder source in the skill's examples waits for G8, when each kind's sample sits in the kind's own file.
  Until then a kind's page shows its constructor line and its JSON.

## Open questions, decided (q2269)

1. **The cap.** The kit is about +2,360 counted lines (`slices.md`). Decided: one raise to 19,000, filed by the
   orchestrator before G2.
2. **cooee's SwiftUI render.** Decided: static on PRs and the SwiftUI render nightly first; it moves onto UI-path PRs
   once its real time is measured.
3. **G8, the kind folders.** Decided: queued with this kit, last (after G7), then G9.
4. **`render/no-name`.** Added to rule list v1 once #91 lands (q2269): its row is in the table above, built in the
   first slice after #91 merges that has the probes (G4, or a follow-up if G4 merged first).

## `.drover/rules.md` lines, by slice

- G2: `don't add a guard rule without its fix text and a fixture that fails it (enforced by: CI test, the rule table test in crates/blocks/tests/guard.rs)`
- G3: the "start a process, read a clock or write a file outside codegen" line becomes "outside codegen and `crates/blocks-cli`".
- G5: README.md gains the one-line agent prompt (q2270) next to the usage skill and `blocks check`: start a screen
  with the skill `skill/blocks/`, from an example screen in `skill/blocks/examples/`, and check it headlessly with
  `blocks check --shot`. It lands in G5, the first slice where all three exist.
- G5: `don't hand-edit skill/: rerun `just gen`; prose goes in docs/guard.md (enforced by: CI arch-check, `generated`)`

## `.drover/arch.toml` lines, by slice

G1, the codegen folder (edits to two existing entries):

```toml
[[ban]]
pattern = "std::fs"
except = ["crates/blocks/src/codegen/**"]

[[layer]]
name = "codegen"
paths = ["crates/blocks/src/codegen/**", "crates/blocks/src/bin/**"]
```

G2, the lint (the `generated` list gains the path below; the codegen layer's `may_use` gains `"guard"`):

```toml
"crates/blocks/src/guard/rules/mod.rs",

[[collect]]
dir = "crates/blocks/src/guard/rules"
glob = "*.rs"

[[layer]]
name = "guard"
paths = ["crates/blocks/src/guard/**"]
mods = ["crate::guard", "blocks::guard"]
may_use = ["expr", "kind", "built", "behave", "tree", "wire", "patch"]
```

G3, the command (the `std::process`, `std::fs`, `Instant::now` and `SystemTime::now` bans each gain the `except`):

```toml
except = ["crates/blocks-cli/src/**"]

[[layer]]
name = "cli"
paths = ["crates/blocks-cli/src/**"]
mods = ["blocks_cli"]
may_use = ["guard", "kind", "built", "tree", "wire"]
```

G4, the probes, and G5, the skill (two more paths in the `generated` list):

```toml
[[collect]]
dir = "web/shot/probe"
glob = "*.ts"

"skill/blocks/**",
"crates/blocks-cli/src/gen/skill.rs",
```

G8, the kind folders (four more paths in the `generated` list; `web/src/blocks.css` and the lists in `kind/mod.rs`,
`render/index.ts` and `BlocksUI/Blocks.swift` are deleted in the same PR, so there is no old list left to freeze):

```toml
"crates/blocks/src/kind/core/mod.rs",
"crates/blocks/src/site/core/mod.rs",
"web/src/gen/renderers.ts",
"swift/Sources/BlocksUI/Gen/Kinds.swift",

[[collect]]
dir = "crates/blocks/src/kind/core"
glob = "*.rs"

[[collect]]
dir = "crates/blocks/src/site/core"
glob = "*.rs"

[[collect]]
dir = "web/src/css"
glob = "*.css"

[[collect]]
dir = "swift/Sources/BlocksUI/Kinds"
glob = "*.swift"
```

`generate = "just gen"` is unchanged: it writes all of them.
