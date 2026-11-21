# `row`

One row of a list.

The Rust type `Row`; in TS, `row(fields: Row)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `accessory` | `Accessory` | optional |
| `badge` | `Label` | optional |
| `button` | `Act` | optional |
| `changed` | `boolean` | optional |
| `figure` | `Figure` | optional |
| `handle` | `boolean` | optional |
| `id` | `string` | optional |
| `indent` | `number` | optional |
| `lifted` | `boolean` | optional |
| `menu` | `Act[]` | optional |
| `rounds` | `Round[]` | optional |
| `show` | `Expr` | optional |
| `sticky` | `boolean` | optional |
| `style` | `RowStyle` | optional |
| `subtitle` | `Toned` | optional |
| `swipe` | `Act[]` | optional |
| `tap` | `Tap` | optional |
| `title` | `string` | optional |
| `value` | `Shown` | optional |

## A sample

```json
{
  "type": "row",
  "id": "build",
  "title": "Build",
  "subtitle": "green",
  "value": "2m"
}
```

## The tree it draws

```json
{
  "kind": "row",
  "id": "build",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Build",
  "children": []
}
```
