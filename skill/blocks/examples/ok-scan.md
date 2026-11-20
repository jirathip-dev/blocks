# Example: `ok-scan`

A screen with no guard finding: start a new screen from it.

```json
{
  "blocks": [
    {
      "fields": [
        {
          "label": "Signed for by",
          "name": "who",
          "type": "text"
        },
        {
          "checks": [
            {
              "ok": {
                "is": {
                  "pattern": "filled",
                  "value": {
                    "get": "note"
                  }
                }
              },
              "say": "Scan the signed note"
            }
          ],
          "label": "Delivery note",
          "max": 5,
          "name": "note",
          "type": "scan"
        }
      ],
      "id": "proof",
      "submit": {
        "action": "deliver",
        "label": "Send"
      },
      "type": "form"
    }
  ],
  "id": "delivery",
  "title": "Delivery",
  "type": "screen"
}
```
