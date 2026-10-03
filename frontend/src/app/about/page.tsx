import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About the ML-DSA Signature Demo — how FIPS 204 signing works",
  description:
    "What the ML-DSA Signature Demo proves, how its Next.js and FastAPI stack works, which audited libraries implement FIPS 204, and how its numbers are measured.",
};

export default async function AboutPage() {
  // The nonce lets this inline JSON-LD block pass the strict script-src.
  const nonce = (await headers()).get("x-nonce") ?? "";
  const team = [
    { name: "Đỗ Đình Hoàng Anh", id: "do-dinh-hoang-anh" },
    { name: "Ngô Bình Quang Anh", id: "ngo-binh-quang-anh" },
    { name: "Mai Đức Minh", id: "mai-duc-minh" },
    { name: "Trần Lê Minh", id: "tran-le-minh" },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "About the ML-DSA Signature Demo",
    datePublished: "2026-10-02",
    dateModified: "2026-10-02",
    author: team.map(({ name, id }) => ({
      "@type": "Person",
      "@id": `http://localhost:3000/about#team-${id}`,
      name,
      url: "http://localhost:3000/about",
    })),
    image: "http://localhost:3000/og.png",
    publisher: {
      "@type": "Organization",
      name: "ML-DSA Signature Demo",
      logo: { "@type": "ImageObject", url: "http://localhost:3000/og.png" },
    },
    mainEntityOfPage: "http://localhost:3000/about",
  };

  return (
    <main>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="band">
        <div className="shell">
          <h1 className="band__title">About</h1>
          <p className="band__sub">
            A live demonstrator for ML-DSA, the post-quantum digital
            signature standard published by NIST as FIPS 204.
          </p>
          <p className="band__sub">
            By <strong>Đỗ Đình Hoàng Anh, Ngô Bình Quang Anh, Mai Đức Minh, Trần Lê Minh</strong>{" "}
            · CMC University, Information Security · published October 2,
            2026.
          </p>
        </div>
      </header>

      <section className="compare" aria-label="About the demo">
        <div className="shell" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 className="section-title">What it proves</h2>
            <p className="lede">
              Three claims, each checkable in the browser. First, key pairs,
              signatures and verifications are computed live by real FIPS 204
              code, not simulated in JavaScript. Second, every key and signature
              size shown on the page matches the standard&rsquo;s own Table 2,
              measured from the bytes the library actually returns rather than
              hard-coded. Third, corrupt a single byte of the message, of the
              signature, or of the public key, and verification fails — section
              3.6.2 of the standard gives exactly one answer for a modified
              input, and this demo never shows a second one.
            </p>
          </div>

          <div>
            <h2 className="section-title">How it is built</h2>
            <p className="lede">
              The frontend is Next.js with the App Router and TypeScript. The
              backend is Python with FastAPI. No cryptography is written by
              hand. ML-DSA operations come from{" "}
              <code>pqcrypto 1.0.0</code>, cross-checked against{" "}
              <code>quantcrypt 1.0.1</code> — an independent implementation used
              to confirm interoperability. The classical comparison side, Ed25519
              and RSA-2048 with PKCS#1 v1.5 over SHA-256, comes from the{" "}
              <code>cryptography</code> package, version 50.0.2. The evidence
              log for every claim lives in the repository under{" "}
              <code>docs/evidence/</code>.
            </p>
          </div>

          <div>
            <h2 className="section-title">Where the numbers come from</h2>
            <p className="lede">
              Nothing on the page is a fixed constant. Signature and public-key
              sizes are measured from the bytes the library returns on this
              machine. Timings are averaged over repeated operations performed
              by the backend when you press Run benchmark, so the comparison
              reflects real measurements instead of marketing figures. The sizes
              quoted from Table 2 of FIPS 204 appear only as a reference column,
              and the demo flags any disagreement instead of hiding it.
            </p>
          </div>

          <div>
            <h2 className="section-title">Security posture</h2>
            <p className="lede">
              The demo runs entirely on localhost. The API validates every
              request with typed schemas, caps messages at one megabyte, rate
              limits each client, and answers errors in the RFC 7807 problem
              format without leaking stack traces. The frontend serves a
              Content-Security-Policy with per-request nonces, denies framing,
              and stores nothing: no cookies, no accounts, no server-side state.
              The full statement of what is processed and what is stored lives
              in the <a href="/privacy">privacy statement</a>, and the project
              report documents the security checklist and the audit results.
            </p>
          </div>

          <div>
            <h2 className="section-title">Sources</h2>
            <ul style={{ listStyle: "none" }}>
              <li>
                <a href="https://csrc.nist.gov/pubs/fips/204/final" rel="noreferrer">
                  NIST FIPS 204 — Module-Lattice-Based Digital Signature Standard
                </a>
              </li>
              <li>
                <a
                  href="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf"
                  rel="noreferrer"
                >
                  FIPS 204 PDF (final, 65 pages)
                </a>
              </li>
              <li>
                <a
                  href="https://csrc.nist.gov/projects/post-quantum-cryptography"
                  rel="noreferrer"
                >
                  NIST Post-Quantum Cryptography project
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="section-title">Credits</h2>
            <p className="lede">
              Written and demonstrated by{" "}
              <strong>
                Nhóm Đỗ Đình Hoàng Anh, Ngô Bình Quang Anh, Mai Đức Minh, Trần Lê Minh
              </strong>{" "}
              — CMC University, Information Security — as a course project for
              a cryptography class. Questions during the review are welcome
              live; written reports go through the{" "}
              <a href="/contact">contact page</a>.
            </p>
            <p style={{ marginTop: "1.25rem" }}>
              <a href="/contact">How to report a bug →</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
