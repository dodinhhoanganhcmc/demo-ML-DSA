"use client";
import { useEffect, useRef, useState } from "react";
import { api, type ParamSet } from "@/lib/api";
import { parsePublicKey, PUBLIC_KEY_BYTES } from "@/lib/public-key";

export function PublicKeyInput({ line, activeKey, disabled, onAccept }: {
  line: ParamSet; activeKey: string; disabled: boolean; onAccept: (key: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [encoding, setEncoding] = useState<"base64" | "hex">("base64");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function accept() {
    try {
      const key = parsePublicKey(draft, encoding, line);
      onAccept(key);
      setMessage("Key format accepted. Verify the signature to check whether it matches.");
    } catch (e) { setMessage((e as Error).message); }
  }
  async function randomKey() {
    setGenerating(true);
    setMessage("");
    try {
      const pair = await api.keygen(line);
      if (!mounted.current) return;
      const key = parsePublicKey(pair.public_key, "base64", line);
      setDraft(key); setEncoding("base64"); onAccept(key);
      setMessage("New random public key selected. It will not match signatures made with another key.");
    } catch (e) { setMessage((e as Error).message); }
    finally { setGenerating(false); }
  }
  return <fieldset className="drills" style={{ minWidth: 0 }} disabled={disabled || generating}>
    <legend>Verification public key</legend>
    <label htmlFor="active-public-key">Active public key (Base64)</label>
    <textarea id="active-public-key" readOnly value={activeKey} rows={3} style={{ width: "100%", minWidth: 0 }} />
    <p>Full {line} key: {PUBLIC_KEY_BYTES[line]} bytes. A 64-byte prefix is not sufficient.</p>
    <label htmlFor="key-encoding">Input encoding</label>
    <select id="key-encoding" value={encoding} onChange={(e) => { setEncoding(e.target.value as "base64" | "hex"); setMessage(""); }}>
      <option value="base64">Base64</option><option value="hex">Hex</option>
    </select>
    <label htmlFor="public-key-input">Enter complete public key</label>
    <textarea id="public-key-input" value={draft} maxLength={16000} rows={4} spellCheck={false} style={{ width: "100%", minWidth: 0 }} onChange={(e) => { setDraft(e.target.value); setMessage(""); }} />
    <div className="actions">
      <button type="button" className="btn btn--line" onClick={accept}>Validate and use key</button>
      <button type="button" className="btn btn--line" onClick={randomKey}>{generating ? "Generating…" : "Generate random verification key"}</button>
      <button type="button" className="btn btn--line" onClick={() => { onAccept(null); setMessage("Restored session or file public key."); }}>Use session / file key</button>
    </div>
    <p role="status">{message}</p>
  </fieldset>;
}
