/**
 * Shared site footer: wayfinding credits + internal navigation.
 * Every page renders this footer so the crawler sees real internal
 * links (squirrelscan: links/orphan-pages, eeat/privacy-policy).
 */
export default function Footer() {
  return (
    <footer className="foot">
      <div className="shell foot__grid">
        <span>ML-DSA Signature Demo · © 2026</span>
        <nav className="foot__nav" aria-label="Footer">
          <a href="/#run">Run the line</a>
          <a href="/#specimen">Specimen</a>
          <a href="/#comparison">Comparison</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </nav>
        <span>FIPS 204 · NIST · August 2024</span>
      </div>
    </footer>
  );
}
