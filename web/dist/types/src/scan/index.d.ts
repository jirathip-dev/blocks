import { type Quad } from "./page.ts";
export type Shot = {
    src: Blob;
    photo: ImageBitmap;
};
export type Page = Shot & {
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
export declare const quadOf: (src: Blob) => Promise<Shot & {
    quad: Quad;
}>;
export declare const pageOf: ({ src, photo }: Shot, quad: Quad, auto: Quad) => Promise<Page>;
export declare function scan(o: Opts): Promise<Scanned | undefined>;
