import type { Action, Answer, Block, Op, Toast } from "../gen/types.ts";
import { type State } from "../stream.ts";
export type Source = {
    open(path: string, on: (screen: Block, ops?: Op[]) => void): void;
    close(path: string): void;
    act(path: string, a: Action): Promise<Answer>;
};
export declare class Refused extends Error {
    readonly toast: Toast;
    constructor(toast: Toast);
}
export declare function served(url: (path: string) => string, state: (s: State) => void): Source;
