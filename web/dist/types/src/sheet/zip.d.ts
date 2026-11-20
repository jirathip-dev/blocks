export type Entry = {
    name: string;
    data: Uint8Array;
};
export declare function unzip(b: Uint8Array): Promise<Map<string, Uint8Array> | null>;
export declare function zip(files: Entry[]): Uint8Array;
