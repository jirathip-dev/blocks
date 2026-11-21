import type { SideBadge, Sidebar } from "../../gen/types.ts";
export declare const sideTitle: (b: Sidebar) => string;
export declare const sideIcon: (l: {
    label: string;
    icon?: string | null | undefined;
}) => [string, boolean];
export declare const sideCount: (b: SideBadge) => [string, string];
