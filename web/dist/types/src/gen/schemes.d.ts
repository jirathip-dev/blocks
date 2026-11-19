export type Mode = "dark" | "light";
export type Token = "--bg" | "--card" | "--edge" | "--line" | "--scrim" | "--fg" | "--mute" | "--l" | "--link" | "--g" | "--a" | "--r" | "--p" | "--c" | "--fk-l" | "--fk-p" | "--fk-c" | "--fk-g" | "--fk-a";
export type Scheme = {
    label: string;
    "color-scheme": Mode;
    tokens: Record<Token, string>;
};
export declare const defaultPair: Record<Mode, Scheme>;
export declare const defaultStyle: Record<string, string>;
