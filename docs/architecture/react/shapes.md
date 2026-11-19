# Shapes

## The layout

```
package.json                 new, at the root: @jirathip-dev/blocks, its exports, react as an optional peer
web/
  src/core/                  the neutral core: no DOM, no React, no renderer
    index.ts                 the entry: re-exports gen/ (types, builders, hooks, schemes) and the files below
    built.ts  check.ts       built(); check(), actions(), on()
    eval.ts                  evaluate(), start(), view(): moved from behave.ts, the one evaluator
    tree.ts  gate.ts         moved as they are; tree.ts no longer imports the renderer
    look.ts  share.ts        gated(), a look's CSS; share()
  src/gen/                   generated, as today, plus builders.ts, shapes.ts, scoped.css
  src/render/  shell.ts  stream.ts  patch.ts  behave.ts  theme.ts  island.ts     Mode A: the HTML renderer and shell
  react/src/                 the React adapter
    view.ts  block.ts  act.ts  island.ts  h.ts
    kinds/<kind>.ts          one file per kind drawn natively
    gen/views.ts             generated from the kinds folder
  react/test/                its node tests and the conformance tests
  shot/                      the harness; shot/react.ts is the React boot
  dist/                      blocks.js, blocks.css (Mode A); core.js, react.js, blocks.scoped.css, types/** (new)
```

| Import | Gives | From |
|---|---|---|
| `@jirathip-dev/blocks` | the core | `web/dist/core.js` |
| `@jirathip-dev/blocks/react` | the adapter | `web/dist/react.js`, which imports `./core.js` |
| `@jirathip-dev/blocks/blocks.css` | the scoped stylesheet | `web/dist/blocks.scoped.css` |

## Builders (generated)

```ts
type Of<K extends Kind> = Extract<Block, { type: K }>;

export const row = (fields: Row): Of<"row"> => ({ type: "row", ...fields });
export const screen = (fields: Screen): Of<"screen"> => ({ type: "screen", ...fields });
// one per kind, 27 today; a new kind in the crate is a new builder after `just gen`

export const expr = {
  get: (key: string): Expr => ({ get: key }),
  not: (e: Expr): Expr => ({ not: e }),
  all: (...es: Expr[]): Expr => ({ all: es }),
  is: (value: Expr, pattern: Pattern): Expr => ({ is: { value, pattern } }),
  // any, eq, lt, len, has, add, sub, cat, pick: the same way
};
```

A part that is no block (a field, a tap, a label, a submit) is a typed object literal in its place: its position
gives it its type.

## Built, check, actions

```ts
declare const checked: unique symbol;
/// A screen with its fallbacks written, as the crate's `Built::of`. Only this goes into a view.
export type Built = Of<"screen"> & { readonly [checked]: true };
export function built(screen: Of<"screen">): Built;

/// Generated from the crate's `Fault`, which gains `Serialize`.
export type Fault =
  | { fault: "twice"; id: string; at: [string, string] }
  | { fault: "act-twice"; block: string; action: string; at: [string, string] }
  | { fault: "unnamed"; kind: string }
  | { fault: "unknown"; kind: string }
  | { fault: "shape"; kind: string; why: string }
  | { fault: "extra"; kind: string; field: string }
  | { fault: "clash"; kind: string }
  | { fault: "bare"; kind: string; id: string }
  | { fault: "state"; key: string };

/// Every fault of the screen, given the app's own kinds, as the crate's `Built::check`. Takes JSON from anywhere.
export function check(screen: unknown, app?: readonly string[]): Fault[];
/// Every action name the screen can send, sorted, each once.
export function actions(screen: Built): string[];
/// A handler per action name; one missing does not compile, an unknown action rejects.
export function on<A extends string>(handlers: Record<A, (a: Action) => unknown>): (a: Action) => Promise<boolean>;
/// `next`, with every part equal to `prev`'s kept as `prev`'s object, so an unchanged block is the same object.
export function share<T>(prev: T | undefined, next: T): T;
```

`fixtures/check/cases.json`, written by the crate: `[{ name, screen, app, faults }]`, at least one case per fault
and the clean samples. The TS test compares the whole list; a `shape` fault's `why` is serde's wording and is the
one field left out of the comparison. `gen/shapes.ts` is the table check reads: per kind and part, each field's
name, type and whether it is required.

## The view

```ts
export type Go = { open: string } | { sheet: string } | { thread: string };
export type Report =
  | { what: "fault"; fault: Fault }
  | { what: "dropped"; block: string; event: string }
  | { what: "failed"; action: string; error: unknown }
  | { what: "threw"; block: string; error: unknown };

export type BlocksViewProps = {
  screen: Built;
  onAction: (a: Action) => Promise<boolean | void> | boolean | void;
  onOpen?: (go: Go) => void;
  kinds?: AppKinds;
  islands?: Islands;
  look?: Look;
  mode?: "auto" | "light" | "dark";
  store?: Store;
  onReport?: (r: Report) => void;
};
export function BlocksView(p: BlocksViewProps): ReactNode;
/// The kinds this adapter draws natively; the others draw their fallback.
export const native: readonly Kind[];
```

- `Action` is the wire's generated type: `{ screen, action, block?, values? }`.
- `mode` picks the look's scheme; `auto` follows the device.
- `store` keeps drafts, with the HTML renderer's keys (`draft:<screen>:<block>:<field>`); the default is memory.
- `onReport` gets check's faults in development, and always: an island's dropped event, a handler that rejected
  (`failed`), a view or an island that threw (`threw`).

## Islands and app kinds

```ts
export type IslandProps = { props: Record<string, unknown>; emit: (name: string, values?: Record<string, unknown>) => void };
export type Islands = Record<string, (p: IslandProps) => ReactNode>;

export type KindProps = { block: AppBlock & Record<string, unknown>; act: (a: { action: string; values?: Record<string, unknown> }) => Promise<boolean> };
/// An app's own kinds; a core kind's name here does not compile, as in the HTML shell's `AppBlocks`.
export type AppKinds = Record<string, (p: KindProps) => ReactNode> & { [K in Kind]?: never };
```

What every block's root carries, in any adapter (the hooks #84 and the HTML renderer already write):

| On the root | When |
|---|---|
| `class="b b-<kind>"`, plus `b-app` for an app kind | always |
| `data-block="<kind>"`, `data-id="<id>"` | always; the id when the block has one |
| `data-variant`, `data-tone` | the kind's variant field (`gen/hooks.ts`) and its tone, when set |
| `data-fallback` | the fallback is drawn in place of a view |
| `hidden` | the block's `show` is false in the local state |
| `data-action="<name>"` | on each element whose press sends that action |
| `b-<kind>__<part>` | on each part `gen/hooks.ts` lists |

## The look

```ts
declare const passed: unique symbol;
export type Look = { readonly light: Scheme; readonly dark: Scheme; readonly [passed]: true };
/// Runs the gate on both schemes; throws one error listing every miss.
export function gated(pair: { light: Scheme; dark: Scheme }): Look;
```

The scoped stylesheet, built from `web/src/blocks.css` (the wrap is mechanical, in codegen):

```css
@layer blocks {
  @scope (.b-view) to (:is(.b-island, .b-app):not([data-fallback]) > *) {
    /* blocks.css as it is, with `:root` and `html` written `:scope` */
  }
}
```

## The harness boot: what an adapter gives `blocks-shot`

```ts
/// Draws `screen` under `root` and reports what it sends; `set` draws the next screen (`ops`, when the harness has them).
export type Boot = (
  root: HTMLElement,
  screen: Block,
  out: { sent(a: Action): void; dropped(what: string): void },
) => { set(screen: Block, ops?: Op[]): void };
```

The harness keeps the screen, applies an `answer`'s or a `frame`'s ops with `apply`, and calls `set`. Its taps,
typing, tree dump, ids, sizes and timings read the DOM by the hooks above, so they are the same for every adapter.
`blocks-shot --adapter html` (the default) and `--adapter react` pick the boot.
