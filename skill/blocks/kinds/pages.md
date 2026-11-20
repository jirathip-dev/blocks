# `pages`

A document as the app's server drew it, one picture a page: paged and zoomed in the view, with its PDF.

The Rust type `Pages`; in TS, `pages(fields: Pages)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `fallback` | `Fallback` | optional |
| `file` | `string` | optional |
| `id` | `string` | optional |
| `note` | `string` | optional |
| `pages` | `PageImage[]` | required |
| `show` | `Expr` | optional |
| `title` | `string` | optional |

## A sample

```json
{
  "type": "pages",
  "id": "quote",
  "title": "Q-2026-0418 rev 3",
  "pages": [
    {
      "src": "/q/0418/1.png",
      "alt": "Cover and priced items: 8 lines, total 51,092.50 including VAT",
      "width": 1240,
      "height": 1754
    },
    {
      "src": "/q/0418/2.png",
      "alt": "Terms and conditions, clauses 1 to 6",
      "width": 1240,
      "height": 1754
    },
    {
      "src": "/q/0418/3.png",
      "alt": "Programme of works and the acceptance signature box",
      "width": 1240,
      "height": 1754
    }
  ],
  "file": "/q/0418.pdf",
  "note": "Out of date: the prices changed after this was drawn."
}
```

## The tree it draws

```json
{
  "kind": "pages",
  "id": "quote",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Q-2026-0418 rev 3",
  "children": []
}
```
