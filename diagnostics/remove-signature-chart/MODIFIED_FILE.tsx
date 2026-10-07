"use client";

import { useRef, useState } from "react";
import { b64ToBytes, toHex } from "@/lib/bytes";

const HEX_WINDOW = 96; // bytes shown per specimen plate

export function Specimen({
  publicKey,
  signature,
}: {
  publicKey?: string;
  signature?: string;
}) {
  const pk = publicKey ? b64ToBytes(publicKey) : undefined;
  const sig = signature ? b64ToBytes(signature) : undefined;
  const prefix = pk && pk.length >= 64 ? toHex(pk, 64).replaceAll(" ", "") : "";
  const prefixInput = useRef<HTMLTextAreaElement>(null);
  const [copyResult, setCopyResult] = useState<{ value: string; message: string } | null>(null);

  async function copyPrefix() {
    if (!prefix) return;
    try {
      await navigator.clipboard.writeText(prefix);
      setCopyResult({ value: prefix, message: "Copied 64 bytes (128 hex characters)." });
    } catch {
      prefixInput.current?.focus();
      prefixInput.current?.select();
      setCopyResult({ value: prefix, message: "Select and copy the hex below with Ctrl+C (or long-press on mobile)." });
    }
  }

  return (
    <section className="specimen" id="specimen" aria-label="Key and signature specimen">
      <div className="shell">
        <div className="specimen__head">
          <h2 className="section-title">Specimen</h2>
          <p className="lede specimen__lede">
            Public key and signature bytes from this session, shown as hex.
          </p>
        </div>

        <div className="specimen__grid">
          <div className="hex">
            <span className="hex__label">
              Public key · {pk ? `${pk.length} B` : "not generated"} · first{" "}
              {HEX_WINDOW} B hex
            </span>
            <p className="hex__body">
              {pk ? toHex(pk, HEX_WINDOW) : "— generate a key pair —"}
            </p>
            <button type="button" className="btn btn--line" disabled={!prefix} onClick={copyPrefix}>
              Copy first 64 bytes of public key
            </button>
            {prefix && (
              <textarea
                ref={prefixInput}
                aria-label="Public key first 64 bytes (hex)"
                className="hex__body"
                readOnly
                value={prefix}
                rows={4}
                spellCheck={false}
                style={{ width: "100%", resize: "vertical" }}
              />
            )}
            <p className="field-bars__caption">Hex prefix for comparison only. Signature verification uses the complete public key.</p>
            <p role="status">{copyResult?.value === prefix ? copyResult.message : ""}</p>
          </div>

          <div className="hex">
            <span className="hex__label">
              Signature · {sig ? `${sig.length} B` : "not signed"} · first{" "}
              {HEX_WINDOW} B hex
            </span>
            <p className="hex__body">
              {sig ? toHex(sig, HEX_WINDOW) : "— sign a message —"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
