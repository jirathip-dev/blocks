# `button`

A button.

The Rust type `Button`; in TS, `button(fields: Button)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `confirm` | `Confirm` | optional |
| `enabled` | `Expr` | optional |
| `id` | `string` | optional |
| `label` | `string` | required |
| `show` | `Expr` | optional |
| `style` | `ButtonStyle` | optional |
| `tap` | `Tap` | optional |
| `values` | `Record<string, unknown>` | optional |

## A sample

```json
{
  "type": "button",
  "id": "save",
  "label": "Save",
  "action": "save"
}
```

## The tree it draws

```json
{
  "kind": "button",
  "id": "save",
  "variant": null,
  "drawn": "native",
  "role": "button",
  "name": "Save",
  "children": []
}
```
