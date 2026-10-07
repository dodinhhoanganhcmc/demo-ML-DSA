export interface BoardProps {
  lineName: string;
  keySource: "yours" | "fresh" | "file";
  sessionStamp: string;
  measured?: { publicKeyBytes: number; secretKeyBytes: number };
  reference?: { publicKeyBytes: number; secretKeyBytes: number; signatureBytes: number };
  signatureBytes?: number;
  messageBytes?: number;
  keygenMs?: number;
  signMs?: number;
  verifyMs?: number;
  verdict: "valid" | "invalid" | null;
  note?: string;
}

function bytes(value?: number): string {
  return value === undefined ? "—" : `${value} B`;
}

function ms(value?: number): string {
  return value === undefined ? "—" : `${value.toFixed(3)} ms`;
}

function SizeRow({
  label,
  value,
  spec,
}: {
  label: string;
  value?: number;
  spec?: number;
}) {
  const match = value !== undefined && spec !== undefined ? value === spec : undefined;
  return (
    <div className="board__row">
      <span className="board__key">{label}</span>
      <span className="board__value" data-match={match}>
        {bytes(value)}
        {spec !== undefined && (
          <span className="board__ref">
            {match === undefined ? "" : match ? "✓ spec " : "≠ spec "}
            {spec} B
          </span>
        )}
      </span>
    </div>
  );
}

function TimeRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="board__row">
      <span className="board__key">{label}</span>
      <span className="board__value">{ms(value)}</span>
    </div>
  );
}

export function Board({
  lineName,
  keySource,
  sessionStamp,
  measured,
  reference,
  signatureBytes,
  messageBytes,
  keygenMs,
  signMs,
  verifyMs,
  verdict,
  note,
}: BoardProps) {
  return (
    <div className="board" data-testid="board">
      <div className="board__head">
        <span className="board__line">{lineName} · measured live</span>
        <span className="board__clock">{sessionStamp}</span>
      </div>

      <div className="board__rows">
        <SizeRow
          label="Public key"
          value={measured?.publicKeyBytes}
          spec={reference?.publicKeyBytes}
        />
        <SizeRow
          label="Secret key"
          value={measured?.secretKeyBytes}
          spec={reference?.secretKeyBytes}
        />
        <SizeRow label="Signature" value={signatureBytes} spec={reference?.signatureBytes} />
        <div className="board__row">
          <span className="board__key">Message</span>
          <span className="board__value">{bytes(messageBytes)}</span>
        </div>
        <TimeRow label="Keygen" value={keygenMs} />
        <TimeRow label="Sign" value={signMs} />
        <TimeRow label="Verify" value={verifyMs} />
        <div className="board__row">
          <span className="board__key">Public key used</span>
          <span className="board__value">
            {keySource === "yours"
              ? "your key pair"
              : keySource === "file"
                ? "key embedded in the file"
                : "fresh key pair"}
          </span>
        </div>
        <div
          className="board__row board__row--verdict"
          data-verdict={verdict ?? undefined}
          aria-live="polite"
        >
          <span className="board__key">Verdict</span>
          <span className="board__value" data-testid="verdict">
            {verdict === null ? "—" : verdict === "valid" ? "valid" : "invalid"}
          </span>
        </div>
      </div>

      {note ? <p className="board__note">{note}</p> : null}
    </div>
  );
}
