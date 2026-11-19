export type Fault = {
    fault: "twice";
    at: string[];
    id: string;
} | {
    fault: "act-twice";
    action: string;
    at: string[];
    block: string;
} | {
    fault: "unnamed";
    kind: string;
} | {
    fault: "unknown";
    kind: string;
} | {
    fault: "shape";
    kind: string;
    why: string;
} | {
    fault: "extra";
    field: string;
    kind: string;
} | {
    fault: "clash";
    kind: string;
} | {
    fault: "bare";
    id: string;
    kind: string;
} | {
    fault: "state";
    key: string;
} | {
    fault: "link";
    at: string;
    url: string;
};
export type Shape = boolean | {
    type?: string | string[];
    $ref?: string;
    properties?: Record<string, Shape>;
    required?: string[];
    anyOf?: Shape[];
    oneOf?: Shape[];
    items?: Shape;
    additionalProperties?: Shape;
    const?: unknown;
    enum?: unknown[];
    not?: Shape;
    minimum?: number;
    maximum?: number;
    minItems?: number;
    maxItems?: number;
};
export declare const kinds: Record<string, string>;
export declare const defs: Record<string, Shape>;
