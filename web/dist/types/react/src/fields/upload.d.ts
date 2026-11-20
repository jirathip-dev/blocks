import { type ReactNode } from "react";
import { type FileRow, type UploadField } from "../../../src/core/index.ts";
import { type FieldView } from "./_view.ts";
export declare function item(line: string, r: FileRow, w: (k: string) => string, drop: (r: FileRow) => void, again: (r: FileRow) => void, more?: ReactNode[]): import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare const upload: FieldView<UploadField>;
