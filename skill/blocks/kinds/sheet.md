# `sheet`

The modal kind under its older name, drawn the same way: write `modal` in a new screen.

The Rust type `Modal`; in TS, `sheet(fields: Modal)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `blocks` | `Block[]` | required |
| `cancel` | `string` | optional |
| `destructive` | `boolean` | optional |
| `done` | `Submit` | optional |
| `id` | `string` | optional |
| `locale` | `Locale` | optional |
| `message` | `string` | optional |
| `ok` | `string` | optional |
| `show` | `Expr` | optional |
| `title` | `string` | required |
| `variant` | `ModalVariant` | optional |

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
  "role": "dialog",
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
