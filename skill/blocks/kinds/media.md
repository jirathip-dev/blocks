# `media`

A picture or a video of a known size.

The Rust type `Media`; in TS, `media(fields: Media)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `alt` | `string` | required |
| `caption` | `string` | optional |
| `height` | `number` | required |
| `id` | `string` | optional |
| `poster` | `string` | optional |
| `show` | `Expr` | optional |
| `src` | `string` | required |
| `video` | `boolean` | optional |
| `width` | `number` | required |

## A sample

```json
{
  "type": "media",
  "id": "chart",
  "src": "/media/chart.png",
  "alt": "a bar chart",
  "width": 640,
  "height": 360,
  "caption": "This week"
}
```

## The tree it draws

```json
{
  "kind": "media",
  "id": "chart",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "a bar chart",
  "children": []
}
```
