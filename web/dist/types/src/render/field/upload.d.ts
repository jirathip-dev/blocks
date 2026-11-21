import { type FileRow } from "../../core/field/files.ts";
import type { UploadField } from "../../gen/types.ts";
import { type FieldView } from "./_view.ts";
export declare function item(line: string, r: FileRow, w: (k: string) => string, drop: (r: FileRow) => void, again: (r: FileRow) => void, more?: HTMLElement[]): HTMLElement;
export declare const upload: FieldView<UploadField>;
