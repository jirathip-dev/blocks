export type Fault = { fault: "twice"; at: string[]; id: string } | { fault: "act-twice"; action: string; at: string[]; block: string } | { fault: "unnamed"; kind: string } | { fault: "unknown"; kind: string } | { fault: "shape"; kind: string; why: string } | { fault: "extra"; field: string; kind: string } | { fault: "clash"; kind: string } | { fault: "bare"; id: string; kind: string } | { fault: "state"; key: string } | { fault: "link"; at: string; url: string };

export type Shape = boolean | { type?: string | string[]; $ref?: string; properties?: Record<string, Shape>; required?: string[]; anyOf?: Shape[]; oneOf?: Shape[]; items?: Shape; additionalProperties?: Shape; const?: unknown; enum?: unknown[]; not?: Shape; minimum?: number; maximum?: number; minItems?: number; maxItems?: number };

export const kinds: Record<string, string> = {
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
  "hero": "Hero",
  "images": "Images",
  "island": "Island",
  "lines": "Lines",
  "list": "List",
  "media": "Media",
  "nav": "Nav",
  "prose": "Prose",
  "row": "Row",
  "run": "Run",
  "scene": "Scene",
  "screen": "Screen",
  "secret": "Secret",
  "section": "Section",
  "sheet": "Sheet",
  "stat": "Stat",
  "steps": "Steps",
  "table": "Table",
  "text": "Text",
  "timeline": "Timeline",
  "toast": "Toast",
  "web": "Web"
};

export const defs: Record<string, Shape> = {
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
            "timeline"
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
        "$ref": "#/$defs/Sheet",
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
      "options": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
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
      "type": {
        "$ref": "#/$defs/FieldKind"
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
      "type",
      "name"
    ],
    "type": "object"
  },
  "FieldKind": {
    "anyOf": [
      {
        "enum": [
          "text",
          "toggle",
          "picker",
          "secret"
        ],
        "type": "string"
      },
      {
        "type": "string"
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
        "type": [
          "string",
          "null"
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
    "required": [
      "title"
    ],
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
  "Sheet": {
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
      }
    },
    "required": [
      "title",
      "blocks"
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
      "columns": {
        "items": {
          "$ref": "#/$defs/Column"
        },
        "type": "array"
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
