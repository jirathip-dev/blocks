import { type Mode, type Scheme } from "../gen/schemes.ts";
export type Pair = Record<Mode, Scheme>;
export type Scale = {
    space?: number;
    motion?: number;
    type?: string;
};
export declare function css(look: Scheme | Pair, style?: Scale): string;
export declare const tiles: string;
export declare const choose: (setting: string | null, dark: boolean, schemes?: Record<string, Scheme>) => Scheme;
