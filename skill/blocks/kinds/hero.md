# `hero`

A page's opening: a title, a line, a picture and its actions.

The Rust type `Hero`; in TS, `hero(fields: Hero)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `actions` | `Act[]` | optional |
| `id` | `string` | optional |
| `media` | `Media` | optional |
| `show` | `Expr` | optional |
| `subtitle` | `string` | optional |
| `title` | `string` | required |

## A sample

```json
{
  "type": "hero",
  "id": "hero",
  "title": "Blocks",
  "subtitle": "One shape, three renderers",
  "media": {
    "src": "/media/chart.png",
    "alt": "a bar chart",
    "width": 640,
    "height": 360,
    "caption": "This week"
  },
  "actions": [
    {
      "label": "Start",
      "action": "start"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "hero",
  "id": "hero",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Blocks",
  "children": []
}
```
