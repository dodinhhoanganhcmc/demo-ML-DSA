/**
 * `.ml-dsa` signed-file container — encoded and decoded entirely in the
 * browser (stateless design: the backend only ever sees message BYTES and a
 * signature as JSON; it never stores files, so no server-side path exists to
 * traverse — see the backend's static-sink guard test).
 *
 * Binary layout, big-endian integers:
 *
 *   offset  size   content
 *   0       8      magic  "MLDSAB01" (ASCII)
 *   8       4      u32    manifest length in bytes
 *   12      N      manifest, UTF-8 JSON (BundleManifest)
 *   12+N    rest   original message bytes, byte-for-byte untouched
 *
 * The manifest embeds the public key, so a container verifies standalone —
 * no key pair from the signing session is required on the verifying side.
 */

export const BUNDLE_MAGIC = "MLDSAB01";

const HEADER_BYTES = 12;
/** Manifests are tiny (~7 KB with keys); anything bigger is corruption. */
const MAX_MANIFEST_BYTES = 64 * 1024;
const PARAM_SETS = ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"] as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const MAGIC_BYTES = textEncoder.encode(BUNDLE_MAGIC);

export class BundleError extends Error {}

export type BundleParamSet = (typeof PARAM_SETS)[number];

export interface BundleManifest {
  v: 1;
  /** Original file name (display + download only — never sent to a server). */
  name: string;
  /** Original MIME type, best effort ("application/octet-stream" if unknown). */
  type: string;
  param_set: BundleParamSet;
  /** Base64 ML-DSA public key that produced the signature. */
  public_key: string;
  /** Base64 ML-DSA signature over the message bytes below. */
  signature: string;
}

export interface BundleInput extends BundleManifest {
  message: Uint8Array;
}

export interface BundleContent extends BundleManifest {
  message: Uint8Array;
  bytes: number;
}

export function encodeBundle(input: BundleInput): Uint8Array {
  if (!PARAM_SETS.includes(input.param_set)) {
    throw new BundleError(`Unknown parameter set: ${input.param_set}`);
  }
  const manifest: BundleManifest = {
    v: 1,
    name: input.name,
    type: input.type,
    param_set: input.param_set,
    public_key: input.public_key,
    signature: input.signature,
  };
  const manifestBytes = textEncoder.encode(JSON.stringify(manifest));
  if (manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new BundleError("Container manifest too large.");
  }
  const out = new Uint8Array(HEADER_BYTES + manifestBytes.length + input.message.length);
  out.set(MAGIC_BYTES, 0);
  new DataView(out.buffer).setUint32(8, manifestBytes.length, false);
  out.set(manifestBytes, HEADER_BYTES);
  out.set(input.message, HEADER_BYTES + manifestBytes.length);
  return out;
}

export function decodeBundle(bytes: Uint8Array): BundleContent {
  if (bytes.length < HEADER_BYTES) {
    throw new BundleError("Too short to be an .ml-dsa file.");
  }
  for (let i = 0; i < MAGIC_BYTES.length; i += 1) {
    if (bytes[i] !== MAGIC_BYTES[i]) {
      throw new BundleError("Not an .ml-dsa signed file (wrong magic header).");
    }
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const manifestLen = view.getUint32(8, false);
  if (manifestLen > MAX_MANIFEST_BYTES || manifestLen > bytes.length - HEADER_BYTES) {
    throw new BundleError("Corrupt container: manifest length out of range.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      textDecoder.decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + manifestLen)),
    );
  } catch {
    throw new BundleError("Corrupt container: manifest is not valid JSON.");
  }

  const m = parsed as Partial<BundleManifest>;
  if (
    m.v !== 1 ||
    typeof m.name !== "string" ||
    typeof m.type !== "string" ||
    typeof m.public_key !== "string" ||
    typeof m.signature !== "string" ||
    typeof m.param_set !== "string" ||
    !(PARAM_SETS as readonly string[]).includes(m.param_set)
  ) {
    throw new BundleError("Corrupt container: manifest fields are missing or invalid.");
  }

  const messageStart = HEADER_BYTES + manifestLen;
  return {
    v: 1,
    name: m.name,
    type: m.type,
    param_set: m.param_set as BundleParamSet,
    public_key: m.public_key,
    signature: m.signature,
    message: bytes.slice(messageStart),
    bytes: bytes.length - messageStart,
  };
}

/**
 * Defence in depth for the download attribute: drop any directory part
 * (`../`, absolute paths, backslashes), control/NUL bytes and characters
 * Windows refuses, and never start the name with a dot. Browsers sanitise
 * `download` too — this keeps the file we ask for sane on every platform.
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/^\.+/, "")
    .trim();
  return (cleaned || "message").slice(0, 100);
}

export function signedFileName(original: string): string {
  const safe = sanitizeFilename(original);
  return safe.toLowerCase().endsWith(".ml-dsa") ? safe : `${safe}.ml-dsa`;
}
