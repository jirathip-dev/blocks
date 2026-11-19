import type { Scheme } from "./gen/schemes.ts";
import type { Figure } from "./gen/types.ts";
export type ThemeJson = {
    label: string;
    scheme: {
        dark: string;
        light: string;
    };
    sprites: boolean;
    moments: boolean;
    words: Record<string, string>;
};
export type Theme = {
    figure(f: Figure): Node | null;
    word(key: string, plain: string): Node;
    css(s: Scheme): string;
};
export { css, tiles } from "./core/look.ts";
export declare const plain: Theme;
export declare function packs(look: {
    theme: ThemeJson;
    base: string;
}): Theme;
