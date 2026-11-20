# Usage: how the callers read

A client app route end to end, then a second adapter. Every name here is specified in `shapes.md`.

## 1. The pin and the stylesheet

One package, pinned by commit like the crate and the Swift package. The core and the adapter cannot disagree,
because they are one pin.

```json
{ "dependencies": { "@jirathip-dev/blocks": "github:jirathip-dev/blocks#<40 hex>" } }
```

```css
/* apps/delivery/src/app.css: blocks' layer sits above the app's reset and below its own components */
@layer reset, blocks, app;
@import "@jirathip-dev/blocks/blocks.css";
```

## 2. The screen: a pure function of the route's data

No JSX, no hooks, no fetch: data in, a checked-able screen out. This is the file an agent writes.

```ts
// apps/delivery/src/screens/orders.ts
import { type Built, built, chips, expr, form, island, list, row, screen, stat } from "@jirathip-dev/blocks";

export const ACTIONS = ["filter", "assign", "pick-stop"] as const;

export function ordersScreen(orders: Order[], drivers: string[], status: Status): Built {
  return built(
    screen({
      id: "orders",
      title: "Orders",
      blocks: [
        stat({ id: "count", label: status, value: orders.length }),
        chips({ id: "status", name: "status", action: "filter", selected: [status], options: STATUSES.map((s) => ({ label: s, value: s })) }),
        list({
          id: "rows",
          rows: orders.map((o) =>
            row({
              id: `order-${o.id}`,
              title: o.customer,
              subtitle: o.address,
              value: { since: o.placed },
              badge: o.late ? { text: "late", tone: "bad" } : null,
              tap: { open: `/orders/${o.id}` },
            }),
          ),
        }),
        form({
          id: "assign",
          fields: [{ type: "picker", name: "driver", label: "Driver", options: drivers, checks: [{ ok: expr.is(expr.get("driver"), "filled"), say: "Pick a driver" }] }],
          submit: { action: "assign", label: "Assign the open orders" },
        }),
        island({
          id: "map",
          name: "route-map",
          props: { stops: orders.map((o) => o.stop) },
          events: ["pick-stop"],
          size: { aspect: "16/9" },
          fallback: { title: "Route map", subtitle: `${orders.length} stops` },
        }),
      ],
    }),
  );
}
```

## 3. The route: the loader builds, the view draws, actions go to the router and to mutations

blocks imports no router and no query library. The app hands its own in.

```tsx
// apps/delivery/src/routes/orders.tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { on } from "@jirathip-dev/blocks";
import { BlocksView } from "@jirathip-dev/blocks/react";

export const Route = createFileRoute("/orders")({
  validateSearch: (s): { status: Status } => ({ status: statusOf(s.status) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ordersScreen(await api.orders(deps.status), await api.drivers(), deps.status),
  component: Orders,
});

function Orders() {
  const screen = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const assign = useMutation({ mutationFn: api.assign, onSuccess: () => router.invalidate() });
  return (
    <BlocksView
      screen={screen}
      look={brand}
      islands={{ "route-map": RouteMap }}
      onOpen={(go) => "open" in go && router.history.push(go.open)}
      onAction={on<(typeof ACTIONS)[number]>({
        filter: (a) => navigate({ search: { status: statusOf(a.values?.status) } }),
        assign: (a) => assign.mutateAsync({ driver: String(a.values?.driver) }),
        "pick-stop": (a) => navigate({ to: "/orders/$id", params: { id: String(a.values?.order) } }),
      })}
    />
  );
}
```

What the caller gets without writing it:

- While `assign` runs, its button is busy and cannot be pressed twice. When it resolves, the form's drafts clear;
  when it rejects or resolves `false`, they stay.
- `router.invalidate()` runs the loader again. The new screen is drawn over the old one by React: a row whose data
  did not change does not redraw, the text being typed and the focus stay, the map island keeps its own state.
- A handler missing from `on({...})` does not compile; an action the screen sends that `ACTIONS` lacks fails the
  route's test below.

## 4. The route's test: no browser, no DOM

Tree tests per route are the default (q2220). An e2e test, for a few key flows only, selects by the same stable ids
(`data-block`, `data-id`, `data-action`).

```ts
// apps/delivery/src/screens/orders.test.ts
import { actions, check, expect, tree } from "@jirathip-dev/blocks";
import { native } from "@jirathip-dev/blocks/react";

test("orders: a row per order, the assign form, the map", () => {
  const s = ordersScreen(sample.orders, sample.drivers, "open");
  deepStrictEqual(check(s), []);
  deepStrictEqual(actions(s), [...ACTIONS].sort());
  deepStrictEqual(expect(tree(s, native), want), []);
});
```

`want` is the route's committed tree (`orders.tree.json`: kind, id and drawn per block), the same shape as
`fixtures/trees`.

## 5. A heavy tool stays a React island

Props in, named events out, a fallback: #21's contract and nothing more. The island is a child in the app's own
React tree, so its router, query client and auth contexts are simply there. It may fetch its own data; while it
waits, and if it throws, its fallback row is drawn in its box.

```tsx
// apps/delivery/src/islands/route-map.tsx
import type { IslandProps } from "@jirathip-dev/blocks/react";

export function RouteMap({ props, emit }: IslandProps) {
  const stops = useSuspenseQuery(stopsQuery(props.stops)).data;
  return <MapCanvas stops={stops} onPick={(s) => emit("pick-stop", { order: s.order })} />;
}
```

`emit("zoom")` is dropped and reported, because `zoom` is not in the island's `events`.

## 6. The brand is a scheme that passed the gate

```ts
// apps/delivery/src/brand.ts
import { gated } from "@jirathip-dev/blocks";

export const brand = gated({ light: { label: "Acme", "color-scheme": "light", tokens: { "--bg": "#ffffff" /* the 19 tokens */ } }, dark: acmeDark });
```

`gated` throws when the module loads, listing every contrast miss, so a failing brand fails the dev server's start
and every test, never a user's click. `BlocksView` takes no other kind of look.

## 7. A second adapter, later

What a Solid adapter would add, and all it would add (`boundaries.md`, the adapter contract):

```
web/solid/src/kinds/<kind>.ts      one view per kind it draws natively
web/solid/src/view.ts              its BlocksView over the core's start(), view(), share()
web/shot/solid.ts                  its boot for the harness
fixtures/trees/solid/              written by `just gen` from its kinds folder
```

```sh
blocks-shot --adapter solid --screen fixtures/blocks/row.json --expect fixtures/trees/solid/row.json --check --out shots/row
```
