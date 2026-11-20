# `import`

A spreadsheet import the app's server reads: upload a file, check the column match and the row errors, confirm one action.

The Rust type `Import`; in TS, `import_(fields: Import)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `accept` | `string[]` | optional |
| `action` | `string` | optional |
| `columns` | `ImportColumn[]` | required |
| `done` | `ImportDone` | optional |
| `error` | `string` | optional |
| `id` | `string` | optional |
| `into` | `string` | optional |
| `mb` | `number` | optional |
| `read` | `string` | optional |
| `refused` | `ImportRow[]` | optional |
| `sheet` | `ImportSheet` | optional |
| `show` | `Expr` | optional |
| `template` | `FileLink` | optional |
| `title` | `string` | required |

## A sample

```json
{
  "type": "import",
  "id": "products",
  "title": "Import products",
  "into": "Products",
  "columns": [
    {
      "key": "sku",
      "label": "SKU",
      "type": "text",
      "required": true
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text"
    },
    {
      "key": "cat",
      "label": "Category",
      "type": "choice",
      "values": [
        "Bakery",
        "Dairy"
      ]
    },
    {
      "key": "price",
      "label": "Price ฿",
      "type": "money",
      "required": true
    }
  ],
  "mb": 10,
  "template": {
    "name": "products.xlsx",
    "src": "https://example.com/files/template-products.xlsx"
  },
  "read": "read",
  "action": "import"
}
```

## The tree it draws

```json
{
  "kind": "import",
  "id": "products",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Import products",
  "children": []
}
```
