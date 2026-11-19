# `editor`

A text editor and its errors.

The Rust type `Editor`; in TS, `editor(fields: Editor)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | required |
| `errors` | `LineError[]` | optional |
| `first` | `number` | optional |
| `id` | `string` | optional |
| `name` | `string` | required |
| `show` | `Expr` | optional |
| `text` | `string` | required |

## A sample

```json
{
  "type": "editor",
  "id": "editor",
  "name": "notes",
  "text": "hello",
  "action": "save-notes"
}
```

## The tree it draws

```json
{
  "kind": "editor",
  "id": "editor",
  "variant": null,
  "drawn": "native",
  "role": "button",
  "name": "notes",
  "children": []
}
```
