"use client";

import { useState } from "react";
import { api, type BenchmarkResponse } from "@/lib/api";

const LINE_VAR: Record<string, string> = {
  "ML-DSA-44": "var(--line-44)",
  "ML-DSA-65": "var(--line-65)",
  "ML-DSA-87": "var(--line-87)",
};

const ITERATION_CHOICES = [10, 20, 50];

function sizeCell(measured: number, spec: number) {
  const match = measured === spec;
  return (
    <>
      {measured} B
      <span className="cell-spec">
        {match ? "✓ spec " : "≠ spec "}
        {spec} B
      </span>
    </>
  );
}

export function Compare() {
  const [iterations, setIterations] = useState(20);
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.benchmark("ML-DSA line comparison message", iterations);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="compare" id="comparison" aria-label="Line comparison">
      <div className="shell">
        <div className="compare__head">
          <h2 className="section-title">Line comparison</h2>
          <p className="lede">
            One command measures every line the demo ships: three ML-DSA
            parameter sets against the classical Ed25519 and RSA-2048
            interchange. Measured columns come from this machine; spec columns
            are quoted from FIPS 204 Table 2 and the classical RFCs.
          </p>
          <div className="compare__controls">
            <button
              type="button"
              className="btn btn--line"
              style={{ ["--active" as string]: "var(--line-44)" }}
              onClick={run}
              disabled={busy}
              data-testid="run-benchmark"
            >
              {busy ? "Measuring…" : "Run the measurement"}
            </button>
            <label className="compare__iterations">
              Iterations
              <select
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
              >
                {ITERATION_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {data === null && !busy ? (
          <div className="table-wrap">
            <p className="compare__status">
              No measurements yet. Run the measurement to fill this board —
              nothing here is written in advance.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">
                  Measured sizes and timings per signature algorithm
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Algorithm</th>
                    <th scope="col">Category</th>
                    <th scope="col">Public key</th>
                    <th scope="col">Secret key</th>
                    <th scope="col">Signature</th>
                    <th scope="col">Keygen</th>
                    <th scope="col">Sign</th>
                    <th scope="col">Verify</th>
                    <th scope="col">Roundtrip</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map((row) => (
                    <tr key={row.algorithm} data-kind={row.kind}>
                      <th scope="row" style={{ padding: "0.8rem 0.9rem" }}>
                        <span
                          className="cell-algo"
                          style={{
                            ["--row" as string]:
                              LINE_VAR[row.algorithm] ?? "var(--legacy)",
                          }}
                        >
                          {row.algorithm}
                        </span>
                      </th>
                      <td>{row.security_category ?? "—"}</td>
                      <td>{sizeCell(row.public_key_bytes, row.standard_reference.public_key_bytes)}</td>
                      <td>{sizeCell(row.secret_key_bytes, row.standard_reference.secret_key_bytes)}</td>
                      <td>{sizeCell(row.signature_bytes, row.standard_reference.signature_bytes)}</td>
                      <td>{row.keygen_ms.toFixed(3)} ms</td>
                      <td>{row.sign_ms_avg.toFixed(3)} ms</td>
                      <td>{row.verify_ms_avg.toFixed(3)} ms</td>
                      <td>
                        {row.roundtrip_ok ? (
                          <span className="ok">✓ pass</span>
                        ) : (
                          "✗ fail"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="compare__status" aria-live="polite">
              {busy
                ? "Measuring — this takes a moment."
                : `${data?.results.length} algorithms · ${data?.iterations} iterations · ${data?.message_bytes} B message · measured at ${data?.measured_at}`}
            </p>
          </>
        )}

        <div className="compare__legend">
          <span>✓ spec = measured size equals the standard&rsquo;s value.</span>
          <span>Roundtrip = sign then verify succeeded in this run.</span>
        </div>
      </div>
    </section>
  );
}
