/// A fresh random id for one composer send: 128 bits as hex, off a secure context too.
export const nonce = (): string => Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
