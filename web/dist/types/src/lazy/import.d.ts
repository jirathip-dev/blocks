import { type OnFile } from "../core/field/files.ts";
import type { Import, Locale } from "../gen/types.ts";
export type Ctx = {
    screen: string;
    locale?: Locale | undefined;
    file?: OnFile | undefined;
    act: (a: {
        action: string;
        block?: string | null | undefined;
        values: Record<string, unknown>;
    }) => Promise<boolean>;
};
export declare function draw(box: HTMLElement, b: Import, c: Ctx): void;
