# `import`

A spreadsheet import: pick an .xlsx or .csv, map its columns, see row errors, send the good rows as one action.

The Rust type `Import`; in TS, `import_(fields: Import)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `columns` | `ImportColumn[]` | required |
| `done` | `number` | optional |
| `error` | `string` | optional |
| `id` | `string` | optional |
| `into` | `string` | optional |
| `max` | `number` | optional |
| `refused` | `Refused[]` | optional |
| `show` | `Expr` | optional |
| `template` | `boolean` | optional |
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
      "required": true,
      "unique": true,
      "also": [
        "item code"
      ]
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
      "label": "Price",
      "type": "money",
      "required": true
    }
  ],
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
