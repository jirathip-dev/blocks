import { type Store } from "../render/ctx.ts";
import { type Theme } from "../theme.ts";
import { type AppBlocks } from "./host.ts";
export declare function adopt(o?: {
    theme?: Theme;
    store?: Store;
    blocks?: AppBlocks;
}): boolean;
