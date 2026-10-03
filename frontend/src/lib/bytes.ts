/** Byte-level helpers. Tampering drills flip real bytes so the rejection the
 *  demo shows is a genuine cryptographic failure, not a UI trick. */

export const MAX_MESSAGE_BYTES = 1024 * 1024; // matches backend demo guard

export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function toHex(bytes: Uint8Array, limit?: number): string {
  const view = limit === undefined ? bytes : bytes.subarray(0, limit);
  const parts: string[] = [];
  for (let i = 0; i < view.length; i += 1) {
    parts.push(view[i].toString(16).padStart(2, "0"));
  }
  return parts.join(" ");
}

/** Flip one byte at the midpoint — a single-bit-difference tampered input. */
export function flipByte(bytes: Uint8Array): Uint8Array {
  const copy = Uint8Array.from(bytes);
  if (copy.length === 0) return copy;
  const at = Math.floor(copy.length / 2);
  copy[at] ^= 0xff;
  return copy;
}

/** Flip a visible character in text mode (keeps the string valid UTF-8). */
export function flipChar(text: string): string {
  if (text.length === 0) return "tampered";
  const at = Math.floor(text.length / 2);
  const ch = text[at] === "!" ? "~" : "!";
  return text.slice(0, at) + ch + text.slice(at + 1);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}
