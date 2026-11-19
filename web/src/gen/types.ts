export const schemaVersion = 2;

export type Frame = { from?: number | null; k: string; ops?: Op[] | null; rev: number; screen?: Block | null };

export type Accessory = "chevron" | "none";

export type Act = { action?: string | null; confirm?: Confirm | null; enabled?: Expr | null; icon?: string | null; label: string; menu?: Act[] | null; tap?: Tap | null; tone?: Tone | null; values?: Record<string, unknown> | null };

export type Action = { action: string; block?: string | null; screen: string; values?: Record<string, unknown> | null };

export type Align = "start" | "end";

export type Answer = { close?: boolean | null; open?: string | null; ops?: Op[] | null; toast?: Toast | null };

export type AppBlock = { fallback?: Fallback | null; id?: string | null; type: string };

export type Bar = { label: string; sub?: string | null; tone?: Tone | null; value: number };

export type Block = ({ type: "screen" } & Screen) | ({ type: "sheet" } & Sheet) | ({ type: "section" } & Section) | ({ type: "list" } & List) | ({ type: "row" } & Row) | ({ type: "card" } & Card) | ({ type: "choice" } & Choice) | ({ type: "form" } & Form) | ({ type: "config" } & Form) | ({ type: "secret" } & Secret) | ({ type: "run" } & Run) | ({ type: "button" } & Button) | ({ type: "chips" } & Chips) | ({ type: "stat" } & Stat) | ({ type: "text" } & Text) | ({ type: "images" } & Images) | ({ type: "web" } & Web) | ({ type: "diff" } & Diff) | ({ type: "editor" } & Editor) | ({ type: "scene" } & Scene) | ({ type: "diagram" } & Diagram) | ({ type: "composer" } & Composer) | ({ type: "lines" } & Lines) | ({ type: "prose" } & Prose) | ({ type: "hero" } & Hero) | ({ type: "media" } & Media) | ({ type: "nav" } & Nav) | ({ type: "island" } & Island) | ({ type: "table" } & Table) | ({ type: "steps" } & Steps) | ({ type: "toast" } & Toast) | (AppBlock & { [key: string]: unknown });

export type Bound = { get: string };

export type BulkAction = { action: string; bad?: boolean | null; label: string };

export type Button = { action?: string | null; confirm?: Confirm | null; enabled?: Expr | null; id?: string | null; label: string; show?: Expr | null; style?: ButtonStyle | null; tap?: Tap | null; values?: Record<string, unknown> | null };

export type ButtonStyle = "primary" | "plain" | "destructive";

export type Bye = { why: Why };

export type Card = { badge?: Label | null; blocks?: Block[] | null; buttons?: Block[] | null; fold?: Fold | null; id?: string | null; kind?: CardKind | null; menu?: Act[] | null; meta?: string | null; push?: boolean | null; show?: Expr | null; subtitle?: string | null; tap?: Tap | null; title?: string | null; tone?: Tone | null };

export type CardKind = "ask" | "run" | "secret" | "config" | "proposal";

export type Cell = string | number | Label;

export type Check = { ok: Expr; say: string };

export type Child = Block | Lane | Round | TableRow;

export type ChipOption = { label: string; value: string };

export type Chips = { action?: string | null; id?: string | null; multi?: boolean | null; name: string; options: ChipOption[]; selected?: string[] | null; show?: Expr | null };

export type Choice = { action: string; default?: ChoiceDefault | null; id?: string | null; options: ChoiceOption[]; other?: Other | null; question?: string | null; recommended?: string | null; show?: Expr | null; values?: Record<string, unknown> | null };

export type ChoiceDefault = { label?: string | null; until: string; value: string };

export type ChoiceOption = { confirm?: Confirm | null; label: string; value: string; values?: Record<string, unknown> | null };

export type Column = { align?: Align | null; currency?: string | null; digits?: number | null; era?: Era | null; hide?: boolean | null; id: string; kind: ColumnKind; label: string; max?: number | null; phone?: PhonePart | null; sort?: boolean | null; tone?: Tone | null; total?: Total | null; unit?: string | null; width?: number | null };

export type ColumnKind = "text" | "number" | "money" | "date" | "tone" | "bar";

export type Composer = { action: string; acts?: Record<string, string> | null; chips?: ComposerChip[] | null; id?: string | null; label?: string | null; placeholder?: string | null; queued?: Queued[] | null; show?: Expr | null; values?: Record<string, unknown> | null; working?: Working | null };

export type ComposerChip = { all: string[]; cur?: string | null; name: string };

export type Confirm = { destructive?: boolean | null; message?: string | null; ok?: string | null; title: string };

export type Diagram = { counts?: Record<string, number> | null; id?: string | null; nodes?: Record<string, Node> | null; selected?: string | null; show?: Expr | null; source: string; title?: string | null };

export type Diff = { file: string; hunks: Hunk[]; id?: string | null; show?: Expr | null; summary?: string | null };

export type Editor = { action: string; errors?: LineError[] | null; first?: number | null; id?: string | null; name: string; show?: Expr | null; text: string };

export type Era = "be";

export type ExportFormat = "csv" | "xlsx";

export type Expr = { get: string } | { not: Expr } | { all: Expr[] } | { any: Expr[] } | { eq: Expr[] } | { lt: Expr[] } | { len: Expr } | { has: Expr[] } | { is: Match } | { add: Expr[] } | { sub: Expr[] } | { mul: Expr[] } | { div: Expr[] } | { cat: Expr[] } | { pick: Expr[] } | Lit;

export type Fallback = { subtitle?: string | null; tap?: Tap | null; title: string };

export type Field = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; keyboard?: Keyboard | null; label?: string | null; name: string; open?: boolean | null; options?: string[] | null; placeholder?: string | null; set?: boolean | null; show?: Expr | null; type: FieldKind; value?: FieldValue | null; was?: string | null };

export type FieldKind = "text" | "toggle" | "picker" | "secret";

export type FieldValue = string | number | boolean;

export type Figure = { avatar?: string | null; coat?: string | null; grow?: string | null; icon?: string | null; state?: Tone | null; tool?: string | null };

export type Finding = { at: string; file: string; fix: string; line?: number | null; message: string; rule: string; severity: Severity; steps?: string | null };

export type Fold = { line: string; main?: FoldMain | null };

export type FoldMain = { action: string; block?: string | null; label: string; value?: string | null; values?: Record<string, unknown> | null };

export type Form = { action?: string | null; fields: Field[]; id?: string | null; show?: Expr | null; submit?: Submit | null };

export type Gesture = { action: string; enabled?: Expr | null; name: string };

export type Have = { k: string; rev?: number | null };

export type Hello = { epoch: string; keys: number; sid: string; v: number };

export type Hero = { actions?: Act[] | null; id?: string | null; media?: Media | null; show?: Expr | null; subtitle?: string | null; title: string };

export type Hunk = { at: string; lines: string[] };

export type Image = { alt?: string | null; caption?: string | null; src: string };

export type ImageSize = "small" | "large";

export type Images = { id?: string | null; items: Image[]; show?: Expr | null; size?: ImageSize | null };

export type Island = { events?: string[] | null; fallback: Fallback; id?: string | null; name: string; props?: Record<string, unknown> | null; show?: Expr | null; size?: IslandSize | null };

export type IslandSize = { aspect?: string | null; height?: number | null; width?: number | null };

export type KeyState = { gone?: number | null; k: string; ops?: Op[] | null; rev?: number | null; screen?: Block | null };

export type Keyboard = "default" | "url" | "number";

export type Label = { text: string; tone?: Tone | null };

export type Lane = { id: string; since?: string | null; stage?: string | null; state: LaneState; tap?: Tap | null; title: string; tool?: string | null };

export type LaneState = "working" | "needs" | "done" | "idle" | "fail" | "merged";

export type LineError = { line: number; message: string };

export type LineItem = { id: string; values: Record<string, unknown> };

export type Lines = { action?: string | null; add?: string | null; balance?: string[] | null; calc?: Record<string, Expr> | null; columns: Field[]; empty?: string | null; errors?: RowError[] | null; id?: string | null; items: LineItem[]; label?: string | null; max?: number | null; min?: number | null; name: string; scale?: number | null; show?: Expr | null; submit?: Submit | null; sum?: string[] | null };

export type Link = { label: string; tap: Tap };

export type List = { id?: string | null; reorder?: Gesture | null; rows: Block[]; show?: Expr | null };

export type Lit = null | boolean | number | string;

export type Match = { pattern: Pattern; value: Expr };

export type Media = { alt: string; caption?: string | null; height: number; id?: string | null; poster?: string | null; show?: Expr | null; src: string; video?: boolean | null; width: number };

export type Nav = { brand?: NavLink | null; id?: string | null; links: NavLink[]; show?: Expr | null };

export type NavLink = { current?: boolean | null; href: string; label: string };

export type Node = { coat?: string | null; label?: string | null; limit?: string | null; state?: Tone | null; tap?: Tap | null; value?: string | null };

export type OldFrame = { ops: Op[]; seq: number };

export type Op = { op: "merge"; fields: Record<string, unknown>; id: string } | { op: "insert"; after?: string | null; before?: string | null; block: Child; into: string } | { op: "move"; before?: string | null; id: string; into: string } | { op: "remove"; id: string } | { op: "replace"; block: Block; id: string } | { op: "badge"; count: number } | { op: "dot"; on: boolean } | { op: "screen"; screen: Block };

export type Other = { for?: string | null; placeholder?: string | null };

export type Part = { part: "heading"; level: number; spans: Span[] } | { part: "para"; spans: Span[] } | { part: "list"; items: Span[][]; ordered: boolean } | { part: "quote"; spans: Span[] } | { part: "code"; lang?: string | null; text: string } | { part: "rule" };

export type Pattern = "filled" | "email" | "url" | "number";

export type Pending = { count: string; discard: Tap; review: Tap; text: string };

export type PhonePart = "title" | "tag" | "value" | "meta" | "hide";

export type Prose = { id?: string | null; parts: Part[]; show?: Expr | null };

export type Queued = { q: number; text: string };

export type Report = { dropped: string[]; sent: Action[]; shots: string[]; timings: Timings };

export type Round = { blocks?: Block[] | null; id: string; lane?: RoundLane | null; links?: Link[] | null; name: string; since?: string | null; state: LaneState; summary?: string | null; tap?: Tap | null };

export type RoundLane = { harness?: string | null; host?: string | null; lines?: string[] | null; model?: string | null; name?: string | null };

export type Row = { accessory?: Accessory | null; badge?: Label | null; button?: Act | null; changed?: boolean | null; figure?: Figure | null; handle?: boolean | null; id?: string | null; indent?: number | null; lifted?: boolean | null; menu?: Act[] | null; rounds?: Round[] | null; show?: Expr | null; sticky?: boolean | null; style?: RowStyle | null; subtitle?: Toned | null; swipe?: Act[] | null; tap?: Tap | null; title: string; value?: Shown | null };

export type RowError = { message: string; name?: string | null; row?: string | null };

export type RowStyle = "link" | "destructive";

export type Run = { action: string; command: string; dir?: string | null; id?: string | null; sha: string; show?: Expr | null; touches?: string | null; until?: string | null };

export type Scene = { id?: string | null; label?: string | null; lanes?: Lane[] | null; show?: Expr | null };

export type Screen = { actions?: Act[] | null; back?: string | null; badge?: number | null; blocks?: Block[] | null; done?: Submit | null; focus?: boolean | null; id?: string | null; large?: boolean | null; pending?: Pending | null; personas?: Record<string, unknown>[] | null; refresh?: boolean | null; show?: Expr | null; sites?: number | null; source?: string | null; state?: Record<string, Lit> | null; stream?: string | null; threads?: Record<string, unknown>[] | null; title?: string | null; url?: string | null };

export type Secret = { action: string; id?: string | null; label?: string | null; name: string; placeholder?: string | null; set?: boolean | null; show?: Expr | null; values?: Record<string, unknown> | null };

export type Section = { blocks: Block[]; footer?: string | null; header?: string | null; id?: string | null; show?: Expr | null };

export type Seen = { at: string; detail: string; file?: string | null; line?: number | null; rule: string; run?: string | null; shot?: string | null };

export type SetState = { key: string; to: Expr };

export type Severity = "error" | "warn";

export type Sheet = { blocks: Block[]; cancel?: string | null; done?: Submit | null; id?: string | null; show?: Expr | null; title: string };

export type Shown = string | number | Bound | Time;

export type SortDir = "asc" | "desc";

export type Span = { bold?: boolean | null; code?: boolean | null; italic?: boolean | null; link?: string | null; text: string };

export type Stage = { id: string; label: string; sub?: string | null; tap?: Tap | null };

export type Stat = { id?: string | null; items?: Tile[] | null; label?: string | null; show?: Expr | null; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value?: Shown | null };

export type Step = { tap: StepOn } | { type: StepType } | { scroll: StepOn } | { frame: Frame } | { answer: Answer } | { shot: StepShot } | { gesture: StepGesture } | { refuse: StepRefuse };

export type StepGesture = { grab: unknown; id: string; reach: unknown[]; via: Via };

export type StepOn = { id: string };

export type StepRefuse = { toast: string };

export type StepShot = { name: string };

export type StepType = { id: string; text: string };

export type Steps = { bars?: Bar[] | null; current?: string | null; done?: boolean | null; fallback?: Fallback | null; id?: string | null; show?: Expr | null; steps?: Stage[] | null; title?: string | null };

export type Submit = { action: string; label: string; off?: boolean | null; values?: Record<string, unknown> | null };

export type Sync = { close?: string[] | null; open: Have[] };

export type Synced = { keys: KeyState[] };

export type Table = { columns: Column[]; empty?: string | null; export?: ExportFormat[] | null; filter?: boolean | null; id?: string | null; rows: TableRow[]; select?: TableSelect | null; show?: Expr | null; sort?: TableSort | null; title?: string | null };

export type TableRow = { cells: Record<string, Cell>; id: string; tap?: Tap | null };

export type TableSelect = { actions: BulkAction[] };

export type TableSort = { by: string; dir: SortDir };

export type Tap = { action?: string | null; copy?: string | null; focus?: string | null; open?: string | null; set?: SetState[] | null; sheet?: string | null; thread?: string | null; url?: string | null; values?: Record<string, unknown> | null };

export type Text = { center?: boolean | null; font?: string | null; id?: string | null; markdown?: string | null; show?: Expr | null; size?: number | null; style?: TextStyle | null; text?: string | null; tone?: Tone | null; top?: number | null; until?: string | null; weight?: string | null };

export type TextStyle = "body" | "footnote";

export type Tile = { label: string; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value: Shown };

export type Time = { since?: string | null; until?: string | null };

export type Timings = { first_paint_ms: number; frames_over_budget?: number | null; longest_frame_ms?: number | null; longest_patch_ms?: number | null; steps_ms: number[] };

export type Toast = { fallback?: Fallback | null; id?: string | null; show?: Expr | null; title: string; tone?: Tone | null; undo?: Undo | null };

export type Tone = "ok" | "warn" | "bad" | "info" | "mute" | "accent" | "working" | "needs" | "done" | "fail" | "idle";

export type Toned = string | Label;

export type Total = "sum" | "avg" | "count";

export type TreeDrawn = "native" | "fallback" | "hidden";

export type TreeNode = { children: TreeNode[]; drawn: TreeDrawn; id?: string | null; kind: string; name: string; rect?: number[] | null; role: string; text?: string | null; variant?: string | null };

export type Undo = { action: string; confirm?: Confirm | null; label?: string | null; values?: Record<string, unknown> | null };

export type Via = "pointer" | "keys" | "action";

export type Web = { height: number; id?: string | null; show?: Expr | null; src: string };

export type Why = "evicted" | "unpaired" | "handover";

export type Working = { since: string };

export type Kind = "screen" | "sheet" | "section" | "list" | "row" | "card" | "choice" | "form" | "config" | "secret" | "run" | "button" | "chips" | "stat" | "text" | "images" | "web" | "diff" | "editor" | "scene" | "diagram" | "composer" | "lines" | "prose" | "hero" | "media" | "nav" | "island" | "table" | "steps" | "toast";
