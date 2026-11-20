import type { Accept, FileRef, UploadField } from "../../gen/types.ts";
export type Picked = {
    screen: string;
    block?: string | undefined;
    field: string;
    name: string;
    mime: string;
    size: number;
    progress: (part: number) => void;
    signal: AbortSignal;
};
export type OnFile = (file: Blob, about: Picked) => Promise<FileRef>;
export type FileState = "done" | "uploading" | "failed" | "refused";
export type FileRow = {
    name: string;
    size: number;
    mime: string;
    state: FileState;
    part: number;
    why?: "type" | "size" | undefined;
    id?: string;
    src?: string | undefined;
    blob?: Blob | undefined;
    stop?: AbortController;
};
type Word = (key: string) => string;
export declare const fill: (text: string, v: Record<string, unknown>) => string;
export declare const accepts: (accept?: Accept[]) => string;
export declare function refused(x: UploadField, name: string, mime: string, size: number): "type" | "size" | undefined;
export declare const sized: (n: number) => string;
export declare function hint(x: UploadField, w: Word, on: boolean): string;
export declare function pick(x: UploadField, rows: FileRow[], w: Word): string;
export declare function status(x: UploadField, r: FileRow, w: Word): string;
export declare const held: (x: UploadField) => FileRow[];
export declare const ids: (rows: FileRow[]) => string[];
export declare const waits: (rows: FileRow[]) => {
    up: number;
    failed: number;
};
export declare function picked(x: UploadField, rows: FileRow[], files: Blob[], names: string[]): {
    rows: FileRow[];
    send: FileRow[];
};
export declare function send(r: FileRow, file: OnFile, about: Omit<Picked, "name" | "mime" | "size" | "progress" | "signal">, again: () => void): void;
export {};
