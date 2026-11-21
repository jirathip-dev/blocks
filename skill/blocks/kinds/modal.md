# `modal`

A box over a screen: a dialog dragged by its header, a fixed confirm or alert, or a tool window that resizes and folds to a pill.

The Rust type `Modal`; in TS, `modal(fields: Modal)` from `web/src/gen/builders.ts`.

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
  "type": "modal",
  "id": "edit-item",
  "title": "Edit item",
  "cancel": "cancel",
  "done": {
    "label": "save",
    "action": "save-item"
  },
  "blocks": [
    {
      "type": "text",
      "id": "modal-note",
      "markdown": "Pick a name"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "modal",
  "id": "edit-item",
  "variant": null,
  "drawn": "native",
  "role": "dialog",
  "name": "Edit item",
  "children": [
    {
      "kind": "text",
      "id": "modal-note",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "modal-note",
      "children": []
    }
  ]
}
```
