# `boxplot`

A box plot: one upright box per category on a value axis with its label and unit; a tap picks a box.

The Rust type `Boxplot`; in TS, `boxplot(fields: Boxplot)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `axis` | `string` | required |
| `boxes` | `PlotBox[]` | required |
| `empty` | `string` | optional |
| `id` | `string` | optional |
| `selected` | `string` | optional |
| `show` | `Expr` | optional |
| `tap` | `Tap` | optional |
| `title` | `string` | required |
| `unit` | `string` | optional |

## A sample

```json
{
  "type": "boxplot",
  "id": "hands",
  "title": "Peak force per hand",
  "axis": "Peak force",
  "boxes": [
    {
      "name": "Left",
      "min": 25.8,
      "q1": 30.4,
      "median": 33.1,
      "q3": 36.0,
      "max": 41.2,
      "outliers": [
        18.0,
        47.5
      ]
    },
    {
      "name": "Right",
      "min": 28.2,
      "q1": 32.9,
      "median": 35.6,
      "q3": 38.1,
      "max": 43.0,
      "outliers": [
        21.4
      ]
    }
  ],
  "unit": "kg",
  "selected": "Left",
  "tap": {
    "action": "force.hand"
  }
}
```

## The tree it draws

```json
{
  "kind": "boxplot",
  "id": "hands",
  "variant": null,
  "drawn": "native",
  "role": "figure",
  "name": "Peak force per hand",
  "children": []
}
```
