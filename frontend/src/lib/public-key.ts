import { b64ToBytes, bytesToB64 } from "./bytes";
import type { ParamSet } from "./api";

export const PUBLIC_KEY_BYTES: Record<ParamSet, number> = {
  "ML-DSA-44": 1312, "ML-DSA-65": 1952, "ML-DSA-87": 2592,
};

export function parsePublicKey(input: string, encoding: "base64" | "hex", line: ParamSet): string {
  const value = input.replace(/\s/g, "");
  const size = PUBLIC_KEY_BYTES[line];
  let bytes: Uint8Array;
  if (encoding === "hex") {
    if (value.length !== size * 2 || !/^[0-9a-f]+$/i.test(value)) {
      throw new Error(`${line} requires ${size * 2} hex characters (${size} bytes).`);
    }
    bytes = Uint8Array.from(value.match(/../g)!, (pair) => parseInt(pair, 16));
  } else {
    if (value.length !== 4 * Math.ceil(size / 3) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      throw new Error(`${line} requires a complete Base64 public key (${size} bytes).`);
    }
    try { bytes = b64ToBytes(value); } catch { throw new Error("Invalid Base64 public key."); }
    if (bytes.length !== size || bytesToB64(bytes) !== value) {
      throw new Error(`Invalid Base64 encoding or key length; expected ${size} bytes.`);
    }
  }
  return bytesToB64(bytes);
}
