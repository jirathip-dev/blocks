import type { Kind } from "./types.ts";

export type Hook = { variant: string | null; parts: readonly string[] };

export const hooks: Record<Kind, Hook> = {
    screen: { variant: null, parts: ["title", "badge", "actions"] },
    modal: { variant: "variant", parts: ["title"] },
    sheet: { variant: "variant", parts: ["title"] },
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
    chart: { variant: null, parts: ["title"] },
    toast: { variant: null, parts: ["title"] },
    pages: { variant: null, parts: ["title"] },
    timeline: { variant: null, parts: ["title"] },
    import: { variant: null, parts: ["title"] },
    message: { variant: "role", parts: [] },
    tool: { variant: "state", parts: [] },
    sidebar: { variant: null, parts: [] },
    boxplot: { variant: null, parts: ["title"] },
    heat: { variant: null, parts: ["title"] },
    plot: { variant: null, parts: ["title"] },
};

export const roles: Record<string, string> = { modal: "dialog", sheet: "dialog", section: "region", form: "form", config: "form", nav: "navigation", chart: "figure", plot: "figure", toast: "status", message: "article", sidebar: "navigation", heat: "figure", boxplot: "figure" };

export const names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"] as const;

export const hosts: Record<string, string> = { screen: "blocks", modal: "blocks", sheet: "blocks", section: "blocks", card: "blocks", message: "blocks", list: "rows", scene: "lanes", row: "rounds", table: "rows" };

export const walked = ["blocks", "rows", "buttons", "rounds", "lanes"] as const;

export const finishes = ["surface", "tint", "button", "mark", "kind-label", "header-label", "group-label", "section-label", "title-label", "button-label", "chip-label", "back-label", "said-label", "picked-label", "screen-label"] as const;
