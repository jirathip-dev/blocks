# `tool`

One tool call: its name, a one-line summary, its state, and a body shown when it is opened.

The Rust type `Tool`; in TS, `tool(fields: Tool)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `body` | `string` | optional |
| `id` | `string` | optional |
| `name` | `string` | required |
| `show` | `Expr` | optional |
| `state` | `ToolState` | required |
| `summary` | `string` | optional |

## A sample

```json
{
  "type": "tool",
  "id": "tool",
  "name": "Test",
  "state": "running",
  "summary": "cargo test -p blocks"
}
```

## The tree it draws

```json
{
  "kind": "tool",
  "id": "tool",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Test",
  "children": []
}
```
