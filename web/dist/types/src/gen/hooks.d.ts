import type { Kind } from "./types.ts";
export type Hook = {
    variant: string | null;
    parts: readonly string[];
};
export declare const hooks: Record<Kind, Hook>;
export declare const roles: Record<string, string>;
export declare const names: readonly ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"];
export declare const hosts: Record<string, string>;
export declare const walked: readonly ["blocks", "rows", "buttons", "rounds", "lanes"];
