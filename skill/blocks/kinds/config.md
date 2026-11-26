# `config`

Settings as fields: the form kind under its settings name.

The Rust type `Form`; in TS, `config(fields: Form)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `fields` | `Field[]` | required |
| `id` | `string` | optional |
| `more` | `string` | optional |
| `show` | `Expr` | optional |
| `submit` | `Submit` | optional |

## A sample

```json
{
  "type": "config",
  "id": "settings",
  "action": "save",
  "fields": [
    {
      "type": "text",
      "name": "repo",
      "label": "Repo"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "config",
  "id": "settings",
  "variant": null,
  "drawn": "native",
  "role": "form",
  "name": "settings",
  "children": []
}
```
