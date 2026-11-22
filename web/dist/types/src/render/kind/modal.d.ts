import type { Modal } from "../../gen/types.ts";
import { type Done, type Kept } from "../../modal.ts";
import type { Ctx } from "../ctx.ts";
export declare function box(b: Modal, inner: HTMLElement[], o: {
    done: Done;
    store?: Kept | undefined;
    lead?: HTMLElement | undefined;
}): HTMLDialogElement;
export declare function modal(b: Modal, c: Ctx): HTMLElement;
