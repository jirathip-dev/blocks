import type { Lit } from "../gen/types.ts";
export type State = Record<string, Lit>;
export type View = {
    hidden: Set<string>;
    disabled: Set<string>;
    says: Record<string, string>;
    acts: Set<string>;
    values: Record<string, string>;
};
type Rec = {
    [k: string]: unknown;
};
export declare const own: (o: object, k: string) => boolean;
export declare const rec: (v: unknown) => v is Rec;
export declare function read(v: unknown): unknown;
export declare function sound(e: unknown): boolean;
export declare function ev(e: unknown, s: State): Lit;
export declare function evaluate(e: unknown, s: State): Lit;
export declare const list: (v: unknown) => Rec[];
export declare const actionOf: (a: Rec) => string | undefined;
export declare function start(screen: unknown): State;
export declare function view(screen: unknown, s: State): View;
export declare const find: (b: Rec, id: string) => Rec | undefined;
export {};
