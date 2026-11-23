export declare function hits(text: string, q: string): boolean;
export declare function typing(send: (q: string) => unknown, busy: (on: boolean) => void): {
    key: (q: string) => void;
    now: (q: string) => void;
};
type Blk = Record<string, unknown>;
export type Seek = {
    name: string;
    q: string;
    n: number;
    m: number;
};
export declare function said(r: unknown): string;
export declare function seeks(screen: unknown, state: Blk): Record<string, Seek>;
export {};
