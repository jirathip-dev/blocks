# `composer`

A message box: its send action, its chips and the messages queued; each send, queue or steer carries `values.nonce`, a fresh random id a retry repeats.

The Rust type `Composer`; in TS, `composer(fields: Composer)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | required |
| `acts` | `Record<string, string>` | optional |
| `chips` | `ComposerChip[]` | optional |
| `id` | `string` | optional |
| `label` | `string` | optional |
| `placeholder` | `string` | optional |
| `queued` | `Queued[]` | optional |
| `show` | `Expr` | optional |
| `values` | `Record<string, unknown>` | optional |
| `working` | `Working` | optional |

## A sample

```json
{
  "type": "composer",
  "id": "say",
  "action": "say",
  "placeholder": "message the team"
}
```

## The tree it draws

```json
{
  "kind": "composer",
  "id": "say",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "message the team",
  "children": []
}
```
