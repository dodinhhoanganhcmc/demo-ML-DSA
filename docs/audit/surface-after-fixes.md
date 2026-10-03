<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.101">
<site url="http://127.0.0.1:3000" crawled="3" date="2026-10-02T08:01:29.050Z"/>
<score overall="55" grade="F">
 <group name="SEO" score="58" errors="1" warnings="20"/>
 <group name="Performance" score="95" errors="0" warnings="6"/>
 <group name="Security" score="80" errors="3" warnings="1"/>
 <group name="Agents" score="93" errors="0" warnings="2"/>
 <cat name="Security" score="75"/>
 <cat name="Crawlability" score="87"/>
 <cat name="Core SEO" score="85"/>
 <cat name="Performance" score="95"/>
 <cat name="E-E-A-T" score="57"/>
 <cat name="Accessibility" score="99"/>
 <cat name="Links" score="90"/>
 <cat name="Agent Experience" score="93"/>
 <cat name="Content" score="96"/>
 <cat name="Internationalization" score="100"/>
 <cat name="Images" score="100"/>
 <cat name="Site Integrity" score="100"/>
 <cat name="Legal Compliance" score="100"/>
 <cat name="Mobile" score="100"/>
 <cat name="Social Media" score="100"/>
 <cat name="URL Structure" score="100"/>
</score>
<summary passed="309" warnings="35" failed="4"/>
<scan-scope origin="cli" crawled="3" max-pages="100" capped="false"/>
<rules-cache pages-replayed="0" pages-evaluated="3"/>
<technologies first-scan="false" added="0" removed="0">
 <tech name="React" cat="framework"/>
 <tech name="Next.js" cat="framework"/>
</technologies>
<issues>
 <rule id="crawl/sitemap-domain" severity="error" category="Crawlability" group="seo" status="fail" docs="https://docs.squirrelscan.com/rules/crawl/sitemap-domain">
  6 URL(s) point to different domain(s)
  Pages (3): http://localhost:3000, http://localhost:3000/about, http://localhost:3000/privacy
  Items (3):
   - http://localhost:3000 [host: localhost]
   - http://localhost:3000/about [host: localhost]
   - http://localhost:3000/privacy [host: localhost]
 </rule>
 <rule id="security/https" severity="error" category="Security" group="security" status="fail" docs="https://docs.squirrelscan.com/rules/security/https">
  Page not served over HTTPS
  Pages (3): /, /about, /privacy
 </rule>
 <rule id="perf/http2" severity="info" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/http2">
  HTTP/2 requires HTTPS
  Pages (3): /, /about, /privacy
 </rule>
 <rule id="legal/subprocessor-disclosure" severity="info" category="Legal Compliance" group="security" status="warn" docs="https://docs.squirrelscan.com/rules/legal/subprocessor-disclosure">
  No sub-processor / data-processing (DPA) disclosure found
 </rule>
 <rule id="ax/agents-md" severity="info" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/agents-md">
  No AGENTS.md found — this site publishes llms.txt, so consider an AGENTS.md for coding agents too
 </rule>
 <rule id="ax/markdown-response" severity="info" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/markdown-response">
  No Markdown response — consider honoring Accept: text/markdown or publishing a .md variant so agents get clean content
 </rule>
 <rule id="crawl/sitemap-coverage" severity="warning" category="Crawlability" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/crawl/sitemap-coverage">
  3 indexable page(s) not in sitemap (100%); 3 sitemap URL(s) were not crawled
  Pages (5/6): /, http://localhost:3000, /about, /privacy, http://localhost:3000/about
  Items (5/6):
   - /
   - /about
   - /privacy
   - http://localhost:3000
   - http://localhost:3000/about
 </rule>
 <rule id="core/meta-title" severity="warning" category="Core SEO" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-title">
  Title too short
  Pages (2): /about, /privacy
  Items (2):
   - /about (About (5 chars)) (from: /about)
   - /privacy (Privacy (7 chars)) (from: /privacy)
 </rule>
 <rule id="core/meta-description" severity="warning" category="Core SEO" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-description">
  Description too short
  Pages (2): /about, /privacy
  Items (2):
   - /about (What the ML-DSA Signature Lab demonstrates, how it (108 chars)) (from: /about)
   - /privacy (The ML-DSA Signature Lab stores nothing: no accoun (86 chars)) (from: /privacy)
 </rule>
 <rule id="core/og-tags" severity="warning" category="Core SEO" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/core/og-tags">
  Missing og:image - social shares will lack imagery
  Pages (3): /, /about, /privacy
 </rule>
 <rule id="security/csp" severity="warning" category="Security" group="security" status="warn" docs="https://docs.squirrelscan.com/rules/security/csp">
  CSP allows &apos;unsafe-inline&apos;
 </rule>
 <rule id="links/orphan-pages" severity="warning" category="Links" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/links/orphan-pages">
  2 orphan page(s) with &lt;2 incoming links
  Pages (2): /about, /privacy
  Items (2):
   - /about
   - /privacy
 </rule>
 <rule id="links/weak-internal-links" severity="warning" category="Links" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/links/weak-internal-links">
  2 page(s) have only 1 internal link
  Pages (2): /about, /privacy
  Items (2):
   - /about
   - /privacy
 </rule>
 <rule id="content/word-count" severity="warning" category="Content" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/content/word-count">
  Thin content: 129 to 197 words (min 300)
  Pages (2): /about, /privacy
  Items (2):
   - /about (Thin content: 197 words (min 300))
   - /privacy (Thin content: 129 words (min 300))
 </rule>
 <rule id="perf/critical-request-chains" severity="warning" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/critical-request-chains">
  1 critical request chain(s) found
  Pages (3): /, /about, /privacy
  Items (1):
   - CSS: /_next/static/chunks/25i-skptbephz.css (from: /, /about, /privacy)
 </rule>
 <rule id="perf/unminified-js" severity="warning" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/unminified-js">
  1 JavaScript file(s) appear unminified
  Pages (3): /, /about, /privacy
  Items (1):
   - 310vm2bl3xxpt.js (5.2KB, ~0.0KB savings) [reason: high newlines (0.56%)] (from: /, /about, /privacy)
 </rule>
 <rule id="a11y/color-contrast" severity="warning" category="Accessibility" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/a11y/color-contrast">
  2 potential color contrast issue(s)
  Pages (3): /, /about, /privacy
  Items (2):
   - Very light text color: 1 instance(s) (from: /, /about, /privacy)
   - White text (verify background): 1 instance(s) (from: /, /about, /privacy)
 </rule>
 <rule id="eeat/author-byline" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/author-byline">
  No content pages have author attribution
 </rule>
 <rule id="eeat/contact-page" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/contact-page">
  No Contact page found
 </rule>
 <rule id="eeat/privacy-policy" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/privacy-policy">
  Privacy policy only linked from 33% of pages
 </rule>
 <rule id="eeat/content-dates" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/content-dates">
  No content pages have datePublished
 </rule>
 <rule id="ax/token-weight" severity="warning" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/token-weight">
  Visible text is under 15% of the page HTML — agents pay token cost mostly for markup, scripts, and styles
  Pages (2): /about, /privacy
  Items (2):
   - /about (~9% of HTML is visible text (~3.863 est. tokens)) (from: /about)
   - /privacy (~6% of HTML is visible text (~3.250 est. tokens)) (from: /privacy)
 </rule>
</issues>
<entities count="0" references="0" dangling="0" conflicts="0" without-id="0" stable-id-share="0" pages-without-entities="3">
</entities>
</audit>