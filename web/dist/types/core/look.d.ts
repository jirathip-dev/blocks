import { type Mode, type Scheme } from "../gen/schemes.ts";
export type Pair = Record<Mode, Scheme>;
type Label = {
    prefix?: string;
    suffix?: string;
    case?: "as-is" | "lower" | "upper";
};
export type Scale = {
    space?: number;
    motion?: number;
    easing?: "standard" | "calm" | "bouncy";
    radius?: number;
    type?: "default" | "mono";
    surface?: "glass" | "dashed" | "solid";
    fills?: "tint" | "outline";
    marks?: "symbols" | "text";
    sections?: "title" | "quiet";
    labels?: Record<string, Label>;
};
export declare function css(look: Scheme | Pair, style?: Scale): string;
export declare const tiles: string;
export declare const choose: (setting: string | null, dark: boolean, schemes?: Record<string, Scheme>) => Scheme;
export {};
