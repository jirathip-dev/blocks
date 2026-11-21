import type { Store } from "../render/ctx.ts";

/// The page's localStorage as a Store; a browser that refuses it keeps nothing.
export function local(): Store {
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    put: (k, v) => {
      try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {
        return;
      }
    },
  };
}
