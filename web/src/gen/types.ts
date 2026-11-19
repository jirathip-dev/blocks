export const schemaVersion = 1;

export type Frame = { from?: number | null; k: string; ops?: Op[] | null; rev: number; screen?: Block | null };

export type Accessory = "chevron" | "none";

export type Act = { action?: string | null; confirm?: Confirm | null; icon?: string | null; label: string; menu?: Act[] | null; tap?: Tap | null; tone?: Tone | null; values?: Record<string, unknown> | null };

export type AppBlock = { fallback?: Fallback | null; id?: string | null; type: string };

export type Block = ({ type: "screen" } & Screen) | ({ type: "sheet" } & Sheet) | ({ type: "section" } & Section) | ({ type: "list" } & List) | ({ type: "row" } & Row) | ({ type: "card" } & Card) | ({ type: "choice" } & Choice) | ({ type: "form" } & Form) | ({ type: "config" } & Form) | ({ type: "secret" } & Secret) | ({ type: "run" } & Run) | ({ type: "button" } & Button) | ({ type: "chips" } & Chips) | ({ type: "stat" } & Stat) | ({ type: "text" } & Text) | ({ type: "images" } & Images) | ({ type: "web" } & Web) | ({ type: "diff" } & Diff) | ({ type: "editor" } & Editor) | ({ type: "scene" } & Scene) | ({ type: "diagram" } & Diagram) | ({ type: "composer" } & Composer) | (AppBlock & { [key: string]: unknown });

export type Button = { action?: string | null; confirm?: Confirm | null; id?: string | null; label: string; style?: ButtonStyle | null; tap?: Tap | null; values?: Record<string, unknown> | null };

export type ButtonStyle = "primary" | "plain" | "destructive";

export type Bye = { why: Why };

export type Card = { badge?: Label | null; blocks?: Block[] | null; buttons?: Block[] | null; fold?: Fold | null; id?: string | null; kind?: CardKind | null; menu?: Act[] | null; meta?: string | null; push?: boolean | null; subtitle?: string | null; tap?: Tap | null; title?: string | null; tone?: Tone | null };

export type CardKind = "ask" | "run" | "secret" | "config" | "proposal";

export type Child = Block | Lane | Round;

export type ChipOption = { label: string; value: string };

export type Chips = { action?: string | null; id?: string | null; multi?: boolean | null; name: string; options: ChipOption[]; selected?: string[] | null };

export type Choice = { action: string; default?: ChoiceDefault | null; id?: string | null; options: ChoiceOption[]; other?: Other | null; question?: string | null; recommended?: string | null; values?: Record<string, unknown> | null };

export type ChoiceDefault = { label?: string | null; until: string; value: string };

export type ChoiceOption = { confirm?: Confirm | null; label: string; value: string; values?: Record<string, unknown> | null };

export type Composer = { action: string; acts?: Record<string, string> | null; chips?: ComposerChip[] | null; id?: string | null; label?: string | null; placeholder?: string | null; queued?: Queued[] | null; values?: Record<string, unknown> | null };

export type ComposerChip = { all: string[]; cur?: string | null; name: string };

export type Confirm = { destructive?: boolean | null; message?: string | null; ok?: string | null; title: string };

export type Diagram = { counts?: Record<string, number> | null; id?: string | null; nodes?: Record<string, Node> | null; selected?: string | null; source: string; title?: string | null };

export type Diff = { file: string; hunks: Hunk[]; id?: string | null; summary?: string | null };

export type Editor = { action: string; errors?: LineError[] | null; first?: number | null; id?: string | null; name: string; text: string };

export type Fallback = { subtitle?: string | null; tap?: Tap | null; title: string };

export type Field = { doc?: string | null; error?: string | null; keyboard?: Keyboard | null; label?: string | null; name: string; open?: boolean | null; options?: string[] | null; placeholder?: string | null; set?: boolean | null; type: FieldKind; value?: FieldValue | null; was?: string | null };

export type FieldKind = "text" | "toggle" | "picker" | "secret";

export type FieldValue = string | number | boolean;

export type Figure = { avatar?: string | null; coat?: string | null; grow?: string | null; icon?: string | null; state?: Tone | null; tool?: string | null };

export type Fold = { line: string; main?: FoldMain | null };

export type FoldMain = { action: string; block?: string | null; label: string; value?: string | null; values?: Record<string, unknown> | null };

export type Form = { action?: string | null; fields: Field[]; id?: string | null; submit?: Submit | null };

export type Have = { k: string; rev?: number | null };

export type Hello = { epoch: string; keys: number; sid: string; v: number };

export type Hunk = { at: string; lines: string[] };

export type Image = { alt?: string | null; caption?: string | null; src: string };

export type ImageSize = "small" | "large";

export type Images = { id?: string | null; items: Image[]; size?: ImageSize | null };

export type KeyState = { gone?: number | null; k: string; ops?: Op[] | null; rev?: number | null; screen?: Block | null };

export type Keyboard = "default" | "url" | "number";

export type Label = { text: string; tone?: Tone | null };

export type Lane = { id: string; since?: string | null; stage?: string | null; state: LaneState; tap?: Tap | null; title: string; tool?: string | null };

export type LaneState = "working" | "needs" | "done" | "idle" | "fail" | "merged";

export type LineError = { line: number; message: string };

export type Link = { label: string; tap: Tap };

export type List = { id?: string | null; reorder?: Reorder | null; rows: Block[] };

export type Node = { coat?: string | null; label?: string | null; limit?: string | null; state?: Tone | null; tap?: Tap | null; value?: string | null };

export type OldFrame = { ops: Op[]; seq: number };

export type Op = { op: "merge"; fields: Record<string, unknown>; id: string } | { op: "insert"; after?: string | null; before?: string | null; block: Child; into: string } | { op: "move"; before?: string | null; id: string; into: string } | { op: "remove"; id: string } | { op: "replace"; block: Block; id: string } | { op: "badge"; count: number } | { op: "dot"; on: boolean } | { op: "screen"; screen: Block };

export type Other = { for?: string | null; placeholder?: string | null };

export type Pending = { count: string; discard: Tap; review: Tap; text: string };

export type Queued = { q: number; text: string };

export type Reorder = { action: string; name: string };

export type Round = { blocks?: Block[] | null; id: string; lane?: RoundLane | null; links?: Link[] | null; name: string; since?: string | null; state: LaneState; summary?: string | null; tap?: Tap | null };

export type RoundLane = { harness?: string | null; host?: string | null; lines?: string[] | null; model?: string | null; name?: string | null };

export type Row = { accessory?: Accessory | null; badge?: Label | null; button?: Act | null; changed?: boolean | null; figure?: Figure | null; handle?: boolean | null; id?: string | null; indent?: number | null; lifted?: boolean | null; menu?: Act[] | null; rounds?: Round[] | null; sticky?: boolean | null; style?: RowStyle | null; subtitle?: Toned | null; swipe?: Act[] | null; tap?: Tap | null; title: string; value?: Shown | null };

export type RowStyle = "link" | "destructive";

export type Run = { action: string; command: string; dir?: string | null; id?: string | null; sha: string; touches?: string | null; until?: string | null };

export type Scene = { id?: string | null; label?: string | null; lanes?: Lane[] | null };

export type Screen = { actions?: Act[] | null; back?: string | null; badge?: number | null; blocks?: Block[] | null; done?: Submit | null; focus?: boolean | null; id?: string | null; large?: boolean | null; pending?: Pending | null; refresh?: boolean | null; source?: string | null; stream?: string | null; title?: string | null; url?: string | null };

export type Secret = { action: string; id?: string | null; label?: string | null; name: string; placeholder?: string | null; set?: boolean | null; values?: Record<string, unknown> | null };

export type Section = { blocks: Block[]; footer?: string | null; header?: string | null; id?: string | null };

export type Sheet = { blocks: Block[]; cancel?: string | null; done?: Submit | null; id?: string | null; title: string };

export type Shown = string | number | Time;

export type Stat = { id?: string | null; items?: Tile[] | null; label?: string | null; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value?: Shown | null };

export type Submit = { action: string; label: string; off?: boolean | null; values?: Record<string, unknown> | null };

export type Sync = { close?: string[] | null; open: Have[] };

export type Synced = { keys: KeyState[] };

export type Tap = { action?: string | null; copy?: string | null; focus?: string | null; open?: string | null; sheet?: string | null; thread?: string | null; url?: string | null; values?: Record<string, unknown> | null };

export type Text = { center?: boolean | null; font?: string | null; id?: string | null; markdown?: string | null; size?: number | null; style?: TextStyle | null; text?: string | null; tone?: Tone | null; top?: number | null; until?: string | null; weight?: string | null };

export type TextStyle = "body" | "footnote";

export type Tile = { label: string; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value: Shown };

export type Time = { since?: string | null; until?: string | null };

export type Tone = "ok" | "warn" | "bad" | "info" | "mute" | "accent" | "working" | "needs" | "done" | "fail" | "idle";

export type Toned = string | Label;

export type Web = { height: number; id?: string | null; src: string };

export type Why = "evicted" | "unpaired" | "handover";
