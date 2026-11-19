import type { Block, Button, Card, Chart, Chips, Choice, Composer, Diagram, Diff, Editor, Expr, Form, Hero, Images, Island, Kind, Lines, List, Match, Media, Nav, Prose, Row, Run, Scene, Screen, Secret, Section, Sheet, Stat, Steps, Table, Text, Toast, Web } from "./types.ts";

export type Of<K extends Kind> = Extract<Block, { type: K }>;

export const screen = (fields: Screen): Of<"screen"> => ({ type: "screen", ...fields });
export const sheet = (fields: Sheet): Of<"sheet"> => ({ type: "sheet", ...fields });
export const section = (fields: Section): Of<"section"> => ({ type: "section", ...fields });
export const list = (fields: List): Of<"list"> => ({ type: "list", ...fields });
export const row = (fields: Row): Of<"row"> => ({ type: "row", ...fields });
export const card = (fields: Card): Of<"card"> => ({ type: "card", ...fields });
export const choice = (fields: Choice): Of<"choice"> => ({ type: "choice", ...fields });
export const form = (fields: Form): Of<"form"> => ({ type: "form", ...fields });
export const config = (fields: Form): Of<"config"> => ({ type: "config", ...fields });
export const secret = (fields: Secret): Of<"secret"> => ({ type: "secret", ...fields });
export const run = (fields: Run): Of<"run"> => ({ type: "run", ...fields });
export const button = (fields: Button): Of<"button"> => ({ type: "button", ...fields });
export const chips = (fields: Chips): Of<"chips"> => ({ type: "chips", ...fields });
export const stat = (fields: Stat): Of<"stat"> => ({ type: "stat", ...fields });
export const text = (fields: Text): Of<"text"> => ({ type: "text", ...fields });
export const images = (fields: Images): Of<"images"> => ({ type: "images", ...fields });
export const web = (fields: Web): Of<"web"> => ({ type: "web", ...fields });
export const diff = (fields: Diff): Of<"diff"> => ({ type: "diff", ...fields });
export const editor = (fields: Editor): Of<"editor"> => ({ type: "editor", ...fields });
export const scene = (fields: Scene): Of<"scene"> => ({ type: "scene", ...fields });
export const diagram = (fields: Diagram): Of<"diagram"> => ({ type: "diagram", ...fields });
export const composer = (fields: Composer): Of<"composer"> => ({ type: "composer", ...fields });
export const lines = (fields: Lines): Of<"lines"> => ({ type: "lines", ...fields });
export const prose = (fields: Prose): Of<"prose"> => ({ type: "prose", ...fields });
export const hero = (fields: Hero): Of<"hero"> => ({ type: "hero", ...fields });
export const media = (fields: Media): Of<"media"> => ({ type: "media", ...fields });
export const nav = (fields: Nav): Of<"nav"> => ({ type: "nav", ...fields });
export const island = (fields: Island): Of<"island"> => ({ type: "island", ...fields });
export const table = (fields: Table): Of<"table"> => ({ type: "table", ...fields });
export const steps = (fields: Steps): Of<"steps"> => ({ type: "steps", ...fields });
export const chart = (fields: Chart): Of<"chart"> => ({ type: "chart", ...fields });
export const toast = (fields: Toast): Of<"toast"> => ({ type: "toast", ...fields });

export const expr = {
  get: (v: string): Expr => ({ get: v }),
  not: (v: Expr): Expr => ({ not: v }),
  all: (...v: Expr[]): Expr => ({ all: v }),
  any: (...v: Expr[]): Expr => ({ any: v }),
  eq: (...v: Expr[]): Expr => ({ eq: v }),
  lt: (...v: Expr[]): Expr => ({ lt: v }),
  len: (v: Expr): Expr => ({ len: v }),
  has: (...v: Expr[]): Expr => ({ has: v }),
  is: (v: Match): Expr => ({ is: v }),
  add: (...v: Expr[]): Expr => ({ add: v }),
  sub: (...v: Expr[]): Expr => ({ sub: v }),
  mul: (...v: Expr[]): Expr => ({ mul: v }),
  div: (...v: Expr[]): Expr => ({ div: v }),
  cat: (...v: Expr[]): Expr => ({ cat: v }),
  pick: (...v: Expr[]): Expr => ({ pick: v }),
};
