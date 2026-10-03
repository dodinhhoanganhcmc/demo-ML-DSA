import { b64ToBytes, toHex } from "@/lib/bytes";

const HEX_WINDOW = 96; // bytes shown per specimen plate

export function Specimen({
  publicKey,
  signature,
  barCount = 512,
}: {
  publicKey?: string;
  signature?: string;
  barCount?: number;
}) {
  const pk = publicKey ? b64ToBytes(publicKey) : undefined;
  const sig = signature ? b64ToBytes(signature) : undefined;

  return (
    <section className="specimen" id="specimen" aria-label="Key and signature specimen">
      <div className="shell">
        <div className="specimen__head">
          <h2 className="section-title">Specimen</h2>
          <p className="lede specimen__lede">
            The bytes themselves, rendered straight from this session. The bar
            field is the signature read left to right — this page&rsquo;s only
            texture is measured data.
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

          <div className="field-bars">
            <span className="hex__label">
              Signature bytes · {sig ? `first ${Math.min(barCount, sig.length)}` : "none"} of{" "}
              {sig?.length ?? 0} B
            </span>
            <div className="field-bars__plot" aria-hidden="true">
              {sig
                ? Array.from(sig.subarray(0, barCount)).map((b, i) => (
                    <span
                      key={i}
                      className="field-bars__bar"
                      style={{ height: `${6 + (b / 255) * 94}%` }}
                    />
                  ))
                : null}
            </div>
            <p className="field-bars__caption">
              {sig
                ? "bar height = byte value 0x00–0xff"
                : "waiting for a signature"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
