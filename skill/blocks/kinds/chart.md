# `chart`

A chart of named series over x values: bar, stacked, line, combo or donut; `move` drags a point's value.

The Rust type `Chart`; in TS, `chart(fields: Chart)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `chart` | `ChartKind` | required |
| `empty` | `string` | optional |
| `era` | `Era` | optional |
| `format` | `ChartFormat` | optional |
| `id` | `string` | optional |
| `lang` | `string` | optional |
| `move` | `Gesture` | optional |
| `selected` | `string` | optional |
| `series` | `Series[]` | required |
| `show` | `Expr` | optional |
| `tap` | `Tap` | optional |
| `title` | `string` | required |
| `x` | `string[]` | required |

## A sample

```json
{
  "type": "chart",
  "id": "revenue",
  "title": "Revenue and target",
  "chart": "combo",
  "x": [
    "2024-01",
    "2024-02",
    "2024-03",
    "2024-04",
    "2024-05",
    "2024-06"
  ],
  "series": [
    {
      "name": "Revenue",
      "values": [
        11100000,
        10600000,
        12900000,
        11800000,
        12200000,
        11400000
      ]
    },
    {
      "name": "Target",
      "values": [
        11000000,
        11000000,
        12000000,
        12000000,
        12000000,
        12500000
      ],
      "tone": "warn",
      "as": "line"
    }
  ],
  "era": "be",
  "format": "thb_m",
  "selected": "2024-03",
  "tap": {
    "action": "sales.month"
  }
}
```

## The tree it draws

```json
{
  "kind": "chart",
  "id": "revenue",
  "variant": null,
  "drawn": "native",
  "role": "figure",
  "name": "Revenue and target",
  "children": []
}
```
