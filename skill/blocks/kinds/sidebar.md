# `sidebar`

A side navigation: an icon rail that opens on hover or pin, a drawer on a phone.

The Rust type `Sidebar`; in TS, `sidebar(fields: Sidebar)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `brand` | `SideLink` | optional |
| `empty` | `string` | optional |
| `footer` | `SideLink[]` | optional |
| `groups` | `SideGroup[]` | required |
| `id` | `string` | optional |
| `label` | `string` | required |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "sidebar",
  "id": "side",
  "label": "main",
  "brand": {
    "label": "Workspace",
    "href": "#home",
    "icon": "◈"
  },
  "groups": [
    {
      "links": [
        {
          "label": "Home",
          "href": "#home",
          "icon": "⌂"
        },
        {
          "label": "Inbox",
          "href": "#inbox",
          "icon": "✉",
          "current": true,
          "badge": {
            "count": 12
          }
        }
      ]
    },
    {
      "title": "Work",
      "links": [
        {
          "label": "Projects",
          "icon": "◆",
          "open": true,
          "children": [
            {
              "label": "Spring launch",
              "href": "#spring"
            },
            {
              "label": "Archive",
              "href": "#archive"
            }
          ]
        },
        {
          "label": "Alerts",
          "href": "#alerts",
          "icon": "⚑",
          "badge": {
            "count": 3,
            "tone": "bad"
          }
        }
      ]
    }
  ],
  "footer": [
    {
      "label": "Settings",
      "href": "#settings",
      "icon": "⚙"
    }
  ],
  "empty": "No pages yet"
}
```

## The tree it draws

```json
{
  "kind": "sidebar",
  "id": "side",
  "variant": null,
  "drawn": "native",
  "role": "navigation",
  "name": "main",
  "children": []
}
```
