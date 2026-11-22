import { type Mode, type Scale, type Scheme } from "../gen/schemes.ts";
export type Pair = Record<Mode, Scheme>;
export type { Scale };
declare const passed: unique symbol;
export type Look = Readonly<Pair> & {
    readonly [passed]: true;
};
export declare function gated(pair: Pair): Look;
export declare function css(look: Scheme | Pair, style?: Scale): string;
export declare const tiles: string;
export declare const choose: (setting: string | null, dark: boolean, schemes?: Record<string, Scheme>) => Scheme;
