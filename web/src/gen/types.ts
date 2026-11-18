export const schemaVersion = 1;

export type Frame = { body: Body; seq: number };

export type Block = { text: { text: string } } | { button: { action: string; label: string } };

export type Body = { snapshot: { screen: Screen } } | { ops: { ops: Op[] } };

export type Op = { insert: { at: number; row: Row } } | { remove: { id: string } } | { update: { row: Row } };

export type Row = { block: Block; id: string };

export type Screen = { rows: Row[] };
