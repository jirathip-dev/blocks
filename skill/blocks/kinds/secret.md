# `secret`

A secret's input: its value is never sent back.

The Rust type `Secret`; in TS, `secret(fields: Secret)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | required |
| `id` | `string` | optional |
| `label` | `string` | optional |
| `name` | `string` | required |
| `placeholder` | `string` | optional |
| `set` | `boolean` | optional |
| `show` | `Expr` | optional |
| `values` | `Record<string, unknown>` | optional |

## A sample

```json
{
  "type": "secret",
  "id": "token",
  "name": "token",
  "action": "save-token",
  "label": "API token"
}
```

## The tree it draws

```json
{
  "kind": "secret",
  "id": "token",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "API token",
  "children": []
}
```
