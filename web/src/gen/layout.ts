
export type LayoutEdit = { edit: "move"; before?: string | null; id: string; into: string; slot: string } | { edit: "swap"; a: string; b: string } | { edit: "show"; id: string; place: LayoutPlace; size: SizeClass };

export type LayoutPlace = "push" | "sheet" | "panel" | "column" | "strip" | "cards" | "menu" | "inline" | "hidden";

export type SizeClass = "compact" | "wide";

export type LayoutTransition = "push" | "sheet" | "fade" | "none";
