import type { Modal } from "../../gen/types.ts";
import type { Rules } from "../gesture.ts";
export type Place = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type ModalGrab = "head" | "corner" | "edge" | "handle";
export type Framed = {
    b: Modal;
    at: Place;
    vw: number;
    vh: number;
};
export type ModalReach = {
    dx: number;
    dy: number;
};
export declare const variant: (b: Modal) => "dialog" | "alert" | "tool";
export declare function clamp(p: Place, vw: number, vh: number): Place;
export declare const gone: (f: Framed) => number;
export declare const modal: Rules<Framed, ModalGrab, ModalReach, Place>;
