import type { Action, Answer, Block, Op } from "../gen/types.ts";
import type { Source } from "./source.ts";
export type Local = {
    screen(path: string): Block | Promise<Block>;
    act(a: Action, path: string): Answer | Promise<Answer>;
    close?(path: string): void;
};
export declare function local(app: Local): Source & {
    push(path: string, ops: Op[]): void;
};
