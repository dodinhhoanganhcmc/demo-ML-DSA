import { describe, expect, it } from "vitest";
import {
  BUNDLE_MAGIC,
  BundleError,
  decodeBundle,
  encodeBundle,
  sanitizeFilename,
  signedFileName,
  type BundleInput,
} from "./bundle";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function sample(overrides: Partial<BundleInput> = {}): BundleInput {
  return {
    v: 1,
    name: "report.pdf",
    type: "application/pdf",
    param_set: "ML-DSA-65",
    public_key: "bG9jYWwtcGt5LWJ5dGVz",
    signature: "c2lnbmF0dXJlLWJ5dGVz",
    message: encoder.encode("Meet me under the departure board at 07:45."),
    ...overrides,
  };
}

describe("encodeBundle / decodeBundle", () => {
  it("round-trips manifest, message and magic header", () => {
    const bytes = encodeBundle(sample());
    expect(decoder.decode(bytes.subarray(0, 8))).toBe(BUNDLE_MAGIC);

    const content = decodeBundle(bytes);
    expect(content.v).toBe(1);
    expect(content.name).toBe("report.pdf");
    expect(content.type).toBe("application/pdf");
    expect(content.param_set).toBe("ML-DSA-65");
    expect(content.public_key).toBe("bG9jYWwtcGt5LWJ5dGVz");
    expect(content.signature).toBe("c2lnbmF0dXJlLWJ5dGVz");
    expect(decoder.decode(content.message)).toBe(
      "Meet me under the departure board at 07:45.",
    );
    expect(content.bytes).toBe(content.message.length);
  });

  it("keeps arbitrary binary message bytes untouched", () => {
    const message = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) message[i] = i;
    const content = decodeBundle(encodeBundle(sample({ message })));
    expect(Array.from(content.message)).toEqual(Array.from(message));
  });

  it("accepts every parameter set", () => {
    for (const param_set of ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"] as const) {
      expect(decodeBundle(encodeBundle(sample({ param_set }))).param_set).toBe(param_set);
    }
  });

  it("rejects input that is not a container", () => {
    expect(() => decodeBundle(encoder.encode("%PDF-1.7 and some content"))).toThrow(
      BundleError,
    );
    expect(() => decodeBundle(encoder.encode("%PDF-1.7 and some content"))).toThrow(
      /magic header/,
    );
  });

  it("rejects a corrupted magic header", () => {
    const bytes = encodeBundle(sample());
    bytes[0] ^= 0x01;
    expect(() => decodeBundle(bytes)).toThrow(BundleError);
  });

  it("rejects a truncated file", () => {
    const bytes = encodeBundle(sample());
    expect(() => decodeBundle(bytes.subarray(0, 10))).toThrow(/Too short/);
    // cutting into the manifest region is caught by the container itself;
    // cutting only the message tail is caught by signature verification
    expect(() => decodeBundle(bytes.subarray(0, 20))).toThrow(/manifest length/);
  });

  it("rejects an out-of-range manifest length (allocation guard)", () => {
    const bytes = encodeBundle(sample());
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
      8,
      0x7fff_fff0,
      false,
    );
    expect(() => decodeBundle(bytes)).toThrow(/manifest length out of range/);
  });

  it("rejects a manifest that is not valid JSON", () => {
    const junk = encoder.encode("not-json!");
    const bytes = new Uint8Array(12 + junk.length);
    bytes.set(encoder.encode(BUNDLE_MAGIC), 0);
    new DataView(bytes.buffer).setUint32(8, junk.length, false);
    bytes.set(junk, 12);
    expect(() => decodeBundle(bytes)).toThrow(/not valid JSON/);
  });

  it("rejects missing manifest fields at decode time", () => {
    const missing = sample() as Partial<BundleInput>;
    delete missing.signature;
    expect(() => decodeBundle(encodeBundle(missing as BundleInput))).toThrow(
      /manifest fields/,
    );
  });

  it("rejects unknown parameter sets at encode time", () => {
    const badSet = sample({ param_set: "ML-DSA-99" as BundleInput["param_set"] });
    expect(() => encodeBundle(badSet)).toThrow(/Unknown parameter set/);
  });

  it("rejects unsupported versions and unknown sets at decode time", () => {
    for (const patch of [{ v: 2 }, { param_set: "ML-DSA-99" }]) {
      const manifest = encoder.encode(
        JSON.stringify({
          v: 1,
          name: "f.txt",
          type: "text/plain",
          param_set: "ML-DSA-65",
          public_key: "pk",
          signature: "sig",
          ...patch,
        }),
      );
      const bytes = new Uint8Array(12 + manifest.length);
      bytes.set(encoder.encode(BUNDLE_MAGIC), 0);
      new DataView(bytes.buffer).setUint32(8, manifest.length, false);
      bytes.set(manifest, 12);
      expect(() => decodeBundle(bytes)).toThrow(/manifest fields/);
    }
  });

  it("round-trips a message with null bytes and invalid UTF-8 sequences", () => {
    const message = new Uint8Array([0x00, 0xff, 0xfe, 0x80, 0xc3, 0x28, 0x00, 0x0a]);
    const content = decodeBundle(encodeBundle(sample({ message })));
    expect(Array.from(content.message)).toEqual(Array.from(message));
  });
});

describe("sanitizeFilename", () => {
  it("strips directory parts (path traversal stays client-side only)", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\windows\\system32\\evil.dll")).toBe("evil.dll");
    expect(sanitizeFilename("/var/log/auth.log")).toBe("auth.log");
    expect(sanitizeFilename("C:\\Users\\me\\notes.txt")).toBe("notes.txt");
  });

  it("removes NUL/control bytes and Windows-illegal characters", () => {
    expect(sanitizeFilename("rep\u0000ort\u001f.txt")).toBe("report.txt");
    expect(sanitizeFilename('a<b>:c"d|e?f*g.txt')).toBe("abcdefg.txt");
  });

  it("never starts with a dot (no .., no hidden files)", () => {
    expect(sanitizeFilename("..hidden")).toBe("hidden");
    expect(sanitizeFilename(".env")).toBe("env");
  });

  it("falls back to a safe name and caps the length", () => {
    expect(sanitizeFilename("")).toBe("message");
    expect(sanitizeFilename("../")).toBe("message");
    expect(sanitizeFilename("...")).toBe("message");
    expect(sanitizeFilename("a".repeat(300)).length).toBe(100);
  });
});

describe("signedFileName", () => {
  it("appends the .ml-dsa extension exactly once", () => {
    expect(signedFileName("photo.png")).toBe("photo.png.ml-dsa");
    expect(signedFileName("photo.png.ml-dsa")).toBe("photo.png.ml-dsa");
    expect(signedFileName("../../photo.png")).toBe("photo.png.ml-dsa");
  });
});
