# ADR: glance: a head and five optional forms in one leaf kind (#412)

## Summary

Decision: a new core kind, `glance`. It has a head every form draws from (title, subtitle, figure, value, tone, tap)
and five optional forms: `leading` and `trailing` replace a side; `expanded`, `small` and `medium` add text, two rows,
a foot and buttons. Only `title` is required. BlocksUI draws a form into the box a host hands it and owns no window.
Slices: three, in this issue's one PR: the kind in the crate; the forms in BlocksUI with their snapshot gate; the doc.
Open questions: (1) cooee also draws a large and two Lock Screen widgets: add those forms later (recommended)?
(2) no design lane, since the layouts follow cooee's shipped surfaces (recommended)?

Status: proposed. `README.md` has the tables; this page has the reasons.

## Question

What does a server send so that the iOS Dynamic Island, a Mac notch island and the home-screen widgets all draw
from one screen through BlocksUI, in place of Swift written by hand in each app? Its wire shape, its name, which
forms it must declare, what a missing form draws, and how a host hands a form to each system.

## Where it stands

- **The surfaces are app code.** cooee draws them in `SurfaceIsland.swift` (66 lines) and `SurfaceWidgets.swift`
  (144 lines), over its own types (`SurfaceActivity`, `SurfaceGlance`). No block reaches them.
- **The systems keep a picture, not a view.** WidgetKit and ActivityKit run the view once in an extension and
  archive what it drew. Nothing in it may hold state, call a closure, scroll or take text; a tap leaves as a link
  or as an app intent; a clock is a text the system ticks. An activity's state is at most 4 KB.
- **BlocksUI's kinds do not fit there.** A row keeps its open rounds in `@State`, taps through `ActButton`'s
  closure, redraws ages with a `TimelineView` and is 44 pt high; an island's side is 24.

  ```
  $ grep -lE '@State|ActButton|RelativeValue|TimelineView|\.surface\(|ScrollView|TextField' \
      swift/Sources/BlocksUI/Kind/*.swift | wc -l
  38
  $ ls swift/Sources/BlocksUI/Kind/*.swift | wc -l
  45
  ```

- **Two names are taken.** `island` is the client component an app hosts. `layout::SizeClass::Compact` is the
  iPhone width, one of the two a `layout.json` places a node for.
- **A core kind need not be drawn in full everywhere.** SwiftUI draws `sidebar` as its fallback row today; the
  desktop renderer draws four kinds through `fallback::draw`.

## Options

| | Option | For | Against |
|---|---|---|---|
| A | A placement: ordinary blocks marked with the form they show in (as `side` marks a section, #380), or a third size class in `layout` | no new vocabulary; the web could draw them | every allowed kind needs a second, stateless drawing, so nothing is reused but the names; a `form`, a table or a composer on a side is a state that can be built and cannot be drawn; five child lists change the walk (`LISTS`, `hosts`) in patch, diff and mirror in three languages; nothing bounds the 4 KB |
| B | A leaf kind: a head, and each form a small closed shape | content that cannot be drawn cannot be built; a change is a `merge`, as on a stat, so the protocol does not move; the block is the activity's state as it is | four small types to learn; a form cannot hold an arbitrary block |
| C | B with no form fields: content once, the renderer picks what each form shows | the smallest wire | small and medium often show different things (a count, then rows): the picking becomes rules a server cannot steer. The owner's decision is that the block declares its forms |
| D | An app kind in each app | no change here | it is today: hand-written Swift per app that drifts from the screens |

## Decision

B, with C's head so that nothing is said twice. Nine parts.

1. **The kind is `glance`.** The issue's "compact size class" is not a size class: `SizeClass` is a window's
   width and decides where a layout places a node, while a form is picked by the surface the system hands the
   app. `layout.rs` does not change. `surface` is the look's axis and finish, and `widget` leaves out the island.

2. **A head, then five optional forms.** The head is `title`, `subtitle`, `figure`, `value`, `tone` and `tap`: what
   the thing is, said once. `leading` and `trailing` are a `GlanceSide` (a figure, a short text, a tone) and
   replace what the head would put on that side. `expanded`, `small` and `medium` are a `GlanceBody` (`line`,
   `rows`, `foot`, `acts`) drawn under the head. The block holds no child block (`shapes.md`).

3. **Only `title` is required; a missing form is drawn from the head and a sibling.** `leading`: the head's
   figure, else a mark in its tone. `trailing`: the head's value in its tone, else nothing. `expanded` and
   `medium`: the head with the other's body. `small`: the head with `medium`'s body, else `expanded`'s. With no
   body at all a roomy form is the head alone. So a block of a title and a value already draws all five, and a
   server adds a form only where it wants that form to differ.

4. **Each form has a fixed layout and a budget.** Two rows, a two-line `line` (drawn only with no rows), a
   one-line foot; two acts when expanded, one in medium, none in small. What is over the budget is not drawn:
   a form never scrolls, shrinks its type or grows past its box. The layouts follow cooee's shipped surfaces.

5. **A form holds no state, no clock and no closure.** A `Time` value is the system's timer text
   (`Text(timerInterval:)`), counting up from `since` or down to `until`, on every surface. A row's or an act's
   `tap` is a `Link` when the host gives it a URL; an act's `action` is a `Button(intent:)` when the host gives it
   an intent; an act with neither is not drawn, and `confirm` is not asked (there is no dialog there; an intent
   may ask its own). The host says both once: `.glanceTaps(link:intent:)`. A link and an intent also work inside
   the app, so the notch window uses the same path as the extension and there is one path to test.

6. **A form draws on the look and draws no ground.** Type, tones and the pill come from the scheme and the style
   through the finishes of #392 (`button`, `tint`, `mark`, the section label); sizes are named constants in
   `Glance/GlanceScale.swift`. The island, the widget's container and the notch panel are the tile, so a form
   calls no `surface`. The island is black: there the host hands the dark scheme. The Lock Screen and the widgets
   follow the system's.

7. **BlocksUI draws; the host owns the systems.** BlocksUI imports neither ActivityKit nor WidgetKit, and opens no
   window: a widget's kind, an App Group, an intent and a panel's place are the app's. It gains one import,
   AppIntents (a system framework, in one file), so that an act's button is drawn by BlocksUI and not by each
   host. The hand-off is the block itself:

   | Surface | The host | Form |
   |---|---|---|
   | Dynamic Island, compact | `ActivityAttributes` with `ContentState = Glance` | `leading`, `trailing` |
   | Dynamic Island, minimal | the same | `leading` |
   | Dynamic Island, expanded; the Lock Screen and the banner | the same | `expanded` |
   | home-screen widget | a provider that decodes the screen from the App Group | `small`, `medium` |
   | Mac notch window | its own panel, its own open and closed | `leading` and `trailing`; `expanded` |
   | a screen in `BlocksView` | nothing | `medium`, on a tile |

   The server may also push the block's JSON as an activity's `content-state`: it decodes as `Glance`.

8. **Only SwiftUI draws the forms.** The web, the static site, React and the desktop draw the block as its
   fallback row (title, subtitle, tap), which `Built::of` writes as for any kind. The drawn trees still agree:
   one `glance` node, role `status`, named by its title, no children.

9. **Six checks, each with an enforcer.**

   | What must hold | Enforcer |
   |---|---|
   | a glance holds no block, and a form no content it cannot draw | the types; `Built::check`'s shape fault, as for any kind |
   | a form holds no state, clock, closure or ground | `.drover/arch.toml` bans on `BlocksUI/Glance/**` (below) |
   | BlocksUI links no ActivityKit or WidgetKit | two bans on `swift/Sources/**` |
   | every form of every glance fixture, and of its long-text, no-row and 200-row variants, draws inside its box, light and dark | gate `swift-glance` (`blocks-snap --form`); `Render/GlanceTests.swift` |
   | the fallback table of part 3 | a table test on `Glance.drawn(_:)`, which is Foundation only |
   | a block fits an activity's state | guard `glance/heavy`: its JSON is over 3,000 bytes; with its fix text and failing fixture |

   The role and name rule, the token lint and the stress table apply as to any kind.

## Consequences

- An app's island and widgets become data: a change to them is a change to the screen the server builds.
- cooee can drop `SurfaceIsland.swift` and the two small widgets of `SurfaceWidgets.swift`. Its large widget and its
  Lock Screen widgets have no form here (open question 1).
- An additive change: `SCHEMA_VERSION` stays 2. A client one release behind draws the fallback row.
- The 4 KB limit is the server's to keep. The shape is small, and the guard says so before a push fails silently.
- The docs site's page for the kind shows a row, not the forms, until a web drawing is asked for. The fallback
  rule then gets a Rust home and a cross-language fixture, as `Plot::drawn` has; today it has one reader, in Swift.
- A form's layout is fixed. An app that wants another layout writes its own view over `Glance`, as it could for
  any kind; it cannot restyle a form but through the look.
- BlocksUI's public surface grows by `GlanceView`, `GlanceForm`, `glanceTaps` and the `glanceForm` environment
  entry, which an app's own figure view reads for its size.
- A later form (`large`, the Lock Screen's, the watch's Smart Stack) is one more optional field and one more row
  in the fallback table. A client that does not know it ignores it.

## Open questions

1. **cooee's other widgets.** `SurfaceWidgets.swift` also draws a large widget (two groups of three rows), a
   circular and a rectangular Lock Screen widget and an inline text. The issue names small and medium.
   Recommended: ship the five now; cooee's move issue adds `large` and the Lock Screen forms as optional fields
   when it needs them, and keeps those views until then. If no: this issue grows by three forms and their boxes.
2. **A design lane.** The issue is not queued `--design`. Recommended: none. The five layouts follow surfaces the
   owner has already shipped in cooee, and the PR shows the ten PNGs. If yes: SwiftUI previews of the five forms,
   light and dark, before S2.

## Hot files

Every file this issue adds is its own, in a folder that is collected already or by the lines below:
`kind/core/glance.rs`, `guard/rules/glance_heavy.rs`, `site/kind/glance.rs`, `web/src/render/kind/glance.ts`,
`BlocksUI/Kind/Glance.swift`, the new `BlocksUI/Glance/` folder, `Blocks/Kind/Glance+Rules.swift`,
`BlocksSnapshot/Form.swift`, `Render/GlanceTests.swift`, `.gatekeeper/gates/swift-glance.toml`, `docs/glance.md`.
It adds nothing to `Snapshot.swift` or `Look+Style.swift`, which are shared and near their limits.

A new kind still adds one line to five lists that many PRs edit (PRs in the last 14 days): the count of fixtures in
`web/test/site.test.ts` (25), `tree.test.ts` (24), `pages/showcase.test.ts` (22), `built.test.ts` (17) and
`hooks.test.ts` (13); `site/src/kinds.rs` (24); `tree.rs`'s roles (19); `fixtures/stress/table.json` (16);
`site/src/play.rs` (8). This issue adds its line to each and converts none: the cure is the same for every kind (a
kind's role, blurb and stress row beside its type, the count read from the generated list), and it belongs to the
week's hotspots issue, not to one kind's PR.

## The `.drover/arch.toml` lines

S2 adds them with the folder. `.drover/arch-baseline.txt`'s `arch.toml` line rises by what they add.

```toml
[[collect]]
dir = "swift/Sources/BlocksUI/Glance"
glob = "*.swift"

[[ban]]
pattern = "import WidgetKit"
paths = ["swift/Sources/**"]
reason = "the widget is the host's: BlocksUI draws a glance form into the box it is handed"

[[ban]]
pattern = "import ActivityKit"
paths = ["swift/Sources/**"]
reason = "the activity is the host's: its content state is the Glance block"

[[ban]]
pattern = "@State"
paths = ["swift/Sources/BlocksUI/Glance/**"]
reason = "the system archives a glance form: it holds no state"

[[ban]]
pattern = "TimelineView"
paths = ["swift/Sources/BlocksUI/Glance/**"]
reason = "a glance form reads no clock: a time is the system's timer text"

[[ban]]
pattern = "ActButton"
paths = ["swift/Sources/BlocksUI/Glance/**"]
reason = "a glance's tap leaves as a link or an intent the host maps, never a closure"

[[ban]]
pattern = ".surface("
paths = ["swift/Sources/BlocksUI/Glance/**"]
reason = "a glance form draws no ground: the island, the widget or the notch panel is its tile"
```
