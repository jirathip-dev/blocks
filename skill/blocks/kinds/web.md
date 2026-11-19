# `web`

A web view of a fixed height.

The Rust type `Web`; in TS, `web(fields: Web)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `height` | `number` | required |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `src` | `string` | required |

## A sample

```json
{
  "type": "web",
  "id": "doc",
  "src": "/doc",
  "height": 240
}
```

## The tree it draws

```json
{
  "kind": "web",
  "id": "doc",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "doc",
  "children": []
}
```
