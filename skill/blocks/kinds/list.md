# `list`

A list of rows.

The Rust type `List`; in TS, `list(fields: List)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `id` | `string` | optional |
| `more` | `More` | optional |
| `reorder` | `Gesture` | optional |
| `rows` | `Block[]` | required |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "list",
  "id": "rows",
  "rows": [
    {
      "type": "row",
      "id": "row",
      "title": "Build",
      "subtitle": "green",
      "value": "2m",
      "rounds": [
        {
          "id": "r1",
          "name": "impl",
          "state": "done",
          "summary": "pushed",
          "tap": {
            "url": "/runs/1"
          }
        },
        {
          "id": "r2",
          "name": "review 1",
          "state": "needs",
          "summary": "one finding",
          "lane": {
            "name": "rev-1",
            "lines": [
              "reading the diff"
            ]
          },
          "blocks": [
            {
              "type": "text",
              "id": "finding",
              "markdown": "Fix the test"
            }
          ],
          "links": [
            {
              "label": "verdict",
              "tap": {
                "url": "/verdict"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "list",
  "id": "rows",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "rows",
  "children": [
    {
      "kind": "row",
      "id": "row",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "Build",
      "children": [
        {
          "kind": "text",
          "id": "finding",
          "variant": null,
          "drawn": "native",
          "role": "group",
          "name": "finding",
          "children": []
        }
      ]
    }
  ]
}
```
