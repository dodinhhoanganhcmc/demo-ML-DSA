import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy — the ML-DSA Signature Demo stores nothing",
  description:
    "The ML-DSA Signature Demo keeps no accounts, cookies or analytics: messages and keys stay in browser memory, are processed locally, with zero sub-processors.",
};

export default async function PrivacyPage() {
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
    name: "Privacy — the ML-DSA Signature Demo stores nothing",
    url: "http://localhost:3000/privacy",
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
          <h1 className="band__title">Privacy</h1>
          <p className="band__sub">
            Short version: this demo keeps nothing. Longer version: everything
            below, so you do not have to take the short version on faith.
          </p>
          <p className="band__sub">
            By <strong>Đỗ Đình Hoàng Anh, Ngô Bình Quang Anh, Mai Đức Minh, Trần Lê Minh</strong>{" "}
            · CMC University, Information Security · last updated October 2,
            2026 · applies to the local demo only.
          </p>
        </div>
      </header>

      <section className="compare" aria-label="Privacy statement">
        <div className="shell" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 className="section-title">What is processed</h2>
            <p className="lede">
              Messages, files, key pairs and signatures you create are sent to
              the local backend — FastAPI listening on{" "}
              <code>127.0.0.1:8000</code> — processed in memory, and returned to
              your browser. They are never written to disk, never logged, and
              never sent to any third party (see the{" "}
              <a href="#sub-processors">sub-processor disclosure</a> below).
              Your operating system, your browser's developer tools, and this
              machine are the only places the data ever exists.
            </p>
          </div>

          <div>
            <h2 className="section-title">What is stored</h2>
            <ul>
              <li>No accounts, no databases, no cookies, no analytics.</li>
              <li>
                Keys and signatures live in browser memory only — reloading the
                page discards them.
              </li>
              <li>
                The backend keeps no state between requests; every call is
                independent and forgets its inputs when the response is sent.
              </li>
              <li>
                Fonts are self-hosted by Next.js, so the page makes no requests
                to third-party content delivery networks at runtime.
              </li>
            </ul>
          </div>

          <div id="sub-processors">
            <h2 className="section-title">Sub-processors</h2>
            <p className="lede">
              Sub-processor disclosure: none. The demo buys nothing, delegates
              nothing, and calls no external API — there is no analytics
              vendor, no crash reporter, no font CDN and no hosted backend.
              Everything runs on the machine in front of you, which also means
              there is no account to delete, because no account is ever created.
            </p>
          </div>

          <div>
            <h2 className="section-title">Retention and deletion</h2>
            <p className="lede">
              Retention is zero: data lives for the duration of one HTTP
              request on the backend, and for one page session in the browser.
              Close the tab and the keys are gone; the demo cannot restore them,
              which is the point of a signing key. If you need a copy, export it
              yourself before you reload.
            </p>
          </div>

          <div>
            <h2 className="section-title">Who to ask</h2>
            <p className="lede">
              This is a local demo. Data sent between your browser and
              the backend travels over localhost only, never leaves the machine,
              and no human other than you can see it. Questions about this
              statement go to the contact listed on the{" "}
              <a href="/contact">contact page</a>.
            </p>
            <p style={{ marginTop: "1.25rem" }}>
              <a href="/">← Back to the signing tool</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
