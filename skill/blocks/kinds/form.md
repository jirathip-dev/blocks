# `form`

A form of fields; also the `config` kind.

The Rust type `Form`; in TS, `form(fields: Form)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `fields` | `Field[]` | required |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `submit` | `Submit` | optional |

## A sample

```json
{
  "type": "form",
  "id": "signup",
  "action": "sign-up",
  "fields": [
    {
      "type": "text",
      "name": "email",
      "label": "Email"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "form",
  "id": "signup",
  "variant": null,
  "drawn": "native",
  "role": "form",
  "name": "signup",
  "children": []
}
```
