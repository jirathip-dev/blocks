import { type Fault } from "../gen/shapes.ts";
import type { Built } from "./built.ts";
export declare const linkable: (url: string) => boolean;
export declare function check(screen: unknown, app?: readonly string[]): Fault[];
export declare function actions(screen: Built): string[];
