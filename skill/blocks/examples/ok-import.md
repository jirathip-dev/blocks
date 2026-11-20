# Example: `ok-import`

A screen with no guard finding: start a new screen from it.

```json
{
  "blocks": [
    {
      "action": "import-products",
      "columns": [
        {
          "key": "sku",
          "label": "SKU",
          "required": true,
          "type": "text"
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
          "required": true,
          "type": "money"
        }
      ],
      "id": "import-products",
      "into": "Products",
      "mb": 10,
      "read": "read-products",
      "sheet": {
        "file": {
          "id": "f-7",
          "name": "price-list-nov.xlsx",
          "rows": 48,
          "sheet": "Sheet1",
          "size": 86016
        },
        "headers": [
          "Item code",
          "Description",
          "Group",
          "Unit price",
          "Supplier"
        ],
        "map": {
          "cat": "Group",
          "name": "Description",
          "price": "Unit price",
          "sku": "Item code"
        },
        "rows": [
          {
            "cells": {
              "cat": "Bakery",
              "name": "Sourdough loaf",
              "price": "85.00",
              "sku": "BK-0101"
            },
            "n": 2
          },
          {
            "cells": {
              "cat": "Bakery",
              "name": "Butter croissant",
              "price": "45.00",
              "sku": "BK-0102"
            },
            "n": 3
          },
          {
            "cells": {
              "cat": "Dairy",
              "name": "Fresh milk 1 L",
              "price": "52.00",
              "sku": "DA-0310"
            },
            "n": 4
          }
        ]
      },
      "template": {
        "name": "products.xlsx",
        "src": "https://example.com/files/template-products.xlsx"
      },
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
