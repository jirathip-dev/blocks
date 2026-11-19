# `sheet`

A sheet over a screen.

The Rust type `Sheet`; in TS, `sheet(fields: Sheet)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `blocks` | `Block[]` | required |
| `cancel` | `string` | optional |
| `done` | `Submit` | optional |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `title` | `string` | required |

## A sample

```json
{
  "type": "sheet",
  "id": "add",
  "title": "Add a repo",
  "blocks": [
    {
      "type": "text",
      "id": "sheet-note",
      "markdown": "Pick one"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "sheet",
  "id": "add",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Add a repo",
  "children": [
    {
      "kind": "text",
      "id": "sheet-note",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "sheet-note",
      "children": []
    }
  ]
}
```
