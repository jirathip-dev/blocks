# Example: `ok-queue`

A screen with no guard finding: start a new screen from it.

```json
{
  "actions": [
    {
      "action": "refresh",
      "label": "Refresh"
    }
  ],
  "blocks": [
    {
      "buttons": [
        {
          "action": "drive",
          "id": "drive-now",
          "label": "Drive now",
          "style": "primary",
          "type": "button"
        },
        {
          "action": "pause",
          "id": "pause",
          "label": "Pause",
          "type": "button"
        }
      ],
      "id": "drive",
      "title": "Drive",
      "type": "card"
    },
    {
      "blocks": [
        {
          "id": "rows",
          "rows": [
            {
              "badge": {
                "text": "impl"
              },
              "id": "r1",
              "tap": {
                "action": "open"
              },
              "title": "#159 guard lint",
              "type": "row"
            },
            {
              "button": {
                "action": "stop",
                "confirm": {
                  "destructive": true,
                  "ok": "Stop",
                  "title": "Stop lane #160?"
                },
                "label": "Stop",
                "tone": "bad"
              },
              "id": "r2",
              "title": "#160 blocks check",
              "type": "row"
            }
          ],
          "type": "list"
        }
      ],
      "header": "Lanes",
      "id": "lanes",
      "type": "section"
    },
    {
      "blocks": [
        {
          "id": "merged",
          "rows": [],
          "type": "list"
        },
        {
          "markdown": "Merged issues appear here.",
          "type": "text"
        }
      ],
      "header": "Done",
      "id": "done",
      "type": "section"
    },
    {
      "fallback": {
        "title": "Fleet map"
      },
      "id": "map",
      "name": "fleet-map",
      "size": {
        "height": 200,
        "width": 358
      },
      "type": "island"
    },
    {
      "action": "remove",
      "confirm": {
        "destructive": true,
        "ok": "Remove",
        "title": "Remove the fleet and its queue?"
      },
      "id": "rm",
      "label": "Remove fleet",
      "style": "destructive",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```
