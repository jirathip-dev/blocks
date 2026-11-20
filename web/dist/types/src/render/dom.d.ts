export declare const esc: (s: unknown) => string;
export declare const nodes: (html: string) => ChildNode[];
export declare const el: <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) => HTMLElementTagNameMap[K];
export declare const h: <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...kids: (Node | string)[]) => HTMLElementTagNameMap[K];
export declare const href: (a: HTMLAnchorElement, url: string) => HTMLAnchorElement & {
    href: string;
    target: string;
    rel: string;
};
export declare const btn: (label: unknown, cls?: string, url?: string, action?: unknown) => (HTMLAnchorElement & {
    href: string;
    target: string;
    rel: string;
}) | (HTMLButtonElement & {
    type: string;
});
