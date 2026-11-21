import type { Modal } from "./gen/types.ts";
export type Kept = {
    get(key: string): string | null;
    put(key: string, value: string | null): void;
};
export type Done = (a: {
    action: string;
    block?: string | null | undefined;
    values: Record<string, unknown>;
}) => Promise<boolean>;
export declare function framed(d: HTMLDialogElement, b: Modal, o: {
    done: Done;
    store?: Kept | undefined;
}): () => void;
