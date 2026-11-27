export const schemaVersion = 2;

export type Frame = { from?: number | null; k: string; ops?: Op[] | null; rev: number; screen?: Block | null };

export type Accept = "image" | "pdf" | "sheet";

export type Accessory = "chevron" | "none";

export type Act = { action?: string | null; confirm?: Confirm | null; enabled?: Expr | null; icon?: string | null; label: string; menu?: Act[] | null; tap?: Tap | null; tone?: Tone | null; values?: Record<string, unknown> | null };

export type Action = { action: string; block?: string | null; screen: string; values?: Record<string, unknown> | null };

export type Align = "start" | "end";

export type Answer = { close?: boolean | null; open?: string | null; ops?: Op[] | null; toast?: Toast | null };

export type AppBlock = { fallback?: Fallback | null; id?: string | null; type: string };

export type Attachment = { name: string; src?: string | null; tap: Tap };

export type AxisScale = "number" | "time";

export type Band = { blocks?: Block[] | null; header?: string | null; id: string; rows?: SceneRow[] | null; type: string };

export type Bar = { label: string; sub?: string | null; tone?: Tone | null; value: number };

export type Block = ({ type: "screen" } & Screen) | ({ type: "modal" } & Modal) | ({ type: "sheet" } & Modal) | ({ type: "section" } & Section) | ({ type: "list" } & List) | ({ type: "row" } & Row) | ({ type: "card" } & Card) | ({ type: "choice" } & Choice) | ({ type: "form" } & Form) | ({ type: "config" } & Form) | ({ type: "secret" } & Secret) | ({ type: "run" } & Run) | ({ type: "button" } & Button) | ({ type: "chips" } & Chips) | ({ type: "stat" } & Stat) | ({ type: "text" } & Text) | ({ type: "images" } & Images) | ({ type: "web" } & Web) | ({ type: "diff" } & Diff) | ({ type: "editor" } & Editor) | ({ type: "scene" } & Scene) | ({ type: "diagram" } & Diagram) | ({ type: "composer" } & Composer) | ({ type: "lines" } & Lines) | ({ type: "prose" } & Prose) | ({ type: "hero" } & Hero) | ({ type: "media" } & Media) | ({ type: "nav" } & Nav) | ({ type: "island" } & Island) | ({ type: "table" } & Table) | ({ type: "steps" } & Steps) | ({ type: "chart" } & Chart) | ({ type: "toast" } & Toast) | ({ type: "pages" } & Pages) | ({ type: "timeline" } & Timeline) | ({ type: "import" } & Import) | ({ type: "message" } & Message) | ({ type: "tool" } & Tool) | ({ type: "sidebar" } & Sidebar) | ({ type: "boxplot" } & Boxplot) | ({ type: "heat" } & Heat) | ({ type: "plot" } & Plot) | ({ type: "glance" } & Glance) | (AppBlock & { [key: string]: unknown });

export type Bound = { get: string };

export type Boxplot = { axis: string; boxes: PlotBox[]; empty?: string | null; id?: string | null; selected?: string | null; show?: Expr | null; tap?: Tap | null; title: string; unit?: string | null };

export type BulkAction = { action: string; bad?: boolean | null; label: string };

export type Button = { action?: string | null; confirm?: Confirm | null; enabled?: Expr | null; id?: string | null; label: string; show?: Expr | null; style?: ButtonStyle | null; tap?: Tap | null; values?: Record<string, unknown> | null };

export type ButtonStyle = "primary" | "plain" | "destructive";

export type Bye = { why: Why };

export type Card = { badge?: Label | null; blocks?: Block[] | null; buttons?: Block[] | null; color?: string | null; fold?: Fold | null; id?: string | null; kind?: CardKind | null; menu?: Act[] | null; meta?: Shown | null; push?: boolean | null; show?: Expr | null; subtitle?: Toned | null; tap?: Tap | null; title?: string | null; tone?: Tone | null };

export type CardKind = "ask" | "run" | "secret" | "config" | "proposal";

export type Cell = string | number | Label;

export type Chart = { chart: ChartKind; empty?: string | null; era?: Era | null; format?: ChartFormat | null; id?: string | null; lang?: string | null; move?: Gesture | null; selected?: string | null; series: Series[]; show?: Expr | null; tap?: Tap | null; title: string; x: string[] };

export type ChartFormat = "count" | "thb" | "thb_m" | "percent";

export type ChartKind = "bar" | "stacked" | "line" | "combo" | "donut";

export type Check = { ok: Expr; say: string };

export type Child = Block | Lane | Round | TableRow;

export type ChipOption = { label: string; value: string };

export type Chips = { action?: string | null; id?: string | null; multi?: boolean | null; name: string; options: ChipOption[]; selected?: string[] | null; show?: Expr | null };

export type Choice = { action: string; default?: ChoiceDefault | null; id?: string | null; options: ChoiceOption[]; other?: Other | null; question?: string | null; recommended?: string | null; show?: Expr | null; values?: Record<string, unknown> | null };

export type ChoiceDefault = { label?: string | null; until: string; value: string };

export type ChoiceOption = { confirm?: Confirm | null; label: string; value: string; values?: Record<string, unknown> | null };

export type Column = { align?: Align | null; currency?: string | null; digits?: number | null; edit?: boolean | null; era?: Era | null; hide?: boolean | null; id: string; kind: ColumnKind; label: string; max?: number | null; phone?: PhonePart | null; sort?: boolean | null; tone?: Tone | null; total?: Total | null; unit?: string | null; width?: number | null };

export type ColumnKind = "text" | "number" | "money" | "date" | "tone" | "bar";

export type Composer = { action: string; acts?: Record<string, string> | null; chips?: ComposerChip[] | null; id?: string | null; label?: string | null; placeholder?: string | null; queued?: Queued[] | null; show?: Expr | null; values?: Record<string, unknown> | null; working?: Working | null };

export type ComposerChip = { all: string[]; cur?: string | null; name: string };

export type Confirm = { destructive?: boolean | null; message?: string | null; ok?: string | null; title: string };

export type DaySpan = { end: string; id?: string | null; row?: string | null; start: string };

export type Diagram = { counts?: Record<string, number> | null; id?: string | null; nodes?: Nodes | null; selected?: string | null; show?: Expr | null; source: string; title?: string | null };

export type Diff = { file: string; hunks: Hunk[]; id?: string | null; show?: Expr | null; summary?: string | null };

export type Editor = { action: string; errors?: LineError[] | null; first?: number | null; id?: string | null; name: string; show?: Expr | null; text: string };

export type Era = "ce" | "be";

export type ExportFormat = "csv" | "xlsx";

export type Expr = { get: string } | { not: Expr } | { all: Expr[] } | { any: Expr[] } | { eq: Expr[] } | { lt: Expr[] } | { len: Expr } | { has: Expr[] } | { is: Match } | { add: Expr[] } | { sub: Expr[] } | { mul: Expr[] } | { div: Expr[] } | { cat: Expr[] } | { pick: Expr[] } | Lit;

export type Fallback = { subtitle?: string | null; tap?: Tap | null; title: string };

export type Field = ({ type: "text" } & TextField) | ({ type: "toggle" } & ToggleField) | ({ type: "picker" } & PickerField) | ({ type: "secret" } & SecretField) | ({ type: "search" } & SearchField) | ({ type: "upload" } & UploadField) | ({ type: "scan" } & ScanField) | ({ type: "slider" } & SliderField) | (OtherField & { [key: string]: unknown });

export type FieldDrawn = "native" | "plain" | "hidden";

export type FieldNode = { drawn: FieldDrawn; label: string; name: string; role: string; type: string };

export type FieldValue = string | number | boolean;

export type Figure = { act?: string | null; avatar?: string | null; coat?: string | null; grow?: string | null; icon?: string | null; issue?: number | null; load?: string | null; moment?: string | null; state?: Tone | null; tool?: string | null };

export type FileLink = { name: string; src: string };

export type FileRef = { id: string; name?: string | null; src?: string | null };

export type Finding = { at: string; file: string; fix: string; line?: number | null; message: string; rule: string; severity: Severity; steps?: string | null };

export type Fold = { line: string; main?: FoldMain | null };

export type FoldMain = { action: string; block?: string | null; label: string; value?: string | null; values?: Record<string, unknown> | null };

export type Form = { action?: string | null; fields: Field[]; id?: string | null; more?: string | null; show?: Expr | null; submit?: Submit | null };

export type Gesture = { action: string; enabled?: Expr | null; name: string };

export type Glance = { expanded?: GlanceBody | null; figure?: Figure | null; id?: string | null; leading?: GlanceSide | null; medium?: GlanceBody | null; show?: Expr | null; small?: GlanceBody | null; subtitle?: string | null; tap?: Tap | null; title: string; tone?: Tone | null; trailing?: GlanceSide | null; value?: Shown | null };

export type GlanceBody = { acts?: Act[] | null; foot?: string | null; line?: string | null; rows?: GlanceRow[] | null };

export type GlanceRow = { figure?: Figure | null; subtitle?: string | null; tap?: Tap | null; title: string; tone?: Tone | null; value?: Shown | null };

export type GlanceSide = { figure?: Figure | null; text?: Shown | null; tone?: Tone | null };

export type Handler = "answers" | "fails" | "waits";

export type Have = { k: string; rev?: number | null };

export type Heat = { columns: string[]; edges?: HeatEdges | null; empty?: string | null; grid: HeatRow[]; id?: string | null; lang?: string | null; scale?: HeatScale | null; selected?: HeatPick | null; show?: Expr | null; tap?: Tap | null; title: string; tone?: HeatTone | null };

export type HeatCell = { label?: string | null; value?: number | null };

export type HeatEdges = "steps" | "ends";

export type HeatPick = { column: string; row: string };

export type HeatRow = { cells: HeatCell[]; name: string };

export type HeatScale = { max?: number | null; min?: number | null; unit?: string | null };

export type HeatTone = "info" | "ok" | "warn" | "bad" | "accent" | "mute";

export type Hello = { epoch: string; keys: number; sid: string; v: number };

export type Hero = { actions?: Act[] | null; id?: string | null; media?: Media | null; show?: Expr | null; subtitle?: string | null; title: string };

export type Hunk = { at: string; lines: string[] };

export type Image = { alt?: string | null; caption?: string | null; src: string };

export type ImageSize = "small" | "large";

export type Images = { id?: string | null; items: Image[]; show?: Expr | null; size?: ImageSize | null };

export type Import = { accept?: string[] | null; action?: string | null; columns: ImportColumn[]; done?: ImportDone | null; error?: string | null; id?: string | null; into?: string | null; mb?: number | null; read?: string | null; refused?: ImportRow[] | null; sheet?: ImportSheet | null; show?: Expr | null; template?: FileLink | null; title: string };

export type ImportColumn = { key: string; label: string; required?: boolean | null; type?: ImportType | null; values?: string[] | null };

export type ImportDone = { count: number; file?: FileLink | null; left?: number | null };

export type ImportFile = { id: string; name: string; rows: number; sheet?: string | null; sheets?: string[] | null; size?: number | null };

export type ImportRow = { bad?: Record<string, string> | null; cells: Record<string, string>; n: number };

export type ImportSheet = { bad?: ImportRow[] | null; file: ImportFile; headers: string[]; map: Record<string, string>; rows: ImportRow[] };

export type ImportType = "text" | "number" | "money" | "date" | "choice";

export type Island = { events?: string[] | null; fallback: Fallback; id?: string | null; name: string; props?: Record<string, unknown> | null; show?: Expr | null; size?: IslandSize | null };

export type IslandSize = { aspect?: string | null; height?: number | null; width?: number | null };

export type KeyState = { gone?: number | null; k: string; ops?: Op[] | null; rev?: number | null; screen?: Block | null };

export type Keyboard = "default" | "url" | "number";

export type Label = { text: Shown; tone?: Tone | null };

export type Lane = { id: string; since?: string | null; stage?: string | null; state: LaneState; tap?: Tap | null; title: string; tool?: string | null };

export type LaneState = "working" | "needs" | "done" | "idle" | "fail" | "merged";

export type Lang = "en" | "th";

export type LineError = { line: number; message: string };

export type LineItem = { id: string; values: Record<string, unknown> };

export type Lines = { action?: string | null; add?: string | null; balance?: string[] | null; calc?: Record<string, Expr> | null; columns: Field[]; empty?: string | null; errors?: RowError[] | null; id?: string | null; items: LineItem[]; label?: string | null; max?: number | null; min?: number | null; name: string; scale?: number | null; show?: Expr | null; submit?: Submit | null; sum?: string[] | null };

export type Link = { label: string; tap: Tap };

export type List = { empty?: string | null; id?: string | null; more?: More | null; reorder?: Gesture | null; rows: Block[]; show?: Expr | null };

export type Lit = null | boolean | number | string;

export type Load = "calm" | "busy" | "held";

export type Locale = { era?: Era | null; lang?: Lang | null; today?: string | null };

export type Mark = { at: number[]; fixed?: boolean | null; group?: string | null; id: string; kind: MarkKind; path?: number[][] | null; text?: string | null; to?: number[] | null; tone?: Tone | null };

export type MarkKind = "arrow" | "box" | "ellipse" | "text" | "pin" | "highlight" | "line";

export type Match = { pattern: Pattern; value: Expr };

export type Media = { alt: string; caption?: string | null; draw?: Gesture | null; height: number; id?: string | null; marks?: Mark[] | null; move?: Gesture | null; poster?: string | null; remove?: Gesture | null; show?: Expr | null; src: string; stretch?: Gesture | null; tools?: MarkKind[] | null; video?: boolean | null; width: number };

export type Message = { avatar?: string | null; blocks?: Block[] | null; files?: Attachment[] | null; id?: string | null; name: string; role: Role; show?: Expr | null; time?: string | null };

export type Modal = { blocks: Block[]; cancel?: string | null; destructive?: boolean | null; done?: Submit | null; id?: string | null; locale?: Locale | null; message?: string | null; ok?: string | null; show?: Expr | null; title: string; variant?: ModalVariant | null };

export type ModalVariant = "dialog" | "alert" | "tool";

export type More = string | Page;

export type Nav = { brand?: NavLink | null; id?: string | null; links: NavLink[]; show?: Expr | null };

export type NavLink = { current?: boolean | null; href: string; label: string };

export type Node = { coat?: string | null; id?: string | null; label?: string | null; limit?: string | null; state?: Tone | null; tap?: Tap | null; value?: string | null };

export type Nodes = Node[] | Record<string, Node>;

export type OldFrame = { ops: Op[]; seq: number };

export type Op = { op: "merge"; fields: Record<string, unknown>; id: string } | { op: "insert"; after?: string | null; before?: string | null; block: Child; into: string } | { op: "move"; before?: string | null; id: string; into: string } | { op: "remove"; id: string } | { op: "replace"; block: Child; id: string } | { op: "append"; id: string; keep?: number | null; parts?: Part[] | null; text?: string | null } | { op: "points"; drop?: number | null; id: string; series: string; x: number[]; y: number[] } | { op: "badge"; count: number } | { op: "dot"; on: boolean } | { op: "screen"; screen: Block };

export type Other = { for?: string | null; placeholder?: string | null };

export type OtherField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; label?: string | null; name: string; open?: boolean | null; show?: Expr | null; type: string; was?: string | null };

export type Page = { action: string; cursor: string };

export type PageImage = { alt: string; height: number; src: string; width: number };

export type Pages = { fallback?: Fallback | null; file?: string | null; id?: string | null; note?: string | null; pages: PageImage[]; show?: Expr | null; title?: string | null };

export type Part = { part: "heading"; level: number; spans: Span[] } | { part: "para"; spans: Span[] } | { part: "list"; items: Span[][]; ordered: boolean } | { part: "quote"; spans: Span[] } | { part: "code"; lang?: string | null; text: string } | { part: "rule" };

export type Pattern = "filled" | "email" | "url" | "number";

export type Peak = { label: string; y: number };

export type Pending = { count: string; discard: Tap; review: Tap; text: string };

export type PhonePart = "title" | "tag" | "value" | "meta" | "hide";

export type PickerField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; label?: string | null; name: string; open?: boolean | null; options?: string[] | null; show?: Expr | null; value?: FieldValue | null; was?: string | null };

export type Plan = { out: string; runs: PlanRun[] };

export type PlanRun = { css: string[]; kinds: string[]; name: string; probes: boolean; screen: string; scripts: string[]; size: string; steps: Step[] };

export type Plot = { empty?: string | null; id?: string | null; peak?: Peak | null; series: Trace[]; show?: Expr | null; target?: Target | null; title: string; window?: number | null; x?: PlotAxis | null; y?: PlotAxis | null };

export type PlotAxis = { label?: string | null; max?: number | null; min?: number | null; scale?: AxisScale | null; unit?: string | null };

export type PlotBox = { max: number; median: number; min: number; name: string; outliers?: number[] | null; q1: number; q3: number; tone?: Tone | null };

export type PointMove = { at: string; series: string; y: number };

export type Prose = { id?: string | null; parts: Part[]; show?: Expr | null; streaming?: boolean | null };

export type Queued = { q: number; text: string };

export type Report = { dropped: string[]; sent: Action[]; shots: string[]; timings: Timings };

export type Role = "agent" | "owner" | "system";

export type Round = { blocks?: Block[] | null; id: string; lane?: RoundLane | null; links?: Link[] | null; name: string; since?: string | null; state: LaneState; summary?: string | null; tap?: Tap | null };

export type RoundLane = { harness?: string | null; host?: string | null; lines?: string[] | null; model?: string | null; name?: string | null };

export type Row = { accessory?: Accessory | null; badge?: Label | null; button?: Act | null; changed?: boolean | null; figure?: Figure | null; handle?: boolean | null; id?: string | null; indent?: number | null; lifted?: boolean | null; menu?: Act[] | null; rounds?: Round[] | null; show?: Expr | null; sticky?: boolean | null; style?: RowStyle | null; subtitle?: Toned | null; swipe?: Act[] | null; tap?: Tap | null; title?: string | null; value?: Shown | null };

export type RowError = { message: string; name?: string | null; row?: string | null };

export type RowStyle = "link" | "destructive";

export type Run = { action: string; command: string; dir?: string | null; id?: string | null; sha: string; show?: Expr | null; touches?: string | null; until?: string | null };

export type ScanField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; file?: FileRef | null; label?: string | null; max?: number | null; name: string; open?: boolean | null; show?: Expr | null; was?: string | null };

export type Scene = { id?: string | null; label?: string | null; lanes?: Lane[] | null; load?: Load | null; repos?: SceneRepo[] | null; show?: Expr | null; weather?: Weather | null };

export type SceneRepo = { blocks: Band[]; color?: string | null; id: string; subtitle?: string | null; title: string };

export type SceneRow = { blocked_by?: number | null; figure?: Figure | null; host?: string | null; id: string; needs?: number | null; subtitle?: string | null; tap?: Tap | null; title: string; tone?: Tone | null; value?: string | null };

export type Screen = { actions?: Act[] | null; back?: string | null; badge?: number | null; blocks?: Block[] | null; done?: Submit | null; focus?: boolean | null; id?: string | null; large?: boolean | null; locale?: Locale | null; pending?: Pending | null; personas?: Record<string, unknown>[] | null; refresh?: boolean | null; show?: Expr | null; sites?: number | null; source?: string | null; state?: Record<string, Lit> | null; stream?: string | null; threads?: Record<string, unknown>[] | null; title?: string | null; url?: string | null };

export type SearchField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; filters?: string | null; label?: string | null; name: string; open?: boolean | null; placeholder?: string | null; show?: Expr | null; value?: string | null; was?: string | null };

export type Secret = { action: string; id?: string | null; label?: string | null; name: string; placeholder?: string | null; set?: boolean | null; show?: Expr | null; values?: Record<string, unknown> | null };

export type SecretField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; label?: string | null; name: string; open?: boolean | null; placeholder?: string | null; set?: boolean | null; show?: Expr | null; value?: string | null; was?: string | null };

export type Section = { blocks: Block[]; footer?: string | null; header?: string | null; id?: string | null; show?: Expr | null; side?: boolean | null };

export type Seen = { at: string; detail: string; file?: string | null; line?: number | null; rule: string; run?: string | null; shot?: string | null };

export type Series = { as?: SeriesMark | null; dash?: boolean | null; fixed?: boolean | null; name: string; step?: number | null; tone?: Tone | null; values: number[] };

export type SeriesMark = "bar" | "line";

export type SetState = { key: string; to: Expr };

export type Severity = "error" | "warn";

export type Shown = string | number | Bound | Time;

export type SideBadge = { count: number; tone?: Tone | null };

export type SideGroup = { links: SideItem[]; title?: string | null };

export type SideItem = { badge?: SideBadge | null; children?: SideLink[] | null; current?: boolean | null; href?: string | null; icon?: string | null; label: string; open?: boolean | null };

export type SideLink = { badge?: SideBadge | null; current?: boolean | null; href: string; icon?: string | null; label: string };

export type Sidebar = { brand?: SideLink | null; empty?: string | null; footer?: SideLink[] | null; groups: SideGroup[]; id?: string | null; label: string; show?: Expr | null };

export type Sky = "clear" | "windy" | "fog" | "storm";

export type SliderField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; label?: string | null; max: number; min: number; name: string; open?: boolean | null; show?: Expr | null; step?: number | null; unit?: string | null; value?: number | null; was?: string | null };

export type SortDir = "asc" | "desc";

export type Span = { bold?: boolean | null; code?: boolean | null; italic?: boolean | null; link?: string | null; text: string };

export type Stage = { id: string; label: string; sub?: string | null; tap?: Tap | null };

export type Stat = { id?: string | null; items?: Tile[] | null; label?: string | null; show?: Expr | null; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value?: Shown | null };

export type Step = { tap: StepOn } | { type: StepType } | { scroll: StepOn } | { frame: Frame } | { answer: Answer } | { shot: StepShot } | { gesture: StepGesture } | { refuse: StepRefuse } | { file: StepFile } | { slide: StepSlide };

export type StepFile = { field: string; handler: Handler; mime: string; name: string; size: number };

export type StepGesture = { grab: unknown; id: string; reach: unknown[]; via: Via };

export type StepOn = { id: string };

export type StepRefuse = { toast: string };

export type StepShot = { name: string };

export type StepSlide = { field: string; to: number };

export type StepType = { id: string; text: string };

export type Steps = { bars?: Bar[] | null; current?: string | null; done?: boolean | null; fallback?: Fallback | null; id?: string | null; show?: Expr | null; steps?: Stage[] | null; title?: string | null };

export type Submit = { action: string; label: string; off?: boolean | null; values?: Record<string, unknown> | null };

export type Sync = { close?: string[] | null; open: Have[] };

export type Synced = { keys: KeyState[] };

export type Table = { calc?: Record<string, Expr> | null; columns: Column[]; edit?: Gesture | null; empty?: string | null; export?: ExportFormat[] | null; filter?: boolean | null; id?: string | null; more?: Page | null; reorder?: Gesture | null; rows: TableRow[]; select?: TableSelect | null; show?: Expr | null; sort?: TableSort | null; title?: string | null };

export type TableRow = { cells: Record<string, Cell>; fixed?: boolean | null; group?: boolean | null; id: string; tap?: Tap | null };

export type TableSelect = { actions: BulkAction[] };

export type TableSort = { by: string; dir: SortDir };

export type Tap = { action?: string | null; copy?: string | null; focus?: string | null; keep?: boolean | null; open?: string | null; set?: SetState[] | null; sheet?: string | null; thread?: string | null; url?: string | null; values?: Record<string, unknown> | null };

export type Target = { max: number; min: number };

export type Text = { center?: boolean | null; font?: string | null; id?: string | null; markdown?: string | null; show?: Expr | null; size?: number | null; style?: TextStyle | null; text?: string | null; tone?: Tone | null; top?: number | null; until?: string | null; weight?: string | null };

export type TextField = { checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; keyboard?: Keyboard | null; label?: string | null; name: string; open?: boolean | null; placeholder?: string | null; show?: Expr | null; value?: FieldValue | null; was?: string | null };

export type TextStyle = "body" | "footnote";

export type Tile = { label: string; spark?: number[] | null; tone?: Tone | null; unit?: string | null; value: Shown };

export type Time = { label?: string | null; since?: string | null; until?: string | null };

export type TimeBar = { end: string; fixed?: boolean | null; id: string; label?: string | null; progress?: number | null; start: string; tap?: Tap | null; tone?: Tone | null };

export type TimeRow = { bars: TimeBar[]; id: string; subtitle?: string | null; tap?: Tap | null; title: string };

export type Timeline = { draw?: Gesture | null; empty?: string | null; from: string; id?: string | null; move?: Gesture | null; off?: string[] | null; show?: Expr | null; stretch?: Gesture | null; title?: string | null; to: string; tracks: TimeRow[] };

export type Timings = { first_paint_ms: number; frames_over_budget?: number | null; longest_frame_ms?: number | null; longest_patch_ms?: number | null; p99_patch_ms?: number | null; steps_ms: number[] };

export type Toast = { fallback?: Fallback | null; id?: string | null; show?: Expr | null; title: string; tone?: Tone | null; undo?: Undo | null };

export type ToggleField = { as?: ToggleLook | null; checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; label?: string | null; name: string; open?: boolean | null; show?: Expr | null; value?: FieldValue | null; was?: string | null };

export type ToggleLook = "switch" | "check";

export type Tone = "ok" | "warn" | "bad" | "info" | "mute" | "accent" | "working" | "needs" | "done" | "fail" | "idle";

export type Toned = string | Label;

export type Tool = { body?: string | null; id?: string | null; name: string; show?: Expr | null; state: ToolState; summary?: string | null };

export type ToolState = "running" | "done" | "failed";

export type Total = "sum" | "avg" | "count";

export type Trace = { name: string; tone?: Tone | null; x: number[]; y: number[] };

export type TreeDrawn = "native" | "fallback" | "hidden";

export type TreeNode = { children: TreeNode[]; drawn: TreeDrawn; fields?: FieldNode[] | null; id?: string | null; kind: string; name: string; rect?: number[] | null; role: string; text?: string | null; variant?: string | null };

export type Undo = { action: string; confirm?: Confirm | null; label?: string | null; values?: Record<string, unknown> | null };

export type UploadField = { accept?: Accept[] | null; capture?: boolean | null; checks?: Check[] | null; doc?: string | null; enabled?: Expr | null; error?: string | null; files?: FileRef[] | null; label?: string | null; many?: boolean | null; mb?: number | null; name: string; open?: boolean | null; show?: Expr | null; was?: string | null };

export type Via = "pointer" | "keys" | "action";

export type Weather = { fog?: number | null; line?: string | null; sky: Sky; storm?: boolean | null; wind?: number | null };

export type Web = { height: number; id?: string | null; show?: Expr | null; src: string };

export type Why = "evicted" | "unpaired" | "handover";

export type Working = { since: string };

export type Kind = "screen" | "modal" | "sheet" | "section" | "list" | "row" | "card" | "choice" | "form" | "config" | "secret" | "run" | "button" | "chips" | "stat" | "text" | "images" | "web" | "diff" | "editor" | "scene" | "diagram" | "composer" | "lines" | "prose" | "hero" | "media" | "nav" | "island" | "table" | "steps" | "chart" | "toast" | "pages" | "timeline" | "import" | "message" | "tool" | "sidebar" | "boxplot" | "heat" | "plot" | "glance";
