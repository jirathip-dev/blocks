# Example: `ok-import`

A screen with no guard finding: start a new screen from it.

```json
{
  "blocks": [
    {
      "action": "import-products",
      "columns": [
        {
          "also": [
            "item code",
            "code"
          ],
          "key": "sku",
          "label": "SKU",
          "required": true,
          "type": "text",
          "unique": true
        },
        {
          "also": [
            "description",
            "product"
          ],
          "key": "name",
          "label": "Name",
          "required": true,
          "type": "text"
        },
        {
          "also": [
            "group"
          ],
          "key": "cat",
          "label": "Category",
          "type": "choice",
          "values": [
            "Bakery",
            "Dairy",
            "Produce",
            "Pantry"
          ]
        },
        {
          "also": [
            "unit price"
          ],
          "key": "price",
          "label": "Price ฿",
          "required": true,
          "type": "money"
        },
        {
          "also": [
            "qty on hand"
          ],
          "key": "stock",
          "label": "Stock",
          "type": "number"
        },
        {
          "also": [
            "expires"
          ],
          "key": "exp",
          "label": "Best before",
          "type": "date"
        }
      ],
      "id": "import-products",
      "into": "Products",
      "max": 5000,
      "title": "Import products",
      "type": "import"
    },
    {
      "columns": [
        {
          "id": "sku",
          "kind": "text",
          "label": "SKU"
        },
        {
          "id": "name",
          "kind": "text",
          "label": "Name"
        },
        {
          "digits": 2,
          "id": "price",
          "kind": "money",
          "label": "Price ฿"
        }
      ],
      "export": [
        "xlsx"
      ],
      "id": "list",
      "rows": [
        {
          "cells": {
            "name": "Sourdough loaf",
            "price": 85,
            "sku": "BK-0101"
          },
          "id": "BK-0101"
        },
        {
          "cells": {
            "name": "Butter croissant",
            "price": 45,
            "sku": "BK-0102"
          },
          "id": "BK-0102"
        }
      ],
      "title": "Products",
      "type": "table"
    }
  ],
  "id": "products",
  "title": "Products",
  "type": "screen"
}
```
