"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type Encoding,
  type KeygenResponse,
  type ParamSet,
  type ParamsResponse,
  type SignResponse,
  type VerifyResponse,
} from "@/lib/api";
import Footer from "@/components/Footer";
import {
  MAX_MESSAGE_BYTES,
  b64ToBytes,
  bytesToB64,
  flipByte,
  flipChar,
  formatBytes,
  utf8Bytes,
} from "@/lib/bytes";
import {
  BundleError,
  decodeBundle,
  encodeBundle,
  sanitizeFilename,
  signedFileName,
} from "@/lib/bundle";
import { Board } from "./Board";
import { Compare } from "./Compare";
import { RouteStrip, type Station } from "./RouteStrip";
import { Specimen } from "./Specimen";
import { PublicKeyInput } from "./PublicKeyInput";

const LINES: { id: ParamSet; color: string }[] = [
  { id: "ML-DSA-44", color: "var(--line-44)" },
  { id: "ML-DSA-65", color: "var(--line-65)" },
  { id: "ML-DSA-87", color: "var(--line-87)" },
];

const DEFAULT_MESSAGE = "Meet me under the departure board at 07:45.";

type Busy = null | "keygen" | "sign" | "verify" | "file";
type Mode = "text" | "file";
type Backup =
  | { kind: "text"; value: string }
  | { kind: "file"; value: string }
  | null;

interface LoadedFile {
  name: string;
  type: string;
  bytes: number;
  b64: string;
}

/** A `.ml-dsa` container opened for verification (stateless interchange). */
interface OpenedBundle {
  name: string;
  type: string;
  paramSet: ParamSet;
  publicKey: string;
  signature: string;
  messageB64: string;
  bytes: number;
  signatureBytes: number;
}

function stamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function messageOfError(e: unknown): string {
  return e instanceof Error ? e.message : "Unexpected error";
}

export function Demo() {
  // line + mode
  const [line, setLine] = useState<ParamSet>("ML-DSA-65");
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState(DEFAULT_MESSAGE);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [opened, setOpened] = useState<OpenedBundle | null>(null);

  // crypto state
  const [keys, setKeys] = useState<KeygenResponse | null>(null);
  const [freshKeys, setFreshKeys] = useState<KeygenResponse | null>(null);
  const [sig, setSig] = useState<SignResponse | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [usedFreshKey, setUsedFreshKey] = useState(false);
  const [customPublicKey, setCustomPublicKey] = useState<string | null>(null);

  // drill backups (so a demo can be replayed)
  const [msgBackup, setMsgBackup] = useState<Backup>(null);
  const [sigBackup, setSigBackup] = useState<SignResponse | null>(null);

  // transport state
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<"unknown" | "online" | "offline">("unknown");
  const [params, setParams] = useState<ParamsResponse | null>(null);
  const [sessionStamp, setSessionStamp] = useState("session not started");

  const lineDef = LINES.find((l) => l.id === line) ?? LINES[1];
  const paramInfo = params?.param_sets.find((p) => p.name === line);

  const messageBytes = useMemo(
    () => (mode === "text" ? utf8Bytes(text).length : (file?.bytes ?? 0)),
    [mode, text, file],
  );
  const overLimit = messageBytes > MAX_MESSAGE_BYTES;
  const messagePayload = useMemo<{ message: string; encoding: Encoding }>(
    () =>
      mode === "text"
        ? { message: text, encoding: "utf8" }
        : { message: file?.b64 ?? "", encoding: "base64" },
    [mode, text, file],
  );

  // API availability + standard reference sizes (fetched, never hardcoded)
  useEffect(() => {
    let alive = true;
    api
      .health()
      .then(() => alive && setHealth("online"))
      .catch(() => alive && setHealth("offline"));
    api
      .params()
      .then((p) => alive && setParams(p))
      .catch(() => alive && setError("Could not load /api/params — is the backend running?"));
    return () => {
      alive = false;
    };
  }, []);

  function resetRoute() {
    setCustomPublicKey(null);
    setKeys(null);
    setFreshKeys(null);
    setSig(null);
    setResult(null);
    setUsedFreshKey(false);
    setMsgBackup(null);
    setSigBackup(null);
    setOpened(null);
    setNotice(null);
  }

  function pickLine(next: ParamSet) {
    if (next === line) return;
    setLine(next);
    setError(null);
    resetRoute();
  }

  async function runKeygen() {
    setBusy("keygen");
    setError(null);
    setNotice(null);
    try {
      const next = await api.keygen(line);
      setKeys(next);
      setCustomPublicKey(null);
      setFreshKeys(null);
      setSig(null);
      setResult(null);
      setUsedFreshKey(false);
      setMsgBackup(null);
      setSigBackup(null);
      setOpened(null);
      setSessionStamp(stamp());
    } catch (e) {
      setError(messageOfError(e));
    } finally {
      setBusy(null);
    }
  }

  async function runSign() {
    if (!keys) return;
    setBusy("sign");
    setError(null);
    setNotice(null);
    try {
      const signed = await api.sign(
        line,
        keys.secret_key,
        messagePayload.message,
        messagePayload.encoding,
      );
      setSig(signed);
      setResult(null);
      setSessionStamp(stamp());
    } catch (e) {
      setError(messageOfError(e));
    } finally {
      setBusy(null);
    }
  }

  async function runVerify(withFreshKey = false) {
    if (!keys || !sig) return;
    setBusy("verify");
    setError(null);
    try {
      const publicKey = withFreshKey && freshKeys ? freshKeys.public_key : customPublicKey ?? keys.public_key;
      const checked = await api.verify(
        line,
        publicKey,
        messagePayload.message,
        sig.signature,
        messagePayload.encoding,
      );
      setResult(checked);
      setUsedFreshKey(withFreshKey);
      setSessionStamp(stamp());
      if (!withFreshKey) setNotice(null);
    } catch (e) {
      setError(messageOfError(e));
    } finally {
      setBusy(null);
    }
  }

  // --- tamper drills -------------------------------------------------------

  function drillMessage() {
    if (mode === "text") {
      if (msgBackup === null) setMsgBackup({ kind: "text", value: text });
      setText(flipChar(text));
    } else if (file) {
      if (msgBackup === null) setMsgBackup({ kind: "file", value: file.b64 });
      setFile({ ...file, b64: bytesToB64(flipByte(b64ToBytes(file.b64))) });
    }
    setResult(null);
    setNotice("Message tampered: one byte flipped. Verify to watch the line reject it.");
  }

  function restoreMessage() {
    if (msgBackup?.kind === "text") setText(msgBackup.value);
    if (msgBackup?.kind === "file" && file) setFile({ ...file, b64: msgBackup.value });
    setMsgBackup(null);
    setResult(null);
    setNotice(null);
  }

  function drillSignature() {
    if (!sig) return;
    if (sigBackup === null) setSigBackup(sig);
    const bytes = b64ToBytes(sig.signature);
    setSig({ ...sig, signature: bytesToB64(flipByte(bytes)) });
    setResult(null);
    setNotice("Signature tampered: one byte flipped. Verify to watch the line reject it.");
  }

  function restoreSignature() {
    if (sigBackup) setSig(sigBackup);
    setSigBackup(null);
    setResult(null);
    setNotice(null);
  }

  async function drillWrongKey() {
    if (!keys || !sig) return;
    setBusy("verify");
    setError(null);
    try {
      let alternative = freshKeys;
      if (!alternative) {
        alternative = await api.keygen(line);
        setFreshKeys(alternative);
      }
      const checked = await api.verify(
        line,
        alternative.public_key,
        messagePayload.message,
        sig.signature,
        messagePayload.encoding,
      );
      setResult(checked);
      setUsedFreshKey(true);
      setSessionStamp(stamp());
      setNotice(
        "Verified against a freshly generated key pair: same message, same signature, wrong public key.",
      );
    } catch (e) {
      setError(messageOfError(e));
    } finally {
      setBusy(null);
    }
  }

  async function loadFile(next: File | null) {
    if (!next) return;
    if (next.size > MAX_MESSAGE_BYTES) {
      setError(
        `${next.name} is ${formatBytes(next.size)}; this demo accepts files up to ${formatBytes(
          MAX_MESSAGE_BYTES,
        )}.`,
      );
      return;
    }
    setBusy("file");
    setError(null);
    try {
      const buffer = new Uint8Array(await next.arrayBuffer());
      setFile({
        name: next.name,
        type: next.type || "application/octet-stream",
        bytes: buffer.length,
        b64: bytesToB64(buffer),
      });
      setMsgBackup(null);
      setResult(null);
      setSessionStamp(stamp());
    } finally {
      setBusy(null);
    }
  }

  // --- signed-file interchange (stateless: everything happens in this tab) --

  function triggerDownload(data: Blob, filename: string) {
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const canDownloadSigned =
    mode === "file" &&
    file !== null &&
    sig !== null &&
    keys !== null &&
    msgBackup === null &&
    sigBackup === null &&
    !overLimit;

  function downloadSignedFile() {
    if (!file || !sig || !keys) return;
    setError(null);
    try {
      const container = encodeBundle({
        v: 1,
        name: file.name,
        type: file.type,
        param_set: line,
        public_key: keys.public_key,
        signature: sig.signature,
        message: b64ToBytes(file.b64),
      });
      const filename = signedFileName(file.name);
      triggerDownload(
        // wrap: TS 5.7 types plain Uint8Array as ArrayBufferLike
        new Blob([new Uint8Array(container)], {
          type: "application/octet-stream",
        }),
        filename,
      );
      setNotice(
        `Saved ${filename}. Open it below to verify it and extract the original bytes.`,
      );
    } catch (e) {
      setError(messageOfError(e));
    }
  }

  async function openSignedFile(next: File | null) {
    if (!next) return;
    setBusy("file");
    setError(null);
    setNotice(null);
    try {
      const raw = new Uint8Array(await next.arrayBuffer());
      const content = decodeBundle(raw);
      if (content.bytes > MAX_MESSAGE_BYTES) {
        setOpened(null);
        setError(
          `This container holds ${formatBytes(content.bytes)}; the demo backend verifies up to ${formatBytes(MAX_MESSAGE_BYTES)}.`,
        );
        return;
      }
      // Decode the base64 fields NOW so no render path can ever throw on a
      // crafted container (Specimen and the Board decode during render).
      const publicKeyBytes = b64ToBytes(content.public_key).length;
      const signatureBytes = b64ToBytes(content.signature).length;
      resetRoute();
      setLine(content.param_set);
      setOpened({
        name: content.name,
        type: content.type,
        paramSet: content.param_set,
        publicKey: content.public_key,
        signature: content.signature,
        messageB64: bytesToB64(content.message),
        bytes: content.bytes,
        signatureBytes,
      });
      setNotice(
        `Opened ${content.name}: ${formatBytes(content.bytes)} signed on ${content.param_set} with a ${publicKeyBytes} B public key. Press Verify signed file.`,
      );
    } catch (e) {
      setOpened(null);
      setError(
        e instanceof BundleError
          ? e.message
          : `${next.name} could not be opened as a signed file: ${messageOfError(e)}`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifyOpened() {
    if (!opened) return;
    setBusy("verify");
    setError(null);
    try {
      const checked = await api.verify(
        opened.paramSet,
        customPublicKey ?? opened.publicKey,
        opened.messageB64,
        opened.signature,
        "base64",
      );
      setResult(checked);
      setUsedFreshKey(false);
      setSessionStamp(stamp());
      setNotice(null);
    } catch (e) {
      setError(messageOfError(e));
    } finally {
      setBusy(null);
    }
  }

  function downloadOriginal() {
    if (!opened || !result?.valid) return;
    try {
      const filename = sanitizeFilename(opened.name);
      triggerDownload(
        new Blob([new Uint8Array(b64ToBytes(opened.messageB64))], {
          type: opened.type || "application/octet-stream",
        }),
        filename,
      );
      setNotice(`Verified on ${opened.paramSet} and extracted ${filename}.`);
    } catch (e) {
      setError(messageOfError(e));
    }
  }

  // --- derived route state -------------------------------------------------

  const stations: Station[] = [
    {
      name: "Keygen",
      meta: keys ? `${keys.keygen_ms.toFixed(3)} ms` : "waiting",
      state: busy === "keygen" ? "active" : keys ? "done" : "idle",
    },
    {
      name: "Sign",
      meta: sig ? `${sig.sign_ms.toFixed(3)} ms` : "waiting",
      state: busy === "sign" ? "active" : sig ? "done" : "idle",
    },
    {
      name: "Verify",
      meta: result
        ? `${result.verify_ms.toFixed(3)} ms${result.valid ? "" : " rejected"}`
        : "waiting",
      state:
        busy === "verify"
          ? "active"
          : result
            ? result.valid
              ? "done"
              : "fail"
            : "idle",
    },
  ];
  const progress = result ? 100 : sig ? 50 : 0;
  const hazard = result !== null && !result.valid;
  const verdict = result === null ? null : result.valid ? "valid" : "invalid";

  const canSign = Boolean(keys) && !overLimit && (mode === "text" || file !== null);
  const canVerify = Boolean(keys && sig) && !overLimit;
  const busyLabel = (label: string) => (busy ? "…" : label);

  return (
    <main style={{ ["--active" as string]: lineDef.color }}>
      {/* 1 · destination band ------------------------------------------------ */}
      <header className="band">
        <div className="shell band__grid">
          <div>
            <h1 className="band__title">
              ML-DSA Signature Demo
              <span className="band__line-dot" aria-hidden="true" />
            </h1>
            <p className="band__sub">
              FIPS 204 post-quantum signing, live in your browser. Pick a line,
              generate a key pair, sign, verify — every size and time on this
              page is measured while you watch.
            </p>
          </div>
          <div className="band__status">
            <span className="band__pill" data-state={health}>
              {health === "online"
                ? "API online"
                : health === "offline"
                  ? "API offline"
                  : "Connecting…"}
            </span>
            <span>
              {line}
              {paramInfo ? ` · category ${paramInfo.security_category}` : ""}
            </span>
            <span>pure ML-DSA · empty context</span>
          </div>
        </div>
      </header>

      {/* 2 · line chips ------------------------------------------------------ */}
      <nav className="lines" aria-label="Parameter set">
        <div className="shell">
          <div className="lines__list">
            {LINES.map((l) => (
              <button
                key={l.id}
                type="button"
                className="chip"
                style={{ ["--chip" as string]: l.color }}
                aria-pressed={l.id === line}
                onClick={() => pickLine(l.id)}
                data-testid={`line-${l.id}`}
              >
                {l.id}
              </button>
            ))}
            <a className="chip chip--legacy" href="#comparison">
              Legacy interchange: Ed25519 · RSA-2048
            </a>
            <span className="lines__note">FIPS 204 Table 2 reference shown beside every measurement</span>
          </div>
        </div>
      </nav>

      {/* 3 · route ----------------------------------------------------------- */}
      <RouteStrip stations={stations} progress={progress} hazard={hazard} />

      {/* 4 · operate --------------------------------------------------------- */}
      <section className="operate" id="run" aria-label="Operate the line">
        <div className="shell">
          <div className="operate__head">
            <h2 className="section-title">Run the line</h2>
            <p className="lede">
              Three stations, in order. The board on the right records what the
              backend actually computed — measured bytes against the standard&rsquo;s
              own numbers.
            </p>
          </div>

          <div className="operate__grid">
            <div className="plate">
              <div className="controls__modes" role="group" aria-label="Message source">
                <button
                  type="button"
                  className="mode"
                  aria-pressed={mode === "text"}
                  onClick={() => {
                    setMode("text");
                    setResult(null);
                  }}
                >
                  Text
                </button>
                <button
                  type="button"
                  className="mode"
                  aria-pressed={mode === "file"}
                  onClick={() => {
                    setMode("file");
                    setResult(null);
                  }}
                >
                  File
                </button>
              </div>

              {mode === "text" ? (
                <div className="field">
                  <div className="field__label-row">
                    <label className="label" htmlFor="message">
                      Message to sign
                    </label>
                    <span className="field__count" data-testid="message-bytes">
                      {messageBytes} B
                    </span>
                  </div>
                  <textarea
                    id="message"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setResult(null);
                    }}
                    placeholder="Type anything — it becomes the bytes that get signed."
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="field">
                  <div className="field__label-row">
                    <span className="label">File to sign</span>
                    <span className="field__count" data-testid="message-bytes">
                      {messageBytes} B
                    </span>
                  </div>
                  <div className="file">
                    <input
                      type="file"
                      id="file-input"
                      onChange={(e) => loadFile(e.target.files?.[0] ?? null)}
                      aria-label="Choose a file to sign"
                    />
                    <span className="file__name">
                      {file
                        ? `${file.name} · ${formatBytes(file.bytes)} · sent as base64, signed as raw bytes`
                        : `no file chosen · limit ${formatBytes(MAX_MESSAGE_BYTES)}`}
                    </span>
                  </div>
                </div>
              )}

              {overLimit ? (
                <p className="alert" role="alert">
                  Message is {formatBytes(messageBytes)}; the demo backend rejects
                  anything over {formatBytes(MAX_MESSAGE_BYTES)}.
                </p>
              ) : null}

              <div className="actions">
                <button
                  type="button"
                  className="btn btn--line"
                  onClick={runKeygen}
                  disabled={busy !== null}
                  data-testid="keygen"
                >
                  {busy === "keygen" ? "Generating…" : keys ? "Regenerate key pair" : busyLabel("Generate key pair")}
                </button>
                <button
                  type="button"
                  className="btn btn--line"
                  onClick={runSign}
                  disabled={!canSign || busy !== null}
                  data-testid="sign"
                >
                  {busy === "sign" ? "Signing…" : "Sign message"}
                </button>
                <button
                  type="button"
                  className="btn btn--line"
                  onClick={opened ? verifyOpened : () => runVerify(false)}
                  disabled={opened ? busy !== null : !canVerify || busy !== null}
                  data-testid="verify"
                >
                  {busy === "verify"
                    ? "Verifying…"
                    : opened
                      ? "Verify signed file"
                      : "Verify signature"}
                </button>
              </div>

              <PublicKeyInput
                key={`${line}:${keys?.public_key ?? opened?.publicKey ?? "empty"}`}
                line={line}
                activeKey={customPublicKey ?? keys?.public_key ?? opened?.publicKey ?? ""}
                disabled={busy !== null}
                onAccept={(key) => { setCustomPublicKey(key); setResult(null); setUsedFreshKey(false); setNotice(null); }}
              />
              <div className="drills">
                <h3 className="drills__title">Tamper drills</h3>
                <p className="drills__hint">
                  FIPS 204 §3.6.2 promises exactly one answer: a signature either
                  verifies or it does not. Break the input and watch the promise hold.
                </p>
                <div className="drills__row">
                  <button
                    type="button"
                    className="btn btn--hazard"
                    onClick={drillMessage}
                    disabled={busy !== null || opened !== null}
                    data-testid="drill-message"
                  >
                    {msgBackup ? "Flip another message byte" : "Corrupt the message"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--hazard"
                    onClick={drillSignature}
                    disabled={!sig || busy !== null || opened !== null}
                    data-testid="drill-signature"
                  >
                    {sigBackup ? "Flip another signature byte" : "Corrupt the signature"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--hazard"
                    onClick={drillWrongKey}
                    disabled={!keys || !sig || busy !== null || opened !== null}
                    data-testid="drill-wrong-key"
                  >
                    Verify with the wrong key
                  </button>
                  {msgBackup ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={restoreMessage}
                      data-testid="restore-message"
                    >
                      Restore message
                    </button>
                  ) : null}
                  {sigBackup ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={restoreSignature}
                      data-testid="restore-signature"
                    >
                      Restore signature
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="drills">
                <h3 className="drills__title">Signed file interchange</h3>
                <p className="drills__hint">
                  Sign a file above, download the .ml-dsa container it produces,
                  then open that container here to verify it and pull the
                  original bytes back out. The container is assembled in this
                  browser — the server never stores a file.
                </p>
                <div className="drills__row">
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={downloadSignedFile}
                    disabled={!canDownloadSigned || busy !== null}
                    data-testid="download-signed"
                  >
                    Download signed file (.ml-dsa)
                  </button>
                  <div className="file">
                    <input
                      type="file"
                      id="signed-input"
                      accept=".ml-dsa"
                      onChange={(e) => openSignedFile(e.target.files?.[0] ?? null)}
                      aria-label="Open a signed .ml-dsa file"
                      data-testid="open-signed"
                    />
                    <span className="file__name">
                      {opened
                        ? `${opened.name} · ${formatBytes(opened.bytes)} · signed on ${opened.paramSet}`
                        : "no .ml-dsa file chosen · verifies standalone, public key included"}
                    </span>
                  </div>
                  {opened && result?.valid ? (
                    <button
                      type="button"
                      className="btn btn--line"
                      onClick={downloadOriginal}
                      data-testid="download-original"
                    >
                      Download original file
                    </button>
                  ) : null}
                  {opened ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => {
                        setOpened(null);
                        setResult(null);
                        setNotice(null);
                      }}
                      data-testid="close-signed"
                    >
                      Close file
                    </button>
                  ) : null}
                </div>
              </div>

              {notice ? (
                <p className="alert alert--info" data-testid="notice">
                  {notice}
                </p>
              ) : null}
              {error ? (
                <p className="alert" role="alert" data-testid="error">
                  {error}
                </p>
              ) : null}
            </div>

            <Board
              lineName={line}
              keySource={usedFreshKey ? "fresh" : customPublicKey ? "custom" : opened ? "file" : "yours"}
              sessionStamp={sessionStamp}
              measured={
                keys
                  ? {
                      publicKeyBytes: keys.measured.public_key_bytes,
                      secretKeyBytes: keys.measured.secret_key_bytes,
                    }
                  : undefined
              }
              reference={
                paramInfo
                  ? {
                      publicKeyBytes: paramInfo.standard_reference.public_key_bytes,
                      secretKeyBytes: paramInfo.standard_reference.secret_key_bytes,
                      signatureBytes: paramInfo.standard_reference.signature_bytes,
                    }
                  : undefined
              }
              signatureBytes={sig?.measured.signature_bytes ?? opened?.signatureBytes}
              messageBytes={
                opened ? opened.bytes : keys || sig ? messageBytes : undefined
              }
              keygenMs={keys?.keygen_ms}
              signMs={sig?.sign_ms}
              verifyMs={result?.verify_ms}
              verdict={verdict}
              note={result?.note}
            />
          </div>
        </div>
      </section>

      {/* 5 · specimen -------------------------------------------------------- */}
      <Specimen
        publicKey={usedFreshKey ? freshKeys?.public_key : customPublicKey ?? keys?.public_key ?? opened?.publicKey}
        signature={sig?.signature ?? opened?.signature}
      />

      {/* 6 · comparison ------------------------------------------------------ */}
      <Compare />

      {/* 7 · service notices ------------------------------------------------- */}
      <section className="notices" aria-label="Service notices">
        <div className="shell notices__grid">
          <div>
            <h2 className="section-title">Service notices</h2>
            <p className="lede">
              Everything this demo does not claim, stated plainly.
            </p>
          </div>
          <div>
            <h3>Known deviations</h3>
            <ul>
              <li>
                pqcrypto accepts a context string of at most 253 bytes; FIPS 204
                §3.3 allows up to 255. This demo always uses an empty context, so
                the limit is never reached.
              </li>
              <li>
                The cross-check library quantcrypt rejects an empty message;
                FIPS 204 allows M to be empty. The primary library pqcrypto signs
                empty messages correctly.
              </li>
            </ul>
          </div>
          <div>
            <h3>Scope limits</h3>
            <ul>
              <li>
                Messages and files above {formatBytes(MAX_MESSAGE_BYTES)} are
                refused — a demo guard, not a limit in FIPS 204.
              </li>
              <li>
                Keys, signatures and messages stay in browser memory; nothing is
                stored, logged or sent anywhere except this demo&rsquo;s backend.
              </li>
              <li>
                ML-DSA runs in its hedged variant with an empty context, the
                library default.
              </li>
            </ul>
          </div>
          <div>
            <h3>Sources</h3>
            <ul className="notices__links">
              <li>
                <a href="https://csrc.nist.gov/pubs/fips/204/final" rel="noreferrer">
                  NIST FIPS 204 (final)
                </a>
              </li>
              <li>
                <a href="https://csrc.nist.gov/pubs/fips/204/final" rel="noreferrer">
                  Sizes quoted from FIPS 204 Table 2, p.16
                </a>
              </li>
              <li>ML-DSA: pqcrypto 1.0.0 · cross-check: quantcrypt 1.0.1</li>
              <li>Ed25519 / RSA-2048: cryptography 50.0.2</li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
