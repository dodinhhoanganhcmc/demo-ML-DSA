import { describe, expect, it } from "vitest";
import { parsePublicKey, PUBLIC_KEY_BYTES } from "./public-key";
import { bytesToB64 } from "./bytes";
import type { ParamSet } from "./api";

describe("public key encoding validation", () => {
  it.each(Object.keys(PUBLIC_KEY_BYTES) as ParamSet[])("accepts exact Base64 and hex for %s", (line) => {
    const size = PUBLIC_KEY_BYTES[line];
    const expected = bytesToB64(new Uint8Array(size).fill(171));
    expect(parsePublicKey(expected, "base64", line)).toBe(expected);
    expect(parsePublicKey("ab ".repeat(size), "hex", line)).toBe(expected);
    expect(() => parsePublicKey("ab".repeat(64), "hex", line)).toThrow();
    expect(() => parsePublicKey(expected.slice(4), "base64", line)).toThrow();
    expect(() => parsePublicKey("gg".repeat(size), "hex", line)).toThrow();
  });
  it("rejects a key from a different parameter set and malformed Base64", () => {
    const key = bytesToB64(new Uint8Array(1312));
    expect(() => parsePublicKey(key, "base64", "ML-DSA-65")).toThrow();
    expect(() => parsePublicKey("!" + key.slice(1), "base64", "ML-DSA-44")).toThrow();
    expect(() => parsePublicKey("", "base64", "ML-DSA-44")).toThrow();
  });
});
