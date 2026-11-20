export type Line = {
    n: number;
    cells: string[];
};
export type Book = {
    sheets: string[];
    sheet: number;
    head: string[];
    rows: Line[];
    enc: string;
};
export declare function read(name: string, b: Uint8Array, pick?: number): Promise<Book | "old" | "not">;
