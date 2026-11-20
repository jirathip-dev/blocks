# `media`

A picture or a video of a known size.

The Rust type `Media`; in TS, `media(fields: Media)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `alt` | `string` | required |
| `caption` | `string` | optional |
| `draw` | `Gesture` | optional |
| `height` | `number` | required |
| `id` | `string` | optional |
| `marks` | `Mark[]` | optional |
| `move` | `Gesture` | optional |
| `poster` | `string` | optional |
| `remove` | `Gesture` | optional |
| `show` | `Expr` | optional |
| `src` | `string` | required |
| `stretch` | `Gesture` | optional |
| `tools` | `MarkKind[]` | optional |
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
  "caption": "This week",
  "marks": [
    {
      "id": "peak",
      "kind": "highlight",
      "at": [
        0.5,
        0.2
      ],
      "to": [
        0.62,
        0.9
      ],
      "tone": "warn"
    },
    {
      "id": "arrow",
      "kind": "arrow",
      "at": [
        0.3,
        0.15
      ],
      "to": [
        0.48,
        0.3
      ]
    },
    {
      "id": "note",
      "kind": "text",
      "at": [
        0.05,
        0.08
      ],
      "text": "Release week"
    },
    {
      "id": "dip",
      "kind": "pin",
      "at": [
        0.78,
        0.7
      ],
      "text": "1",
      "tone": "info"
    }
  ]
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
