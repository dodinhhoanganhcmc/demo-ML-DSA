import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact the ML-DSA Signature Demo — bug reports and questions",
  description:
    "How to reach the team behind the ML-DSA Signature Demo and what to include in a bug report: steps, parameter set, notices and console output — never keys.",
};

export default async function ContactPage() {
  // Nonce lets this inline JSON-LD block pass the strict script-src CSP.
  const nonce = (await headers()).get("x-nonce") ?? "";
  const team = [
    { name: "Đỗ Đình Hoàng Anh", id: "do-dinh-hoang-anh" },
    { name: "Ngô Bình Quang Anh", id: "ngo-binh-quang-anh" },
    { name: "Mai Đức Minh", id: "mai-duc-minh" },
    { name: "Trần Lê Minh", id: "tran-le-minh" },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Contact the ML-DSA Signature Demo",
    url: "http://localhost:3000/contact",
    datePublished: "2026-10-02",
    dateModified: "2026-10-02",
    author: team.map(({ name, id }) => ({
      "@type": "Person",
      "@id": `http://localhost:3000/about#team-${id}`,
      name,
      url: "http://localhost:3000/about",
    })),
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
          <h1 className="band__title">Contact</h1>
          <p className="band__sub">
            This demo runs locally, so support is informal: ask during the
            review session, or send a written bug report.
          </p>
          <p className="band__sub">
            By <strong>Đỗ Đình Hoàng Anh, Ngô Bình Quang Anh, Mai Đức Minh, Trần Lê Minh</strong>{" "}
            · CMC University, Information Security · October 2, 2026.
          </p>
        </div>
      </header>

      <section className="compare" aria-label="Contact information">
        <div className="shell" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 className="section-title">How to reach the team</h2>
            <p className="lede">
              The project is a course assignment, not a hosted service, so there
              is no support desk and no ticketing system. The demo is presented
              live in class by the team — Đỗ Đình Hoàng Anh, Ngô Bình Quang
              Anh, Mai Đức Minh and Trần Lê Minh (CMC University, Information
              Security) — so questions are welcome on the spot. Because every
              key, signature and message stays on your own machine, nobody but
              you can see the material you type into the tool. If you are
              reviewing the project rather than running it, expect answers that
              point at a file in the repository — the evidence log, the
              measurement method and the audit results are all checked in —
              rather than at a claim made from memory.
            </p>
          </div>

          <div>
            <h2 className="section-title">What to include in a bug report</h2>
            <ul>
              <li>
                The parameter set (ML-DSA-44, ML-DSA-65 or ML-DSA-87) and the
                action that failed — key generation, signing, or verification.
              </li>
              <li>
                The exact notice shown in the Service Notices band; it quotes
                the HTTP status and the RFC 7807 problem type.
              </li>
              <li>
                Browser and version, plus any line from the developer console
                (F12). Do not paste secret keys — reproduction only needs the
                steps, not your key material.
              </li>
              <li>
                Whether the same steps succeed in a different parameter set;
                that isolates a parameter-set bug from a transport bug.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="section-title">What is out of scope</h2>
            <p className="lede">
              The backend has no accounts, no persistence and a per-client rate
              limit, so availability and access-control reports do not apply
              here. Cryptographic findings are the interesting kind: if you
              believe a signature verifies when it should not, or a size
              disagrees with FIPS 204 Table 2, that is exactly the class of bug
              this project is meant to surface.
            </p>
            <p style={{ marginTop: "1.25rem" }}>
              <a href="/about">Read how the demo is built →</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
