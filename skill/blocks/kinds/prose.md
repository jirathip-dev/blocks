# `prose`

Text as a tree of headings, paragraphs, lists, quotes and code.

The Rust type `Prose`; in TS, `prose(fields: Prose)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `id` | `string` | optional |
| `parts` | `Part[]` | required |
| `show` | `Expr` | optional |
| `streaming` | `boolean` | optional |

## A sample

```json
{
  "type": "prose",
  "id": "about",
  "parts": [
    {
      "part": "heading",
      "level": 2,
      "spans": [
        {
          "text": "Blocks"
        }
      ]
    },
    {
      "part": "para",
      "spans": [
        {
          "text": "Typed "
        },
        {
          "text": "screens",
          "bold": true
        }
      ]
    },
    {
      "part": "list",
      "ordered": false,
      "items": [
        [
          {
            "text": "one"
          }
        ],
        [
          {
            "text": "two"
          }
        ]
      ]
    },
    {
      "part": "quote",
      "spans": [
        {
          "text": "Built by type."
        }
      ]
    },
    {
      "part": "code",
      "lang": "rust",
      "text": "Row::new(\"a\")"
    },
    {
      "part": "rule"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "prose",
  "id": "about",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "about",
  "children": []
}
```
