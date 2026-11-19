# `choice`

A question with options, a free answer and a default.

The Rust type `Choice`; in TS, `choice(fields: Choice)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | required |
| `default` | `ChoiceDefault` | optional |
| `id` | `string` | optional |
| `options` | `ChoiceOption[]` | required |
| `other` | `Other` | optional |
| `question` | `string` | optional |
| `recommended` | `string` | optional |
| `show` | `Expr` | optional |
| `values` | `Record<string, unknown>` | optional |

## A sample

```json
{
  "type": "choice",
  "id": "ask",
  "action": "answer",
  "question": "Merge it?",
  "options": [
    {
      "value": "yes",
      "label": "Yes"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "choice",
  "id": "ask",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Merge it?",
  "children": []
}
```
