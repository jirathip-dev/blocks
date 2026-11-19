import type { Kind } from "./types.ts";

export type Hook = { variant: string | null; parts: readonly string[] };

export const hooks: Record<Kind, Hook> = {
    screen: { variant: null, parts: ["title", "badge", "actions"] },
    sheet: { variant: null, parts: ["title"] },
    section: { variant: null, parts: [] },
    list: { variant: null, parts: [] },
    row: { variant: "style", parts: ["title", "subtitle", "badge", "value", "figure", "actions"] },
    card: { variant: "kind", parts: ["title", "subtitle", "badge", "actions"] },
    choice: { variant: null, parts: [] },
    form: { variant: null, parts: [] },
    config: { variant: null, parts: [] },
    secret: { variant: null, parts: [] },
    run: { variant: null, parts: [] },
    button: { variant: "style", parts: [] },
    chips: { variant: null, parts: [] },
    stat: { variant: null, parts: ["value"] },
    text: { variant: "style", parts: [] },
    images: { variant: "size", parts: [] },
    web: { variant: null, parts: [] },
    diff: { variant: null, parts: [] },
    editor: { variant: null, parts: [] },
    scene: { variant: null, parts: [] },
    diagram: { variant: null, parts: ["title"] },
    composer: { variant: null, parts: [] },
    lines: { variant: null, parts: [] },
    prose: { variant: null, parts: [] },
    hero: { variant: null, parts: ["title", "subtitle", "actions"] },
    media: { variant: null, parts: [] },
    nav: { variant: null, parts: [] },
    island: { variant: null, parts: [] },
    table: { variant: null, parts: ["title"] },
    steps: { variant: null, parts: ["title"] },
};

export const roles: Record<string, string> = { section: "region", form: "form", config: "form", nav: "navigation" };

export const names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"] as const;
