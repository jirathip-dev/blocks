import { type Quad } from "./page.ts";
export type Page = {
    photo: ImageBitmap;
    quad: Quad;
    auto: Quad;
    jpeg: Uint8Array<ArrayBuffer>;
    url: string;
};
export type Scanned = {
    pdf: Blob;
    pages: Page[];
};
export type Opts = {
    label: string;
    max: number;
    w(key: string): string;
    pages?: Page[] | undefined;
};
export declare const quadOf: (photo: ImageBitmap) => Promise<{
    photo: ImageBitmap;
    quad: Quad;
}>;
export declare const pageOf: (photo: ImageBitmap, quad: Quad, auto: Quad) => Promise<Page>;
export declare function scan(o: Opts): Promise<Scanned | undefined>;
