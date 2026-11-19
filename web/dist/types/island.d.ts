import type { Island } from "./gen/types.ts";
export declare const isTag: (name: string) => boolean;
export declare function island(b: Island, fallback: Node[], send: (name: string, values: Record<string, unknown>) => void, drop: (name: string) => void): HTMLElement;
