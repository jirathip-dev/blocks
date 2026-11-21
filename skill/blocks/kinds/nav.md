# `nav`

A site's link bar.

The Rust type `Nav`; in TS, `nav(fields: Nav)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `brand` | `NavLink` | optional |
| `id` | `string` | optional |
| `links` | `NavLink[]` | required |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "nav",
  "id": "nav",
  "brand": {
    "label": "Blocks",
    "href": "/"
  },
  "links": [
    {
      "label": "Docs",
      "href": "/docs"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "nav",
  "id": "nav",
  "variant": null,
  "drawn": "native",
  "role": "navigation",
  "name": "nav",
  "children": []
}
```
