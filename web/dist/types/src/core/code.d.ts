import { type Scale } from "../gen/schemes.ts";
export type Decoded = {
    style: Scale;
    scheme: string | null;
};
export declare function encode(style: Scale, scheme?: string | null): string;
export declare function decode(code: string): Decoded;
