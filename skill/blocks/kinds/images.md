# `images`

A strip of images.

The Rust type `Images`; in TS, `images(fields: Images)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `id` | `string` | optional |
| `items` | `Image[]` | required |
| `show` | `Expr` | optional |
| `size` | `ImageSize` | optional |

## A sample

```json
{
  "type": "images",
  "id": "shots",
  "items": [
    {
      "src": "/media/a.png",
      "alt": "a"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "images",
  "id": "shots",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "shots",
  "children": []
}
```
