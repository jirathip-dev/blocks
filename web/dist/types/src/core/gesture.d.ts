export declare const WORDS: readonly ["reorder", "move", "stretch", "edit", "draw", "remove"];
export type Word = (typeof WORDS)[number];
export type Phase<C> = {
    at: "idle";
} | {
    at: "pressed";
} | {
    at: "dragging";
} | {
    at: "previewing";
    c: C;
} | {
    at: "sent";
    c: C;
} | {
    at: "confirmed";
} | {
    at: "refused";
    why: string;
};
export type Event<C> = {
    on: "press";
} | {
    on: "move";
    c?: C | null;
} | {
    on: "release";
} | {
    on: "cancel";
} | {
    on: "answer";
    ok: boolean;
    why?: string | null;
} | {
    on: "settled";
};
export type Effect<C> = "tap" | {
    send: C;
};
export type Nudge = {
    dir: "left" | "right" | "up" | "down";
    big?: boolean;
};
export type Rules<B, G, R, C> = {
    word(b: B, g: G): Word | null;
    start(b: B, g: G): C | null;
    candidate(b: B, g: G, r: R): C | null;
    nudge(b: B, g: G, from: C, by: Nudge): C | null;
    steps(b: B, g: G): [string, Nudge][];
    says(b: B, g: G, c: C): string;
};
export declare const same: (a: unknown, b: unknown) => boolean;
export declare function step<C>(p: Phase<C>, e: Event<C>, start: C): [Phase<C>, Effect<C> | null];
