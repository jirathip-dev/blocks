# `section`

A titled group of blocks.

The Rust type `Section`; in TS, `section(fields: Section)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `blocks` | `Block[]` | required |
| `footer` | `string` | optional |
| `header` | `string` | optional |
| `id` | `string` | optional |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "section",
  "id": "today",
  "header": "Today",
  "blocks": [
    {
      "type": "text",
      "id": "today-note",
      "markdown": "Quiet"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "section",
  "id": "today",
  "variant": null,
  "drawn": "native",
  "role": "region",
  "name": "Today",
  "children": [
    {
      "kind": "text",
      "id": "today-note",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "today-note",
      "children": []
    }
  ]
}
```
