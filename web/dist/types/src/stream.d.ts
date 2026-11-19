import type { Block, Frame, Have, Hello, Op, Synced } from "./gen/types.ts";
export type Took = "patched" | "replaced" | "old" | "gap";
export type Outdated = "app" | "server";
export type State = "off" | "connecting" | "syncing" | "live" | "waiting" | "parked";
export declare class Mirror {
    readonly v: number;
    private epoch;
    private outdated;
    private keys;
    constructor(v?: number);
    hello(h: Hello): Outdated | undefined;
    open(k: string): void;
    close(k: string): void;
    have(): Have[];
    screen(k: string): Block | undefined;
    frame(f: Frame): Took;
    synced(sent: Have[], s: Synced): Took[];
    private state;
}
type On = (screen: Block, ops?: Op[]) => void;
export declare function stream(o: {
    url: string;
    state?: (s: State) => void;
}): {
    open(k: string, f: On): void;
    close(k: string): void;
};
export {};
