# ADR: style hooks: 14 named finishes, not a hook on every part (#392)

## Summary

Decision: no per-part map as shadcn has it: that needs one style language, and blocks draws with CSS, SwiftUI and
egui. Instead 14 named finishes (surface, tint, button, mark and the ten labels): a kind tags a part with one, and a
style value is written against finishes only, never a renderer's private names. style.json does not change.
Slices: five: finishes and one file per axis in the crate; the web tags; the SwiftUI finish folder and its ban; the
guard; then the look gaps the new check lists. About 250 counted lines.
Open questions, answered by the owner (2026-11-24): an app's CSS may style `.as-<finish>` from the start; S5 closes the
gaps found, each S5 issue naming every baseline line as close or keep for the owner's yes.

Status: approved by the owner (2026-11-24). Slices filed: S1 #398, S2 #399, S3 #400, S4 #401; S5 once S2 and S3
have written the baseline. `README.md` has the tables; this page has the reasons.

## Question

Should every part of every kind get a stable, named style hook that a look file maps, in the HTML, React and
SwiftUI renderers, so that a look is data and not renderer code? Or are the tokens and the Style axes enough?

## Where it stands

- **A look is data already.** It is a scheme pair (19 colour tokens each) and a style.json (12 keys: closed
  lists of values, numbers and the label decorations). `theme::css` turns both into CSS; SwiftUI reads them as
  the `Look` in the environment.
- **The web needs no renderer code for a new value.** The live HTML, the static site and React write one markup,
  held equal by `fixtures/html`, and share one `blocks.css`. #376 (filled buttons) touched no file of any of them.
- **SwiftUI needs a little.** #376 changed 12 lines in two Swift files, both helpers. But 10 reads of a style value
  sit inside five kind files (`Row`, `Card`, `Choice`, `Diagram`, `BlockRounds`), outside any helper.
- **A value lands on names nobody owns.** On the web, the crate's CSS selects private classes: `.spi.done .spm`,
  `.sec>.sh`, and the tile list `.card,.st,.list>.row,…`, which is written in `tiles.css` and again in `style.rs`.
  A kind that is a tile and is not in that list keeps the plain tile under every look. Steps is one:

  ```
  $ grep -o "[^}]*{border-style:dashed}" fixtures/css/default-terminal.css
  :is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl){border-style:dashed}
  $ grep -c "surface(look" swift/Sources/BlocksUI/Kind/Steps.swift
  1
  ```

- **Nothing says which renderer draws which value.** `sections: quiet` is read nowhere in SwiftUI. Of the ten
  label roles the web decorates six, SwiftUI five, and three (`group`, `back`, `said`) neither. `fills: solid`
  writes no web rule. Some of this is meant (glass is SwiftUI's own); none of it is written down or checked.
- **Apps have 6 public part names** (`title`, `subtitle`, `badge`, `value`, `figure`, `actions`) beside about 550
  private class names in `web/src/css/kind/`, and in SwiftUI a `BlockStyle` that wraps a block and cannot reach in.

## Options

| | Option | For | Against |
|---|---|---|---|
| A | Keep the tokens and the axes as they are | no work; a new value is cheap today | the tile list stays a hand-kept copy in the crate and goes stale with each new kind; a value that does nothing on one renderer stays silent |
| B | shadcn's way: a public hook on every part, a look file that maps each hook to declarations, renderers that carry structure only | any look without a crate change; one mechanism | see below |
| C | B on the web only; SwiftUI keeps the axes | cheap: CSS is the map | a look would exist on the web and not in SwiftUI; the measured look check, which holds both to one page, loses its meaning |
| D | A small closed set of finishes shared by all kinds; a kind tags its parts; the axes stay the look's data and are written against finishes only | removes the copied lists; 14 names, not 550; each renderer keeps its own idiom; checkable | a new style value still needs a crate change, as today |

Why not B:

1. **It needs one style language.** shadcn has one renderer and one language, so a hook can map to classes. blocks
   draws with CSS, SwiftUI and egui. A map all three can read is a new declaration language plus an interpreter in
   each native renderer, with pressed, picked, disabled, tone and nesting to cover: a styling engine.
2. **Every named part is a public part.** About 550 names would fall under the versioning rule. Today "anything not
   in the table is private and may change" (`renderers.md`), so a kind's PR is free to reshape its own markup.
3. **A free map escapes the gates.** The contrast gate checks a scheme against a closed list of fills, and the
   measured look check holds every look to facts it can name. Neither can judge free declarations.
4. **The need is not there.** Four style files exist. An app with its own look already styles the public hooks.

## Decision

D. Eight parts.

1. **A finish is a named way the look draws a part.** There are 14: `surface`, `tint`, `button`, `mark` and one
   `<role>-label` for each of the ten `LabelRole`s. They are one enum in the crate's `theme`, generated for TS
   and Swift. A finish is added only together with a style value that restyles it: none on speculation.

2. **A kind tags a part with its finish, in its own file.** Web: the class `as-<finish>` (`button` is the
   `button` and `a.btn` elements, as today). SwiftUI: the finish's helper (`.surface(look)`, `.chip`, `Mark`,
   `CardButton`, `LookText`). Which parts are tiles is then said by each kind, not by a list in the crate.

3. **A style value is rows against finishes.** Each value of `surface`, `fills`, `buttons`, `marks` and `sections`
   is a list of `Rule { on: Finish, at, put }`, and each label decoration lands on its label finish. The crate
   builds the selector from the finish, so a rule cannot name a private class. `tiles!`, `LabelRole::selector`
   and the word "done" in the crate's CSS are deleted; the mark's word comes from the part (`data-mark`).

4. **Each renderer maps a finish in one place.** Web: `web/src/css/look/<finish>.css` holds the finish's base
   look and `theme::css` adds the value's rows; React needs nothing of its own. SwiftUI:
   `swift/Sources/BlocksUI/Finish/<Finish>.swift` is the only code that reads the style value. The accessors
   `look.outline`, `.solid`, `.filled`, `.glass`, `.textMarks` and `.quiet` are deleted, so a kind has nothing to read.

5. **style.json and the tokens do not change.** No new format, no new key. `type`, `space`, `radius`, `motion` and
   `easing` restyle no part: they stay tokens. The public hooks (`b-<kind>`, `b-<kind>__<part>`, `data-variant`,
   `data-tone`, `BlockStyle`) stay as they are; the finish classes join them (open question 1).

6. **The move changes no pixel.** S1 keeps each finish on today's private selector, so the CSS it writes is byte
   for byte the same. S2 and S3 tag exactly the parts today's selectors and helpers reach. Each of their PR bodies
   carries the run: every `fixtures/blocks` file under every `fixtures/styles` file, drawn at the base and at the
   head, the PNGs equal. `fixtures/css` and `fixtures/html` regenerate, since selectors and classes change.

7. **Six checks, each with an enforcer.**

   | What must hold | Enforcer |
   |---|---|
   | a style rule names no private class | the type: `Rule` holds a `Finish`; `crates/blocks/tests/theme_finish.rs` reads `fixtures/css` |
   | an `as-` class is a real finish | `just gen` fails on an unknown one in the site's HTML; `web/lint.mjs` on one in `web/src/css` |
   | every renderer tags the same parts of a kind | the site's HTML gives `fixtures/look/worn.json` (generated); the live HTML and React by the same-markup tests; SwiftUI by `blocks-snap`'s report against that file |
   | a style value changes the parts it names, on each renderer | the measured look check's new fact, `look: <axis> <value> changes no <finish>`, with a forced defect, as its other facts have |
   | no kind reads a style value | `.drover/arch.toml` bans: `look.style` outside `Finish/`; `gen/schemes` in the web views |
   | an app's CSS names only real hooks | guard `css/private-selector`: `.as-` joins `.b-`, same rule id, its fixture gains a line |

   Where a renderer differs, the difference is one line in `ci/tokens/finishes.txt`, a baseline that only shrinks,
   checked as `ci/tokens/baseline.txt` is. The token lint itself does not change; its baseline shrinks as parts
   stop restating a finish's numbers.

8. **Gaps are closed after the move, not in it.** S2 and S3 write the first baseline: what differs today. S5 closes
   each line or keeps it with its reason written on the line (open question 2), and from then on a line with no
   reason fails. S5 also adds the ban that stops a kind's CSS restating the tile, which cannot land before steps
   and the others like it are tagged.

## Consequences

- A new tile-like kind gets every look by one class and one call; it edits no shared file, and no look forgets it.
- A kind may rename any private class: the look's CSS no longer names one.
- A look value that does nothing on a renderer is a listed line, and after S5 a line with its reason: never a surprise.
- A new style value is one axis file in the crate and one finish file in Swift. It still needs a crate release:
  an app cannot invent a look blocks has no value for. That stays the trade: a look every renderer can draw.
- The markup grows by one class on each tagged part: two on each row of a list. The perf and soak gates decide; if
  the 200-row page moves, the prefix gets shorter.
- Each harness draws about 17 more small pictures for the new fact (7 values, 10 label roles), one size, one scheme.
- The desktop renderer reads only the labels today and draws one look. It is left out: its own look issue (#299's
  follow-up) adds its finish file and its lines. Until then it has no lines in the baseline and no check.
- Revisit B when a look needs a difference no finish can carry on two renderers; no style file does today.

## Open questions

Both answered yes by the owner (2026-11-24).

1. **May an app's CSS style `.as-<finish>` from the start?** Recommended: yes. They are 14 names, they are in the
   markup anyway, and without them an app that wants a shadow on every tile selects `.card,.st,…`, which the guard
   does not catch. It puts 14 names under the versioning rule. If no: the guard flags every `.as-` class.
2. **Close the gaps (S5), or record them as meant?** Recommended: close what reading found (the dashed and solid
   surface on web steps; `sections: quiet` and the `title` label in SwiftUI; the `kind` label on the web). Each is
   a visible change to a look that is not the default, with a `For apps` line. The check will list more than
   reading did: S5's issues name every line as close or keep, for your yes, before a lane starts.

## Hot files

- `crates/blocks/src/theme/style.rs`: every style PR edits it (six so far). Its axes become
  `crates/blocks/src/theme/axis/<axis>.rs`, one file each, collected; `theme/axis/mod.rs` is generated from the
  folder by `sh scripts/arch-gen.sh`, as `kind/core/mod.rs` is, and holds the one list of axes that `css.rs` and
  `codegen/theme.rs` read in place of their own. `style.rs` keeps the `Style` struct and its value types.
- `swift/Sources/BlocksUI/Look+Style.swift` (`shared` today): its helpers become
  `swift/Sources/BlocksUI/Finish/<Finish>.swift`, one file each, collected. What stays is the type and size tokens.
- `web/src/css/look/tiles.css`: its list becomes `web/src/css/look/surface.css`, inside the collected `web/src/css`.
- No new shared list: `worn.json` is generated, and the gap baseline is deleted from, never added to.

## The `.drover/arch.toml` lines

S1, with the axis folder. `.drover/arch-baseline.txt`'s `arch.toml` line rises by what each slice adds.

```toml
generated = ["crates/blocks/src/theme/axis/mod.rs"]   # appended to the list
shared = ["crates/blocks/src/theme/style.rs"]          # appended to the list

[[collect]]
dir = "crates/blocks/src/theme/axis"
glob = "*.rs"

[[size]]
paths = ["crates/blocks/src/theme/style.rs"]
max_file_lines = 160
```

S2, with the web tags:

```toml
generated = ["fixtures/look/worn.json"]                # appended to the list

[[ban]]
pattern = "gen/schemes"
paths = ["web/src/render/**", "web/react/src/**"]
reason = "a view tags a part with its finish; only core/look.ts knows what a look does to it"
```

S3, with the Swift folder:

```toml
[[collect]]
dir = "swift/Sources/BlocksUI/Finish"
glob = "*.swift"

[[ban]]
pattern = "look.style"
paths = ["swift/Sources/BlocksUI/**"]
except = ["swift/Sources/BlocksUI/Finish/**"]
reason = "a kind tags a part with its finish; only Finish/ reads a style value"
```

S5, once every tile is tagged:

```toml
[[ban]]
pattern = "background:var(--card);border:1px solid var(--edge);border-radius:var(--radius)"
paths = ["web/src/css/kind/**"]
reason = "a tile is the surface finish: tag the part as-surface"
```
