export type Mode = "dark" | "light";
export type Token = "--bg" | "--card" | "--edge" | "--line" | "--scrim" | "--fg" | "--mute" | "--l" | "--link" | "--g" | "--a" | "--r" | "--p" | "--c" | "--fk-l" | "--fk-p" | "--fk-c" | "--fk-g" | "--fk-a";
export type Scheme = {
    label: string;
    "color-scheme": Mode;
    tokens: Record<Token, string>;
};
export declare const defaultPair: Record<Mode, Scheme>;
export declare const defaultStyle: Record<string, string>;
export declare const rules: {
    type: {
        default: string;
        mono: string;
        serif: string;
    };
    surface: {
        glass: string;
        dashed: string;
        solid: string;
    };
    fills: {
        tint: string;
        outline: string;
        solid: string;
    };
    buttons: {
        plain: string;
        filled: string;
    };
    marks: {
        symbols: string;
        text: string;
    };
    sections: {
        title: string;
        quiet: string;
    };
};
export declare const curves: {
    standard: string;
    calm: string;
    bouncy: string;
};
export declare const cases: {
    "as-is": string;
    lower: string;
    upper: string;
};
export declare const drawn: {
    header: string;
    section: string;
    title: string;
    button: string;
    chip: string;
    picked: string;
    screen: string;
};
type Label = {
    prefix?: string;
    suffix?: string;
    case?: keyof typeof cases;
};
export type Axes = {
    [K in keyof typeof rules]?: keyof (typeof rules)[K];
};
export type Scale = Axes & {
    space?: number;
    motion?: number;
    radius?: number;
    easing?: keyof typeof curves;
    labels?: Record<string, Label>;
};
export {};
