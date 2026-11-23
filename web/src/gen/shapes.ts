export type Fault = { fault: "twice"; at: string[]; id: string } | { fault: "act-twice"; action: string; at: string[]; block: string } | { fault: "unnamed"; kind: string } | { fault: "unknown"; kind: string } | { fault: "shape"; kind: string; why: string } | { fault: "extra"; field: string; kind: string } | { fault: "clash"; kind: string } | { fault: "bare"; id: string; kind: string } | { fault: "state"; key: string } | { fault: "link"; at: string; url: string } | { fault: "aim"; field: string; id: string };

export type Shape = boolean | { type?: string | string[]; $ref?: string; properties?: Record<string, Shape>; required?: string[]; anyOf?: Shape[]; oneOf?: Shape[]; items?: Shape; additionalProperties?: Shape; const?: unknown; enum?: unknown[]; not?: Shape; minimum?: number; maximum?: number; minItems?: number; maxItems?: number };

export const kinds: Record<string, string> = {
  "boxplot": "Boxplot",
  "button": "Button",
  "card": "Card",
  "chart": "Chart",
  "chips": "Chips",
  "choice": "Choice",
  "composer": "Composer",
  "config": "Form",
  "diagram": "Diagram",
  "diff": "Diff",
  "editor": "Editor",
  "form": "Form",
  "heat": "Heat",
  "hero": "Hero",
  "images": "Images",
  "import": "Import",
  "island": "Island",
  "lines": "Lines",
  "list": "List",
  "media": "Media",
  "message": "Message",
  "modal": "Modal",
  "nav": "Nav",
  "pages": "Pages",
  "plot": "Plot",
  "prose": "Prose",
  "row": "Row",
  "run": "Run",
  "scene": "Scene",
  "screen": "Screen",
  "secret": "Secret",
  "section": "Section",
  "sheet": "Modal",
  "sidebar": "Sidebar",
  "stat": "Stat",
  "steps": "Steps",
  "table": "Table",
  "text": "Text",
  "timeline": "Timeline",
  "toast": "Toast",
  "tool": "Tool",
  "web": "Web"
};

export const defs: Record<string, Shape> = {
  "Accept": {
    "anyOf": [
      {
        "enum": [
          "image",
          "pdf",
          "sheet"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Accessory": {
    "anyOf": [
      {
        "enum": [
          "chevron",
          "none"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Act": {
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "Align": {
    "anyOf": [
      {
        "enum": [
          "start",
          "end"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "AppBlock": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "type": {
        "not": {
          "enum": [
            "screen",
            "modal",
            "sheet",
            "section",
            "list",
            "row",
            "card",
            "choice",
            "form",
            "config",
            "secret",
            "run",
            "button",
            "chips",
            "stat",
            "text",
            "images",
            "web",
            "diff",
            "editor",
            "scene",
            "diagram",
            "composer",
            "lines",
            "prose",
            "hero",
            "media",
            "nav",
            "island",
            "table",
            "steps",
            "chart",
            "toast",
            "pages",
            "timeline",
            "import",
            "message",
            "tool",
            "sidebar",
            "boxplot",
            "heat",
            "plot"
          ]
        },
        "type": "string"
      }
    },
    "required": [
      "type"
    ],
    "type": "object"
  },
  "Attachment": {
    "properties": {
      "name": {
        "type": "string"
      },
      "src": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "$ref": "#/$defs/Tap"
      }
    },
    "required": [
      "name",
      "tap"
    ],
    "type": "object"
  },
  "AxisScale": {
    "anyOf": [
      {
        "enum": [
          "number",
          "time"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Band": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "header": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/SceneRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "type": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "id"
    ],
    "type": "object"
  },
  "Bar": {
    "properties": {
      "label": {
        "type": "string"
      },
      "sub": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "maximum": 255,
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "label",
      "value"
    ],
    "type": "object"
  },
  "Block": {
    "anyOf": [
      {
        "$ref": "#/$defs/Screen",
        "properties": {
          "type": {
            "const": "screen",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Modal",
        "properties": {
          "type": {
            "const": "modal",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Modal",
        "properties": {
          "type": {
            "const": "sheet",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Section",
        "properties": {
          "type": {
            "const": "section",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/List",
        "properties": {
          "type": {
            "const": "list",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Row",
        "properties": {
          "type": {
            "const": "row",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Card",
        "properties": {
          "type": {
            "const": "card",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Choice",
        "properties": {
          "type": {
            "const": "choice",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Form",
        "properties": {
          "type": {
            "const": "form",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Form",
        "properties": {
          "type": {
            "const": "config",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Secret",
        "properties": {
          "type": {
            "const": "secret",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Run",
        "properties": {
          "type": {
            "const": "run",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Button",
        "properties": {
          "type": {
            "const": "button",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Chips",
        "properties": {
          "type": {
            "const": "chips",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Stat",
        "properties": {
          "type": {
            "const": "stat",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Text",
        "properties": {
          "type": {
            "const": "text",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Images",
        "properties": {
          "type": {
            "const": "images",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Web",
        "properties": {
          "type": {
            "const": "web",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Diff",
        "properties": {
          "type": {
            "const": "diff",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Editor",
        "properties": {
          "type": {
            "const": "editor",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Scene",
        "properties": {
          "type": {
            "const": "scene",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Diagram",
        "properties": {
          "type": {
            "const": "diagram",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Composer",
        "properties": {
          "type": {
            "const": "composer",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Lines",
        "properties": {
          "type": {
            "const": "lines",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Prose",
        "properties": {
          "type": {
            "const": "prose",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Hero",
        "properties": {
          "type": {
            "const": "hero",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Media",
        "properties": {
          "type": {
            "const": "media",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Nav",
        "properties": {
          "type": {
            "const": "nav",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Island",
        "properties": {
          "type": {
            "const": "island",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Table",
        "properties": {
          "type": {
            "const": "table",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Steps",
        "properties": {
          "type": {
            "const": "steps",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Chart",
        "properties": {
          "type": {
            "const": "chart",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Toast",
        "properties": {
          "type": {
            "const": "toast",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Pages",
        "properties": {
          "type": {
            "const": "pages",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Timeline",
        "properties": {
          "type": {
            "const": "timeline",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Import",
        "properties": {
          "type": {
            "const": "import",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Message",
        "properties": {
          "type": {
            "const": "message",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Tool",
        "properties": {
          "type": {
            "const": "tool",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Sidebar",
        "properties": {
          "type": {
            "const": "sidebar",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Boxplot",
        "properties": {
          "type": {
            "const": "boxplot",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Heat",
        "properties": {
          "type": {
            "const": "heat",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Plot",
        "properties": {
          "type": {
            "const": "plot",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/AppBlock"
      }
    ]
  },
  "Bound": {
    "properties": {
      "get": {
        "type": "string"
      }
    },
    "required": [
      "get"
    ],
    "type": "object"
  },
  "Boxplot": {
    "additionalProperties": true,
    "properties": {
      "axis": {
        "type": "string"
      },
      "boxes": {
        "items": {
          "$ref": "#/$defs/PlotBox"
        },
        "type": "array"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "title",
      "axis",
      "boxes"
    ],
    "type": "object"
  },
  "BulkAction": {
    "properties": {
      "action": {
        "type": "string"
      },
      "bad": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "label"
    ],
    "type": "object"
  },
  "Button": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/ButtonStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "ButtonStyle": {
    "anyOf": [
      {
        "enum": [
          "primary",
          "plain",
          "destructive"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Card": {
    "additionalProperties": true,
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/Label"
          },
          {
            "type": "null"
          }
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "buttons": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "color": {
        "type": [
          "string",
          "null"
        ]
      },
      "fold": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fold"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "kind": {
        "anyOf": [
          {
            "$ref": "#/$defs/CardKind"
          },
          {
            "type": "null"
          }
        ]
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "meta": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      },
      "push": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "anyOf": [
          {
            "$ref": "#/$defs/Toned"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "CardKind": {
    "anyOf": [
      {
        "enum": [
          "ask",
          "run",
          "secret",
          "config",
          "proposal"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Cell": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/Label"
      }
    ]
  },
  "Chart": {
    "additionalProperties": true,
    "properties": {
      "chart": {
        "$ref": "#/$defs/ChartKind"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "format": {
        "anyOf": [
          {
            "$ref": "#/$defs/ChartFormat"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "lang": {
        "type": [
          "string",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "series": {
        "items": {
          "$ref": "#/$defs/Series"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "x": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "title",
      "chart",
      "x",
      "series"
    ],
    "type": "object"
  },
  "ChartFormat": {
    "anyOf": [
      {
        "enum": [
          "count",
          "thb",
          "thb_m",
          "percent"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "ChartKind": {
    "anyOf": [
      {
        "enum": [
          "bar",
          "stacked",
          "line",
          "combo",
          "donut"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Check": {
    "properties": {
      "ok": {
        "$ref": "#/$defs/Expr"
      },
      "say": {
        "type": "string"
      }
    },
    "required": [
      "ok",
      "say"
    ],
    "type": "object"
  },
  "ChipOption": {
    "properties": {
      "label": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    },
    "required": [
      "value",
      "label"
    ],
    "type": "object"
  },
  "Chips": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "multi": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "options": {
        "items": {
          "$ref": "#/$defs/ChipOption"
        },
        "type": "array"
      },
      "selected": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "options"
    ],
    "type": "object"
  },
  "Choice": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "default": {
        "anyOf": [
          {
            "$ref": "#/$defs/ChoiceDefault"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "options": {
        "items": {
          "$ref": "#/$defs/ChoiceOption"
        },
        "type": "array"
      },
      "other": {
        "anyOf": [
          {
            "$ref": "#/$defs/Other"
          },
          {
            "type": "null"
          }
        ]
      },
      "question": {
        "type": [
          "string",
          "null"
        ]
      },
      "recommended": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "action",
      "options"
    ],
    "type": "object"
  },
  "ChoiceDefault": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    },
    "required": [
      "value",
      "until"
    ],
    "type": "object"
  },
  "ChoiceOption": {
    "properties": {
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": "string"
      },
      "value": {
        "type": "string"
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "value",
      "label"
    ],
    "type": "object"
  },
  "Column": {
    "properties": {
      "align": {
        "anyOf": [
          {
            "$ref": "#/$defs/Align"
          },
          {
            "type": "null"
          }
        ]
      },
      "currency": {
        "type": [
          "string",
          "null"
        ]
      },
      "digits": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "edit": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "hide": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "kind": {
        "$ref": "#/$defs/ColumnKind"
      },
      "label": {
        "type": "string"
      },
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "phone": {
        "anyOf": [
          {
            "$ref": "#/$defs/PhonePart"
          },
          {
            "type": "null"
          }
        ]
      },
      "sort": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "total": {
        "anyOf": [
          {
            "$ref": "#/$defs/Total"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "width": {
        "maximum": 65535,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "label",
      "kind"
    ],
    "type": "object"
  },
  "ColumnKind": {
    "anyOf": [
      {
        "enum": [
          "text",
          "number",
          "money",
          "date",
          "tone",
          "bar"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Composer": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "acts": {
        "additionalProperties": {
          "type": "string"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "chips": {
        "items": {
          "$ref": "#/$defs/ComposerChip"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "queued": {
        "items": {
          "$ref": "#/$defs/Queued"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      },
      "working": {
        "anyOf": [
          {
            "$ref": "#/$defs/Working"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "action"
    ],
    "type": "object"
  },
  "ComposerChip": {
    "properties": {
      "all": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "cur": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "all"
    ],
    "type": "object"
  },
  "Confirm": {
    "properties": {
      "destructive": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "message": {
        "type": [
          "string",
          "null"
        ]
      },
      "ok": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Diagram": {
    "additionalProperties": true,
    "properties": {
      "counts": {
        "additionalProperties": {
          "type": "number"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "nodes": {
        "anyOf": [
          {
            "$ref": "#/$defs/Nodes"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "source": {
        "type": "string"
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "source"
    ],
    "type": "object"
  },
  "Diff": {
    "additionalProperties": true,
    "properties": {
      "file": {
        "type": "string"
      },
      "hunks": {
        "items": {
          "$ref": "#/$defs/Hunk"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "file",
      "hunks"
    ],
    "type": "object"
  },
  "Editor": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "errors": {
        "items": {
          "$ref": "#/$defs/LineError"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "first": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "text",
      "action"
    ],
    "type": "object"
  },
  "Era": {
    "anyOf": [
      {
        "enum": [
          "ce",
          "be"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "ExportFormat": {
    "anyOf": [
      {
        "enum": [
          "csv",
          "xlsx"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Expr": {
    "anyOf": [
      {
        "additionalProperties": false,
        "properties": {
          "get": {
            "type": "string"
          }
        },
        "required": [
          "get"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "not": {
            "$ref": "#/$defs/Expr"
          }
        },
        "required": [
          "not"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "all": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "all"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "any": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "any"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "eq": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "eq"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "lt": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "lt"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "len": {
            "$ref": "#/$defs/Expr"
          }
        },
        "required": [
          "len"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "has": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "has"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "is": {
            "$ref": "#/$defs/Match"
          }
        },
        "required": [
          "is"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "add": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "add"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "sub": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "sub"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "mul": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "mul"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "div": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "div"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "cat": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "cat"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "pick": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 3,
            "minItems": 3,
            "type": "array"
          }
        },
        "required": [
          "pick"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Lit"
      }
    ]
  },
  "Fallback": {
    "properties": {
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Field": {
    "anyOf": [
      {
        "$ref": "#/$defs/TextField",
        "properties": {
          "type": {
            "const": "text",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/ToggleField",
        "properties": {
          "type": {
            "const": "toggle",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/PickerField",
        "properties": {
          "type": {
            "const": "picker",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/SecretField",
        "properties": {
          "type": {
            "const": "secret",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/SearchField",
        "properties": {
          "type": {
            "const": "search",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/UploadField",
        "properties": {
          "type": {
            "const": "upload",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/ScanField",
        "properties": {
          "type": {
            "const": "scan",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/SliderField",
        "properties": {
          "type": {
            "const": "slider",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/OtherField"
      }
    ]
  },
  "FieldValue": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "type": "boolean"
      }
    ]
  },
  "Figure": {
    "properties": {
      "act": {
        "type": [
          "string",
          "null"
        ]
      },
      "avatar": {
        "type": [
          "string",
          "null"
        ]
      },
      "coat": {
        "type": [
          "string",
          "null"
        ]
      },
      "grow": {
        "type": [
          "string",
          "null"
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "issue": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "load": {
        "type": [
          "string",
          "null"
        ]
      },
      "moment": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "tool": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "FileLink": {
    "properties": {
      "name": {
        "type": "string"
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "src"
    ],
    "type": "object"
  },
  "FileRef": {
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      },
      "src": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id"
    ],
    "type": "object"
  },
  "Fold": {
    "properties": {
      "line": {
        "type": "string"
      },
      "main": {
        "anyOf": [
          {
            "$ref": "#/$defs/FoldMain"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "line"
    ],
    "type": "object"
  },
  "FoldMain": {
    "properties": {
      "action": {
        "type": "string"
      },
      "block": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label",
      "action"
    ],
    "type": "object"
  },
  "Form": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "fields": {
        "items": {
          "$ref": "#/$defs/Field"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "submit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "fields"
    ],
    "type": "object"
  },
  "Gesture": {
    "properties": {
      "action": {
        "type": "string"
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "name"
    ],
    "type": "object"
  },
  "Heat": {
    "additionalProperties": true,
    "properties": {
      "columns": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "edges": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatEdges"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "grid": {
        "items": {
          "$ref": "#/$defs/HeatRow"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "lang": {
        "type": [
          "string",
          "null"
        ]
      },
      "scale": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatScale"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatPick"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatTone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "columns",
      "grid"
    ],
    "type": "object"
  },
  "HeatCell": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "type": [
          "number",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "HeatEdges": {
    "anyOf": [
      {
        "enum": [
          "steps",
          "ends"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "HeatPick": {
    "properties": {
      "column": {
        "type": "string"
      },
      "row": {
        "type": "string"
      }
    },
    "required": [
      "row",
      "column"
    ],
    "type": "object"
  },
  "HeatRow": {
    "properties": {
      "cells": {
        "items": {
          "$ref": "#/$defs/HeatCell"
        },
        "type": "array"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "cells"
    ],
    "type": "object"
  },
  "HeatScale": {
    "properties": {
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "min": {
        "type": [
          "number",
          "null"
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "HeatTone": {
    "anyOf": [
      {
        "enum": [
          "info",
          "ok",
          "warn",
          "bad",
          "accent",
          "mute"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Hero": {
    "additionalProperties": true,
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "media": {
        "anyOf": [
          {
            "$ref": "#/$defs/Media"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Hunk": {
    "properties": {
      "at": {
        "type": "string"
      },
      "lines": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "at",
      "lines"
    ],
    "type": "object"
  },
  "Image": {
    "properties": {
      "alt": {
        "type": [
          "string",
          "null"
        ]
      },
      "caption": {
        "type": [
          "string",
          "null"
        ]
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "src"
    ],
    "type": "object"
  },
  "ImageSize": {
    "anyOf": [
      {
        "enum": [
          "small",
          "large"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Images": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/Image"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImageSize"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "items"
    ],
    "type": "object"
  },
  "Import": {
    "additionalProperties": true,
    "properties": {
      "accept": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/ImportColumn"
        },
        "type": "array"
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportDone"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "into": {
        "type": [
          "string",
          "null"
        ]
      },
      "mb": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "read": {
        "type": [
          "string",
          "null"
        ]
      },
      "refused": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "sheet": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportSheet"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "template": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title",
      "columns"
    ],
    "type": "object"
  },
  "ImportColumn": {
    "properties": {
      "key": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "required": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "type": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportType"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      }
    },
    "required": [
      "key",
      "label"
    ],
    "type": "object"
  },
  "ImportDone": {
    "properties": {
      "count": {
        "minimum": 0,
        "type": "integer"
      },
      "file": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "left": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "count"
    ],
    "type": "object"
  },
  "ImportFile": {
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "rows": {
        "minimum": 0,
        "type": "integer"
      },
      "sheet": {
        "type": [
          "string",
          "null"
        ]
      },
      "sheets": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "size": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "name",
      "rows"
    ],
    "type": "object"
  },
  "ImportRow": {
    "properties": {
      "bad": {
        "additionalProperties": {
          "type": "string"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "cells": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "n": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "n",
      "cells"
    ],
    "type": "object"
  },
  "ImportSheet": {
    "properties": {
      "bad": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "file": {
        "$ref": "#/$defs/ImportFile"
      },
      "headers": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "map": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": "array"
      }
    },
    "required": [
      "file",
      "headers",
      "map",
      "rows"
    ],
    "type": "object"
  },
  "ImportType": {
    "anyOf": [
      {
        "enum": [
          "text",
          "number",
          "money",
          "date",
          "choice"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Island": {
    "additionalProperties": true,
    "properties": {
      "events": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "fallback": {
        "$ref": "#/$defs/Fallback"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "props": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "anyOf": [
          {
            "$ref": "#/$defs/IslandSize"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "fallback"
    ],
    "type": "object"
  },
  "IslandSize": {
    "properties": {
      "aspect": {
        "type": [
          "string",
          "null"
        ]
      },
      "height": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "width": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Keyboard": {
    "anyOf": [
      {
        "enum": [
          "default",
          "url",
          "number"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Label": {
    "properties": {
      "text": {
        "$ref": "#/$defs/Shown"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "text"
    ],
    "type": "object"
  },
  "Lane": {
    "properties": {
      "id": {
        "type": "string"
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "stage": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "$ref": "#/$defs/LaneState"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tool": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "title",
      "state"
    ],
    "type": "object"
  },
  "LaneState": {
    "anyOf": [
      {
        "enum": [
          "working",
          "needs",
          "done",
          "idle",
          "fail",
          "merged"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Lang": {
    "anyOf": [
      {
        "enum": [
          "en",
          "th"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "LineError": {
    "properties": {
      "line": {
        "type": "integer"
      },
      "message": {
        "type": "string"
      }
    },
    "required": [
      "line",
      "message"
    ],
    "type": "object"
  },
  "LineItem": {
    "properties": {
      "id": {
        "type": "string"
      },
      "values": {
        "additionalProperties": true,
        "type": "object"
      }
    },
    "required": [
      "id",
      "values"
    ],
    "type": "object"
  },
  "Lines": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "add": {
        "type": [
          "string",
          "null"
        ]
      },
      "balance": {
        "items": {
          "type": "string"
        },
        "maxItems": 2,
        "minItems": 2,
        "type": [
          "array",
          "null"
        ]
      },
      "calc": {
        "additionalProperties": {
          "$ref": "#/$defs/Expr"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/Field"
        },
        "type": "array"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "errors": {
        "items": {
          "$ref": "#/$defs/RowError"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/LineItem"
        },
        "type": "array"
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "min": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "scale": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "submit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "sum": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "columns",
      "items"
    ],
    "type": "object"
  },
  "Link": {
    "properties": {
      "label": {
        "type": "string"
      },
      "tap": {
        "$ref": "#/$defs/Tap"
      }
    },
    "required": [
      "label",
      "tap"
    ],
    "type": "object"
  },
  "List": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "anyOf": [
          {
            "$ref": "#/$defs/More"
          },
          {
            "type": "null"
          }
        ]
      },
      "reorder": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "rows"
    ],
    "type": "object"
  },
  "Lit": {
    "anyOf": [
      {
        "type": "null"
      },
      {
        "type": "boolean"
      },
      {
        "type": "number"
      },
      {
        "type": "string"
      }
    ]
  },
  "Load": {
    "anyOf": [
      {
        "enum": [
          "calm",
          "busy",
          "held"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Locale": {
    "properties": {
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "lang": {
        "anyOf": [
          {
            "$ref": "#/$defs/Lang"
          },
          {
            "type": "null"
          }
        ]
      },
      "today": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Mark": {
    "properties": {
      "at": {
        "items": {
          "type": "number"
        },
        "type": "array"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "group": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "kind": {
        "$ref": "#/$defs/MarkKind"
      },
      "path": {
        "items": {
          "items": {
            "type": "number"
          },
          "type": "array"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "text": {
        "type": [
          "string",
          "null"
        ]
      },
      "to": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "kind",
      "at"
    ],
    "type": "object"
  },
  "MarkKind": {
    "anyOf": [
      {
        "enum": [
          "arrow",
          "box",
          "ellipse",
          "text",
          "pin",
          "highlight",
          "line"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Match": {
    "properties": {
      "pattern": {
        "$ref": "#/$defs/Pattern"
      },
      "value": {
        "$ref": "#/$defs/Expr"
      }
    },
    "required": [
      "value",
      "pattern"
    ],
    "type": "object"
  },
  "Media": {
    "additionalProperties": true,
    "properties": {
      "alt": {
        "type": "string"
      },
      "caption": {
        "type": [
          "string",
          "null"
        ]
      },
      "draw": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "marks": {
        "items": {
          "$ref": "#/$defs/Mark"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "poster": {
        "type": [
          "string",
          "null"
        ]
      },
      "remove": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "src": {
        "type": "string"
      },
      "stretch": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "tools": {
        "items": {
          "$ref": "#/$defs/MarkKind"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "video": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "width": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "src",
      "alt",
      "width",
      "height"
    ],
    "type": "object"
  },
  "Message": {
    "additionalProperties": true,
    "properties": {
      "avatar": {
        "type": [
          "string",
          "null"
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "files": {
        "items": {
          "$ref": "#/$defs/Attachment"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "role": {
        "$ref": "#/$defs/Role"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "time": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "role",
      "name"
    ],
    "type": "object"
  },
  "Modal": {
    "additionalProperties": true,
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "cancel": {
        "type": [
          "string",
          "null"
        ]
      },
      "destructive": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "locale": {
        "anyOf": [
          {
            "$ref": "#/$defs/Locale"
          },
          {
            "type": "null"
          }
        ]
      },
      "message": {
        "type": [
          "string",
          "null"
        ]
      },
      "ok": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "variant": {
        "anyOf": [
          {
            "$ref": "#/$defs/ModalVariant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "blocks"
    ],
    "type": "object"
  },
  "ModalVariant": {
    "anyOf": [
      {
        "enum": [
          "dialog",
          "alert",
          "tool"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "More": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/Page"
      }
    ]
  },
  "Nav": {
    "additionalProperties": true,
    "properties": {
      "brand": {
        "anyOf": [
          {
            "$ref": "#/$defs/NavLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "links": {
        "items": {
          "$ref": "#/$defs/NavLink"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "links"
    ],
    "type": "object"
  },
  "NavLink": {
    "properties": {
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": "string"
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "label",
      "href"
    ],
    "type": "object"
  },
  "Node": {
    "properties": {
      "coat": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "limit": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Nodes": {
    "anyOf": [
      {
        "items": {
          "$ref": "#/$defs/Node"
        },
        "type": "array"
      },
      {
        "additionalProperties": {
          "$ref": "#/$defs/Node"
        },
        "type": "object"
      }
    ]
  },
  "Other": {
    "properties": {
      "for": {
        "type": [
          "string",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "OtherField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "type": {
        "type": "string"
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "type"
    ],
    "type": "object"
  },
  "Page": {
    "properties": {
      "action": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "cursor"
    ],
    "type": "object"
  },
  "PageImage": {
    "properties": {
      "alt": {
        "type": "string"
      },
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "src": {
        "type": "string"
      },
      "width": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "src",
      "alt",
      "width",
      "height"
    ],
    "type": "object"
  },
  "Pages": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "file": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "note": {
        "type": [
          "string",
          "null"
        ]
      },
      "pages": {
        "items": {
          "$ref": "#/$defs/PageImage"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "pages"
    ],
    "type": "object"
  },
  "Part": {
    "oneOf": [
      {
        "properties": {
          "level": {
            "maximum": 255,
            "minimum": 0,
            "type": "integer"
          },
          "part": {
            "const": "heading",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "level",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "para",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "items": {
            "items": {
              "items": {
                "$ref": "#/$defs/Span"
              },
              "type": "array"
            },
            "type": "array"
          },
          "ordered": {
            "type": "boolean"
          },
          "part": {
            "const": "list",
            "type": "string"
          }
        },
        "required": [
          "part",
          "ordered",
          "items"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "quote",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "lang": {
            "type": [
              "string",
              "null"
            ]
          },
          "part": {
            "const": "code",
            "type": "string"
          },
          "text": {
            "type": "string"
          }
        },
        "required": [
          "part",
          "text"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "rule",
            "type": "string"
          }
        },
        "required": [
          "part"
        ],
        "type": "object"
      }
    ]
  },
  "Pattern": {
    "anyOf": [
      {
        "enum": [
          "filled",
          "email",
          "url",
          "number"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Peak": {
    "properties": {
      "label": {
        "type": "string"
      },
      "y": {
        "type": "number"
      }
    },
    "required": [
      "y",
      "label"
    ],
    "type": "object"
  },
  "Pending": {
    "properties": {
      "count": {
        "type": "string"
      },
      "discard": {
        "$ref": "#/$defs/Tap"
      },
      "review": {
        "$ref": "#/$defs/Tap"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "count",
      "text",
      "discard",
      "review"
    ],
    "type": "object"
  },
  "PhonePart": {
    "anyOf": [
      {
        "enum": [
          "title",
          "tag",
          "value",
          "meta",
          "hide"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "PickerField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "options": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Plot": {
    "additionalProperties": true,
    "properties": {
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "peak": {
        "anyOf": [
          {
            "$ref": "#/$defs/Peak"
          },
          {
            "type": "null"
          }
        ]
      },
      "series": {
        "items": {
          "$ref": "#/$defs/Trace"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "target": {
        "anyOf": [
          {
            "$ref": "#/$defs/Target"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "window": {
        "type": [
          "number",
          "null"
        ]
      },
      "x": {
        "anyOf": [
          {
            "$ref": "#/$defs/PlotAxis"
          },
          {
            "type": "null"
          }
        ]
      },
      "y": {
        "anyOf": [
          {
            "$ref": "#/$defs/PlotAxis"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "series"
    ],
    "type": "object"
  },
  "PlotAxis": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "min": {
        "type": [
          "number",
          "null"
        ]
      },
      "scale": {
        "anyOf": [
          {
            "$ref": "#/$defs/AxisScale"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "PlotBox": {
    "properties": {
      "max": {
        "type": "number"
      },
      "median": {
        "type": "number"
      },
      "min": {
        "type": "number"
      },
      "name": {
        "type": "string"
      },
      "outliers": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "q1": {
        "type": "number"
      },
      "q3": {
        "type": "number"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "min",
      "q1",
      "median",
      "q3",
      "max"
    ],
    "type": "object"
  },
  "Prose": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "parts": {
        "items": {
          "$ref": "#/$defs/Part"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "streaming": {
        "type": [
          "boolean",
          "null"
        ]
      }
    },
    "required": [
      "parts"
    ],
    "type": "object"
  },
  "Queued": {
    "properties": {
      "q": {
        "minimum": 0,
        "type": "integer"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "q",
      "text"
    ],
    "type": "object"
  },
  "Role": {
    "anyOf": [
      {
        "enum": [
          "agent",
          "owner",
          "system"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Round": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "lane": {
        "anyOf": [
          {
            "$ref": "#/$defs/RoundLane"
          },
          {
            "type": "null"
          }
        ]
      },
      "links": {
        "items": {
          "$ref": "#/$defs/Link"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "$ref": "#/$defs/LaneState"
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "name",
      "state"
    ],
    "type": "object"
  },
  "RoundLane": {
    "properties": {
      "harness": {
        "type": [
          "string",
          "null"
        ]
      },
      "host": {
        "type": [
          "string",
          "null"
        ]
      },
      "lines": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "model": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Row": {
    "additionalProperties": true,
    "properties": {
      "accessory": {
        "anyOf": [
          {
            "$ref": "#/$defs/Accessory"
          },
          {
            "type": "null"
          }
        ]
      },
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/Label"
          },
          {
            "type": "null"
          }
        ]
      },
      "button": {
        "anyOf": [
          {
            "$ref": "#/$defs/Act"
          },
          {
            "type": "null"
          }
        ]
      },
      "changed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "figure": {
        "anyOf": [
          {
            "$ref": "#/$defs/Figure"
          },
          {
            "type": "null"
          }
        ]
      },
      "handle": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "indent": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "lifted": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "rounds": {
        "items": {
          "$ref": "#/$defs/Round"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sticky": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/RowStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "anyOf": [
          {
            "$ref": "#/$defs/Toned"
          },
          {
            "type": "null"
          }
        ]
      },
      "swipe": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "RowError": {
    "properties": {
      "message": {
        "type": "string"
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      },
      "row": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "message"
    ],
    "type": "object"
  },
  "RowStyle": {
    "anyOf": [
      {
        "enum": [
          "link",
          "destructive"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Run": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "command": {
        "type": "string"
      },
      "dir": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "sha": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "touches": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "action",
      "command",
      "sha"
    ],
    "type": "object"
  },
  "ScanField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "file": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileRef"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Scene": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "lanes": {
        "items": {
          "$ref": "#/$defs/Lane"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "load": {
        "anyOf": [
          {
            "$ref": "#/$defs/Load"
          },
          {
            "type": "null"
          }
        ]
      },
      "repos": {
        "items": {
          "$ref": "#/$defs/SceneRepo"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "weather": {
        "anyOf": [
          {
            "$ref": "#/$defs/Weather"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "SceneRepo": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Band"
        },
        "type": "array"
      },
      "color": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "blocks"
    ],
    "type": "object"
  },
  "SceneRow": {
    "properties": {
      "blocked_by": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "figure": {
        "anyOf": [
          {
            "$ref": "#/$defs/Figure"
          },
          {
            "type": "null"
          }
        ]
      },
      "host": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "needs": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "title"
    ],
    "type": "object"
  },
  "Screen": {
    "additionalProperties": true,
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "back": {
        "type": [
          "string",
          "null"
        ]
      },
      "badge": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "focus": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "large": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "locale": {
        "anyOf": [
          {
            "$ref": "#/$defs/Locale"
          },
          {
            "type": "null"
          }
        ]
      },
      "pending": {
        "anyOf": [
          {
            "$ref": "#/$defs/Pending"
          },
          {
            "type": "null"
          }
        ]
      },
      "personas": {
        "items": {
          "additionalProperties": true,
          "type": "object"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "refresh": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sites": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "source": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "additionalProperties": {
          "$ref": "#/$defs/Lit"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "stream": {
        "type": [
          "string",
          "null"
        ]
      },
      "threads": {
        "items": {
          "additionalProperties": true,
          "type": "object"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "url": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "SearchField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "filters": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Secret": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "action"
    ],
    "type": "object"
  },
  "SecretField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Section": {
    "additionalProperties": true,
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "footer": {
        "type": [
          "string",
          "null"
        ]
      },
      "header": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "blocks"
    ],
    "type": "object"
  },
  "Series": {
    "properties": {
      "as": {
        "anyOf": [
          {
            "$ref": "#/$defs/SeriesMark"
          },
          {
            "type": "null"
          }
        ]
      },
      "dash": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "step": {
        "type": [
          "number",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "items": {
          "type": "number"
        },
        "type": "array"
      }
    },
    "required": [
      "name",
      "values"
    ],
    "type": "object"
  },
  "SeriesMark": {
    "anyOf": [
      {
        "enum": [
          "bar",
          "line"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "SetState": {
    "properties": {
      "key": {
        "type": "string"
      },
      "to": {
        "$ref": "#/$defs/Expr"
      }
    },
    "required": [
      "key",
      "to"
    ],
    "type": "object"
  },
  "Shown": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/Bound"
      },
      {
        "$ref": "#/$defs/Time"
      }
    ]
  },
  "SideBadge": {
    "properties": {
      "count": {
        "minimum": 0,
        "type": "integer"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "count"
    ],
    "type": "object"
  },
  "SideGroup": {
    "properties": {
      "links": {
        "items": {
          "$ref": "#/$defs/SideItem"
        },
        "type": "array"
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "links"
    ],
    "type": "object"
  },
  "SideItem": {
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideBadge"
          },
          {
            "type": "null"
          }
        ]
      },
      "children": {
        "items": {
          "$ref": "#/$defs/SideLink"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": [
          "string",
          "null"
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "SideLink": {
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideBadge"
          },
          {
            "type": "null"
          }
        ]
      },
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": "string"
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "label",
      "href"
    ],
    "type": "object"
  },
  "Sidebar": {
    "additionalProperties": true,
    "properties": {
      "brand": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "footer": {
        "items": {
          "$ref": "#/$defs/SideLink"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "groups": {
        "items": {
          "$ref": "#/$defs/SideGroup"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "label",
      "groups"
    ],
    "type": "object"
  },
  "Sky": {
    "anyOf": [
      {
        "enum": [
          "clear",
          "windy",
          "fog",
          "storm"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "SliderField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "type": "number"
      },
      "min": {
        "type": "number"
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "step": {
        "type": [
          "number",
          "null"
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "type": [
          "number",
          "null"
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "min",
      "max"
    ],
    "type": "object"
  },
  "SortDir": {
    "anyOf": [
      {
        "enum": [
          "asc",
          "desc"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Span": {
    "properties": {
      "bold": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "code": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "italic": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "link": {
        "type": [
          "string",
          "null"
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "text"
    ],
    "type": "object"
  },
  "Stage": {
    "properties": {
      "id": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "sub": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "label"
    ],
    "type": "object"
  },
  "Stat": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/Tile"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "spark": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "Steps": {
    "additionalProperties": true,
    "properties": {
      "bars": {
        "items": {
          "$ref": "#/$defs/Bar"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "current": {
        "type": [
          "string",
          "null"
        ]
      },
      "done": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "steps": {
        "items": {
          "$ref": "#/$defs/Stage"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Submit": {
    "properties": {
      "action": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "off": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label",
      "action"
    ],
    "type": "object"
  },
  "Table": {
    "additionalProperties": true,
    "properties": {
      "calc": {
        "additionalProperties": {
          "$ref": "#/$defs/Expr"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/Column"
        },
        "type": "array"
      },
      "edit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "export": {
        "items": {
          "$ref": "#/$defs/ExportFormat"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "filter": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "anyOf": [
          {
            "$ref": "#/$defs/Page"
          },
          {
            "type": "null"
          }
        ]
      },
      "reorder": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/TableRow"
        },
        "type": "array"
      },
      "select": {
        "anyOf": [
          {
            "$ref": "#/$defs/TableSelect"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sort": {
        "anyOf": [
          {
            "$ref": "#/$defs/TableSort"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "columns",
      "rows"
    ],
    "type": "object"
  },
  "TableRow": {
    "properties": {
      "cells": {
        "additionalProperties": {
          "$ref": "#/$defs/Cell"
        },
        "type": "object"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "group": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "cells"
    ],
    "type": "object"
  },
  "TableSelect": {
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/BulkAction"
        },
        "type": "array"
      }
    },
    "required": [
      "actions"
    ],
    "type": "object"
  },
  "TableSort": {
    "properties": {
      "by": {
        "type": "string"
      },
      "dir": {
        "$ref": "#/$defs/SortDir"
      }
    },
    "required": [
      "by",
      "dir"
    ],
    "type": "object"
  },
  "Tap": {
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "copy": {
        "type": [
          "string",
          "null"
        ]
      },
      "focus": {
        "type": [
          "string",
          "null"
        ]
      },
      "keep": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "open": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "items": {
          "$ref": "#/$defs/SetState"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "sheet": {
        "type": [
          "string",
          "null"
        ]
      },
      "thread": {
        "type": [
          "string",
          "null"
        ]
      },
      "url": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Target": {
    "properties": {
      "max": {
        "type": "number"
      },
      "min": {
        "type": "number"
      }
    },
    "required": [
      "min",
      "max"
    ],
    "type": "object"
  },
  "Text": {
    "additionalProperties": true,
    "properties": {
      "center": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "font": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "markdown": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "type": [
          "number",
          "null"
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/TextStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "text": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "top": {
        "type": [
          "number",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      },
      "weight": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "TextField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "keyboard": {
        "anyOf": [
          {
            "$ref": "#/$defs/Keyboard"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "TextStyle": {
    "anyOf": [
      {
        "enum": [
          "body",
          "footnote"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Tile": {
    "properties": {
      "label": {
        "type": "string"
      },
      "spark": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "$ref": "#/$defs/Shown"
      }
    },
    "required": [
      "label",
      "value"
    ],
    "type": "object"
  },
  "Time": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "TimeBar": {
    "properties": {
      "end": {
        "type": "string"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "progress": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "start": {
        "type": "string"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "start",
      "end"
    ],
    "type": "object"
  },
  "TimeRow": {
    "properties": {
      "bars": {
        "items": {
          "$ref": "#/$defs/TimeBar"
        },
        "type": "array"
      },
      "id": {
        "type": "string"
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "bars"
    ],
    "type": "object"
  },
  "Timeline": {
    "additionalProperties": true,
    "properties": {
      "draw": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "from": {
        "type": "string"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "off": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "stretch": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "to": {
        "type": "string"
      },
      "tracks": {
        "items": {
          "$ref": "#/$defs/TimeRow"
        },
        "type": "array"
      }
    },
    "required": [
      "from",
      "to",
      "tracks"
    ],
    "type": "object"
  },
  "Toast": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "undo": {
        "anyOf": [
          {
            "$ref": "#/$defs/Undo"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "ToggleField": {
    "additionalProperties": true,
    "properties": {
      "as": {
        "anyOf": [
          {
            "$ref": "#/$defs/ToggleLook"
          },
          {
            "type": "null"
          }
        ]
      },
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "ToggleLook": {
    "anyOf": [
      {
        "enum": [
          "switch",
          "check"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Tone": {
    "anyOf": [
      {
        "enum": [
          "ok",
          "warn",
          "bad",
          "info",
          "mute",
          "accent",
          "working",
          "needs",
          "done",
          "fail",
          "idle"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Toned": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/Label"
      }
    ]
  },
  "Tool": {
    "additionalProperties": true,
    "properties": {
      "body": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "state": {
        "$ref": "#/$defs/ToolState"
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "state"
    ],
    "type": "object"
  },
  "ToolState": {
    "anyOf": [
      {
        "enum": [
          "running",
          "done",
          "failed"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Total": {
    "anyOf": [
      {
        "enum": [
          "sum",
          "avg",
          "count"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Trace": {
    "properties": {
      "name": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "x": {
        "items": {
          "type": "number"
        },
        "type": "array"
      },
      "y": {
        "items": {
          "type": "number"
        },
        "type": "array"
      }
    },
    "required": [
      "name",
      "x",
      "y"
    ],
    "type": "object"
  },
  "Undo": {
    "properties": {
      "action": {
        "type": "string"
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "action"
    ],
    "type": "object"
  },
  "UploadField": {
    "additionalProperties": true,
    "properties": {
      "accept": {
        "items": {
          "$ref": "#/$defs/Accept"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "capture": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "files": {
        "items": {
          "$ref": "#/$defs/FileRef"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "many": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "mb": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Weather": {
    "properties": {
      "fog": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "line": {
        "type": [
          "string",
          "null"
        ]
      },
      "sky": {
        "$ref": "#/$defs/Sky"
      },
      "storm": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "wind": {
        "type": [
          "number",
          "null"
        ]
      }
    },
    "required": [
      "sky"
    ],
    "type": "object"
  },
  "Web": {
    "additionalProperties": true,
    "properties": {
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "src",
      "height"
    ],
    "type": "object"
  },
  "Working": {
    "properties": {
      "since": {
        "type": "string"
      }
    },
    "required": [
      "since"
    ],
    "type": "object"
  }
};
