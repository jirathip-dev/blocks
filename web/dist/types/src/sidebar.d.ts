import type { Store } from "./render/ctx.ts";
export declare function behave(root: HTMLElement, key: string, store: Store, open?: Set<string>): () => void;
