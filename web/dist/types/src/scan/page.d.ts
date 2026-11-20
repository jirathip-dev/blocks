export type Pt = [x: number, y: number];
export type Quad = [Pt, Pt, Pt, Pt];
export type Img = {
    width: number;
    height: number;
    data: Uint8ClampedArray<ArrayBuffer>;
};
export type Jpeg = {
    bytes: Uint8Array;
    width: number;
    height: number;
};
export declare const A4: Pt;
export declare function corners(img: Img): Quad | undefined;
export declare function warp(img: Img, q: Quad, [width, height]?: Pt): Img;
export declare const turn: ([a, b, c, d]: Quad) => Quad;
export declare const inset: (w: number, h: number) => Quad;
export declare function pdf(pages: Jpeg[]): Blob;
