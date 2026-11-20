# ADR: a framework-neutral TS core, a React adapter and client-built screens (#81)

## Summary

Decision: blocks gets a TS core with no framework in it (typed builders, check, behaviours, tree tests, a scoped
stylesheet) and a React adapter that draws each kind as a real React component, held to the HTML renderer by a
same-markup test. Hosting the HTML renderer inside React was built and measured, then rejected. check is a TS port.
Slices: seven, about 1,400 counted lines: core entry, builders, check, scoped CSS, adapter frame, 9 kinds, 3 kinds.
Open questions, all answered yes by the owner (q2271); the cap stays at 19,000 (#120) with one more raise before R5.

## Question

The client app's repo (React 19, Vite, TanStack Router, about 1,300 app `.tsx` files) needs blocks as its UI vocabulary
without leaving React. How does a TS app with no Rust server build, check and draw a blocks screen, how does React
draw it, and what must any later adapter (Solid or another) provide?

## What exists, read from the code

- `web/src` mixes three things: pure logic (`tree.ts`, `gate.ts`, the evaluator half of `behave.ts`), the HTML
  renderer (`render/`, 1,293 lines), and Mode A's shell, stream and patcher. `tree.ts` imports the
  renderer only to list its native kinds.
- A TS caller has the generated types but no builders, no `Built`, no `check`: those are Rust only (`built.rs`).
- `blocks.css` owns the page: it styles `html`, `:root`, `button`, `a`, `input`, `p`, and classes as short as `.row`,
  `.list`, `.card`, `.m`. Inside another app it would put `[` and `]` around every button on the page.
- The HTML kinds carry drover's and cooee's habits: a form sends only when a field named `text` is filled, a text
  links `t12` refs on `thread-` screens, a section recolours headers that start with `waiting` or `blocked`.
- Node runs the tests by stripping types, and `web/lint.mjs` lints the same way. Neither reads `.tsx`.

## Options

### How React draws (q2253)

Both were built as a spike and run on the same screens in headless WebKit; `measured.md` has the method.

| | A. Host the HTML renderer in one element | B. Native React components per kind |
|---|---|---|
| Another copy of the kinds | none: 70 lines of adapter | one: about 1,300 lines for all 27 kinds, about 600 for the 13 Mode B needs |
| Same look | by construction | by test: 8 of the 10 blocks compared already gave identical markup; the other 2 are parts the spike left out |
| A new screen from the loader | everything is redrawn: the typed text and the focus are lost | React keeps both |
| Islands | portals into boxes a second, non-React patcher moves; state survives only with a box cache by id | children in the app's tree; state survives |
| Context (router, query, auth) | reaches islands through portals; app kinds need the same detour | simply there |
| Server rendering | an empty box | the full markup |
| App bundle, gzipped | 15.4 KB (all of the HTML renderer) | 4.4 KB for 10 kinds, about 7 KB for 13 |
| Mode A's habits | all imported: the client app's forms would never send | the adapter decides per kind |
| A Solid adapter later | about 70 lines again | another copy of the kinds it draws |

A third way, **C. one view description, two interpreters** (each kind returns a small element tree as data; the
DOM and React each interpret it), would give native elements with no second copy. It means rewriting the HTML
kinds that drover and cooee run, with their closures, drafts and listeners, before React draws one row.

To fix A's redraw, Mode B would need a TS port of `diff` plus the patcher, which is the op machinery q2229 says
Mode B does not use. A2UI's own React renderer took route A in its 0.13 release (it hosts shared web components):
it no longer server-renders, needs a host registry and portals to carry React context, and weighs 68 KB gzipped.

### The rest

| Question | Options | Chosen |
|---|---|---|
| `check()` for TS | the crate through wasm; a TS port | the port: #46 measured the wasm core at 264 KB gzipped, most of it the typed kinds' parsing, which is the part check needs |
| Builders' shape | Rust's `new(required).setter()` chain; positional arguments; one typed object | one typed object per kind: it is the JSON with `type` filled in, so the output stays plain data |
| The package | `@jirathip-dev/blocks-react` beside a core package; one package with paths | one package: a git pin installs a repo's root, npm cannot pin a subfolder |
| The stylesheet in an app | the page-wide file; a hand-kept second file; one source built twice | one source, built twice: page-wide for Mode A, scoped for Mode B |
| JSX | `.tsx`; plain `.ts` over `createElement` | plain `.ts`: the repo's type-stripping tests and lint work unchanged |

## Decision

1. **Two modes, named.** README's opening becomes: "blocks is an opinionated UI framework whose screens are data:
   typed blocks, checked, then drawn by a renderer. It has two modes. Mode A, server-driven (drover, cooee): a Rust
   server builds screens and sends row ops over the device stream. Mode B, client-built (a client-built app): TS builders in a
   route loader build the screen and the React adapter draws it, with no server and no stream; it uses the kinds,
   the generated types, the builders, check, `blocks.css` and the guard kit, and not shelf, mirror, the stream,
   wire versioning or site." The Intent bullet "Screens change by row ops" gains "in Mode A".

2. **A core with no framework and no DOM: `web/src/core/`.** It holds the builders and generated types, `built`,
   `check`, `actions`, `on`, the evaluator with `start` and `view`, `tree` and `expect`, `gate` and `gated`, the
   look's CSS, and `share`. The existing pure code moves in; nothing is rewritten, and there is one evaluator. The
   HTML renderer and every adapter import the core; the core imports neither. Bans in `arch.toml` hold it.

3. **Builders are generated: `web/src/gen/builders.ts`.** One function per kind, taking that kind's typed fields
   and returning the block; plus `expr.get`, `expr.all`, `expr.is` and the other ten for expressions. `built(screen)`
   writes each fallback as `Built::of` does and brands the result; only a `Built` goes into a view. Builders exist
   so `type` cannot be wrong, and so the guard kit (#79) can hold apps to them.

4. **`check()` is a TS port with the crate's rules**, all nine faults. The shape and extra-field faults read a
   generated table (`gen/shapes.ts`). The crate writes `fixtures/check/cases.json` (a screen, the app's kinds, the
   faults) and the TS test must give the same list; `Fault` becomes a generated type. `actions(screen)` lists every
   action a screen can send, for the route's test.

5. **React draws native components: `web/react/`, option B.** One file per kind in `web/react/src/kinds/`, in plain
   `.ts` with an `h(tag, classes, ...children)` shaped like the HTML renderer's, so a React kind reads side by side
   with its HTML twin. It imports `react` only: no `react-dom`, no router, no HTML renderer. The first cut draws the
   13 kinds client-built screens use (screen, sheet, section, list, row, card, form, button, chips, stat, text,
   images, and island in the frame); the other 14 draw their fallback, as SwiftUI's gaps do, and `fixtures/trees/react/` records
   which. Why B: the table above. The copy is the price, and part 9 is what keeps it honest.

6. **Same look, by one stylesheet and one test.** The build writes `blocks.scoped.css` from the one `blocks.css`:
   every rule inside `@scope (.b-view)`, ending at the children of a drawn island or app kind. Measured: a button in
   the view gets its brackets, a button beside the view and one inside an island do not. A look is a light and a
   dark scheme that passed `gated`; the view writes its tokens on its own root, so two views can wear two looks.

7. **Islands: #21's contract, mounted as children (q2222).** `islands={{ name: Component }}`. The component gets
   `props` and `emit(name, values)`. An event in the block's `events` leaves as an action with the island's id; any
   other is dropped and reported. The fallback row is drawn when no component has that name, while it suspends, and
   after it throws. The box takes the block's `size` and clips to it. No custom elements in React: one way.

8. **Actions and navigation go out through two callbacks; nothing is imported.** `onAction(action)` gets every
   action as the wire's `Action` and may return a promise: pending makes the sender busy, `false` or a rejection
   keeps the drafts. `onOpen(go)` gets `open`, `sheet` and `thread` taps. `url`, `copy` and `set` are the adapter's
   own. Confirm is drawn by the adapter from the action's data, and cancel means not sent, never an error.
   `on({...})` in the core maps action names to handlers and is exhaustive by type.

9. **The adapter contract** (`boundaries.md`): what any adapter provides (a view, the hooks, actions, behaviours
   from the core, islands, app kinds, a boot for the harness, its kinds folder) and the fixtures it passes: its
   trees through `blocks-shot --adapter`, the ids, the behave view, the island cases, and the same markup as the
   HTML renderer for every kind it draws natively. Only React is built now.

10. **From json-render and A2UI: nothing is depended on; seven things become blocks' own** (`measured.md` has each
    with what ran). In these slices: a block that throws draws its fallback and the rest of the screen stays (R5);
    cancel of a confirm resolves, never rejects (R5); one report callback for faults, dropped events and thrown
    blocks (R5); a block whose data did not change does not redraw, by `share` and memo (R2, R5); a failing check
    means the form cannot send, as a conformance case (R7). As their own issues, because they change the crate's
    check for Mode A too: every fault says where (`at`), and a URL that is not http, https, mailto or relative is a
    fault.

## Consequences

- A web kind is now written twice in TS (HTML, React), and a look change touches both. The same-markup test fails
  the PR that changes one alone. If a second adapter is ever wanted, option C is cheaper than a third copy: decide
  then, with this ADR's numbers.
- Mode A is untouched: `blocks.js` changes only by moved imports, `blocks.css` not at all.
- React can serve Mode A later with no new design: `apply` gives the next screen and the view draws it.
- The repo commits more built files (`core.js`, `react.js`, the scoped CSS, the types). They are generated, never
  hand-merged.
- An app's unlayered CSS can still reach into a view (an unlayered `button` rule beats any layer). The layer order
  in `usage.md` part 1 keeps a layered app clean; checking an app for it belongs to the guard kit (#79).
- An island that opens its own portal draws outside its box. CSS cannot stop that; the contract forbids it.
- Found on the way, not fixed here: the HTML form's `text`-only send, and `href` taking any URL scheme.

## Open questions (answered: q2271)

1. **Kinds.** The issue says one component per core kind. I chose 13 now and 14 as fallbacks (composer, scene,
   run, secret, config, choice, diagram, editor, web, diff, prose, hero, media, nav), filed as one later issue.
   Recommended: yes; no client-built screen needs them, and they are half the copy.
2. **Cap.** The seven slices add about 1,400 counted lines against 909 of headroom. Recommended: one raise to
   about 18,500 before R5, in one orchestrator-filed issue that also starts counting `web/react/`.
3. **Package name.** `@jirathip-dev/blocks` with the path `/react`, in place of the issue's
   `@jirathip-dev/blocks-react`. Recommended: yes; it is what a commit pin can install with npm, pnpm and bun alike.
4. **Dev tools.** `react` is approved. The harness also needs `react-dom`, and the typecheck needs `@types/react`
   and `@types/react-dom`: dev only, never in the shipped files. Recommended: approve the three with it.

## Hot files

| File | PRs in 14 days | Class | Becomes |
|---|---|---|---|
| `crates/blocks/src/codegen.rs` (902 of 1,000 lines) | 15 | a central file every generated output edits | the folder `crates/blocks/src/codegen/`: `mod.rs` (the parsed schema and `write`), then one file per target (`ts.rs`, `swift.rs`, `theme.rs`, `fixtures.rs`, and new `builders.rs`, `shapes.rs`). R2 converts it, moving code only |
| the adapter's list of kinds (new) | | a central list | never written by hand: `just gen` writes `web/react/src/gen/views.ts` and `fixtures/trees/react/` from the files in `web/react/src/kinds/`. A PR that adds a kind adds one file |
| `web/dist/blocks.js`, `web/dist/blocks.css` | 21, 12 | generated | already listed; the new built files join them |
| CI and docs | | split per area | a new `.github/workflows/react.yml` and a new `docs/react.md`; `web.yml` and `docs/schema.md` are not grown |

`web/src/render/index.ts` (13 PRs) is Mode A's list of kinds. R1 only moves its pure helpers out; the same
generated-list recipe fits it, as its own issue.

## The `.drover/arch.toml` lines

R1 adds:

```toml
[[ban]]
pattern = "document."
paths = ["web/src/core/**"]
reason = "the core is framework-neutral: it computes, a renderer draws"

[[ban]]
pattern = "render/"
paths = ["web/src/core/**"]
reason = "the core never imports a renderer; renderers and adapters import the core"

[[ban]]
pattern = "from \"react"
paths = ["web/src/**", "web/shot/shot.ts"]
reason = "React lives in web/react and its harness boot only"
```

and to `generated`: `"web/dist/core.js"`, `"web/dist/types/**"`.

R2 changes the codegen layer's `paths` to `["crates/blocks/src/codegen/**", "crates/blocks/src/bin/**"]` and the
`std::fs` ban's `except` to `["crates/blocks/src/codegen/**"]`, and adds to `generated`: `"web/src/gen/builders.ts"`.

R3 adds to `generated`: `"web/src/gen/shapes.ts"`, `"fixtures/check/*.json"`.

R4 adds to `generated`: `"web/src/gen/scoped.css"`, `"web/dist/blocks.scoped.css"`.

R5 adds:

```toml
[[ban]]
pattern = "/render/"
paths = ["web/react/src/**"]
reason = "the adapter draws with React: it never hosts or imports the HTML renderer"

[[ban]]
pattern = "react-dom"
paths = ["web/react/src/**"]
reason = "the adapter imports react only; react-dom is the harness's and the app's"

[[ban]]
pattern = "@tanstack"
paths = ["web/src/**", "web/react/**", "web/shot/**"]
reason = "blocks imports no router and no query library: the app passes its own in"

[[ban]]
pattern = "dangerouslySetInnerHTML"
paths = ["web/react/**"]
reason = "no raw HTML in React either: markdown is drawn as elements"
```

and to `generated`: `"web/react/src/gen/views.ts"`, `"web/dist/react.js"`, `"fixtures/trees/react/*.json"`.
