import { type ReactNode } from "react";
export type Attrs = Record<string, unknown> & {
    className?: string;
};
export declare const h: (tag: string, cls: string, attrs: Attrs | null, ...kids: ReactNode[]) => import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
