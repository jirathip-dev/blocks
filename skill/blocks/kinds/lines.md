# `lines`

Repeating rows of fields with add and remove, running totals and a balance check.

The Rust type `Lines`; in TS, `lines(fields: Lines)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `add` | `string` | optional |
| `balance` | `string[]` | optional |
| `calc` | `Record<string, Expr>` | optional |
| `columns` | `Field[]` | required |
| `empty` | `string` | optional |
| `errors` | `RowError[]` | optional |
| `id` | `string` | optional |
| `items` | `LineItem[]` | required |
| `label` | `string` | optional |
| `max` | `number` | optional |
| `min` | `number` | optional |
| `name` | `string` | required |
| `scale` | `number` | optional |
| `show` | `Expr` | optional |
| `submit` | `Submit` | optional |
| `sum` | `string[]` | optional |

## A sample

```json
{
  "type": "lines",
  "id": "journal",
  "name": "lines",
  "label": "journal lines",
  "action": "check-journal",
  "columns": [
    {
      "type": "picker",
      "name": "account",
      "label": "Account",
      "options": [
        "6100 Rent",
        "6200 Utilities",
        "2100 Payables"
      ]
    },
    {
      "type": "text",
      "name": "memo",
      "label": "Description"
    },
    {
      "type": "text",
      "name": "debit",
      "label": "Debit",
      "keyboard": "number"
    },
    {
      "type": "text",
      "name": "credit",
      "label": "Credit",
      "keyboard": "number"
    }
  ],
  "items": [
    {
      "id": "l1",
      "values": {
        "account": "6100 Rent",
        "debit": "2400",
        "memo": "office rent"
      }
    },
    {
      "id": "l2",
      "values": {
        "account": "",
        "debit": "318.40",
        "memo": "power and water"
      }
    },
    {
      "id": "l3",
      "values": {
        "account": "2100 Payables",
        "credit": "2668.50",
        "memo": "landlord"
      }
    }
  ],
  "sum": [
    "debit",
    "credit"
  ],
  "balance": [
    "debit",
    "credit"
  ],
  "min": 2,
  "add": "add line",
  "errors": [
    {
      "row": "l2",
      "name": "account",
      "message": "pick an account for line 2"
    }
  ],
  "submit": {
    "label": "post entry",
    "action": "post-journal"
  }
}
```

## The tree it draws

```json
{
  "kind": "lines",
  "id": "journal",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "journal lines",
  "children": []
}
```
