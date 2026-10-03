import { describe, expect, it } from "vitest";
import {
  b64ToBytes,
  bytesToB64,
  flipByte,
  flipChar,
  formatBytes,
  toHex,
  utf8Bytes,
} from "./bytes";

describe("utf8Bytes", () => {
  it("counts one byte per ASCII character", () => {
    expect(utf8Bytes("abc").length).toBe(3);
  });

  it("counts multi-byte characters correctly", () => {
    expect(utf8Bytes("héllo").length).toBe(6); // é = 2 bytes
    expect(utf8Bytes("签名").length).toBe(6); // 2 CJK chars = 3 bytes each
  });

  it("returns zero bytes for an empty message", () => {
    expect(utf8Bytes("").length).toBe(0);
  });
});

describe("base64 round trip", () => {
  it("survives encode/decode", () => {
    const original = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) % 256);
    expect(b64ToBytes(bytesToB64(original))).toEqual(original);
  });

  it("handles empty input", () => {
    expect(b64ToBytes(bytesToB64(new Uint8Array(0)))).toHaveLength(0);
  });

  it("handles a chunk boundary (0x8000)", () => {
    const big = new Uint8Array(0x8000 + 13).fill(0xab);
    expect(b64ToBytes(bytesToB64(big))).toEqual(big);
  });
});

describe("toHex", () => {
  it("separates bytes with a single space", () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xa5, 0xff, 0x10]))).toBe(
      "00 0f a5 ff 10",
    );
  });

  it("respects the byte limit", () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5, 6]);
    expect(toHex(bytes, 4)).toBe("01 02 03 04");
  });

  it("returns an empty string for empty input", () => {
    expect(toHex(new Uint8Array(0))).toBe("");
  });
});

describe("tamper helpers", () => {
  it("flipByte changes exactly one byte, at the midpoint", () => {
    const original = Uint8Array.from([9, 9, 9, 9, 9]);
    const flipped = flipByte(original);
    expect(flipped).toHaveLength(original.length);
    const diffs = [...original].filter((b, i) => b !== flipped[i]);
    expect(diffs).toHaveLength(1);
    expect(flipped[2]).toBe(9 ^ 0xff);
    expect(original[2]).toBe(9); // source untouched
  });

  it("flipByte tolerates empty input", () => {
    expect(flipByte(new Uint8Array(0))).toHaveLength(0);
  });

  it("flipChar changes one visible character and keeps the string length", () => {
    const text = "departure board";
    const flipped = flipChar(text);
    expect(flipped).toHaveLength(text.length);
    expect([...flipped].filter((c, i) => c !== text[i])).toHaveLength(1);
  });

  it("flipChar produces a valid message from an empty one", () => {
    expect(flipChar("")).toBe("tampered");
  });
});

describe("formatBytes", () => {
  it("formats bytes, kibibytes and mebibytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(2048)).toBe("2.0 KiB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MiB");
  });
});
