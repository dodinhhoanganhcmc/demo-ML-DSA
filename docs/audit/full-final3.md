<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.101">
<site url="http://localhost:3000" crawled="4" date="2026-10-02T09:26:46.033Z"/>
<score overall="82" grade="B">
 <group name="SEO" score="99" errors="0" warnings="5"/>
 <group name="Performance" score="94" errors="2" warnings="4"/>
 <group name="Security" score="85" errors="4" warnings="0"/>
 <group name="Agents" score="90" errors="0" warnings="4"/>
 <cat name="Security" score="79"/>
 <cat name="Performance" score="94"/>
 <cat name="Agent Experience" score="90"/>
 <cat name="Accessibility" score="99"/>
 <cat name="Content" score="99"/>
 <cat name="Core SEO" score="100"/>
 <cat name="Crawlability" score="100"/>
 <cat name="E-E-A-T" score="100"/>
 <cat name="Internationalization" score="100"/>
 <cat name="Images" score="100"/>
 <cat name="Site Integrity" score="100"/>
 <cat name="Legal Compliance" score="100"/>
 <cat name="Links" score="100"/>
 <cat name="Mobile" score="100"/>
 <cat name="Structured Data" score="100"/>
 <cat name="Social Media" score="100"/>
 <cat name="URL Structure" score="100"/>
</score>
<summary passed="454" warnings="18" failed="6"/>
<scan-scope origin="cli" crawled="4" max-pages="500" capped="false"/>
<rules-cache pages-replayed="0" pages-evaluated="4"/>
<technologies first-scan="false" added="0" removed="0">
 <tech name="React" cat="framework"/>
 <tech name="Next.js" cat="framework"/>
</technologies>
<issues>
 <rule id="security/https" severity="error" category="Security" group="security" status="fail" docs="https://docs.squirrelscan.com/rules/security/https">
  Page not served over HTTPS
  Pages (4): /, /about, /contact, /privacy
 </rule>
 <rule id="perf/http2" severity="info" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/http2">
  HTTP/2 requires HTTPS
  Pages (4): /, /about, /contact, /privacy
 </rule>
 <rule id="ax/markdown-response" severity="info" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/markdown-response">
  No Markdown response — consider honoring Accept: text/markdown or publishing a .md variant so agents get clean content
 </rule>
 <rule id="content/keyword-stuffing" severity="warning" category="Content" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/content/keyword-stuffing">
  1 word(s) may be overused
  Pages (1): /
  Items (1):
   - dsa (&quot;dsa&quot; (3.6%)) [count: 14, density: 3.6363636363636362] (from: /)
 </rule>
 <rule id="perf/bad-caching" severity="warning" category="Performance" group="performance" status="fail" docs="https://docs.squirrelscan.com/rules/perf/bad-caching">
  4/4 pages set no caching policy (no freshness lifetime and no validator); 4/4 pages lack an ETag or Last-Modified validator
  Pages (4): /, /about, /contact, /privacy
 </rule>
 <rule id="perf/critical-request-chains" severity="warning" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/critical-request-chains">
  1 critical request chain(s) found
  Pages (4): /, /about, /contact, /privacy
  Items (1):
   - CSS: /_next/static/chunks/1ojmt3jp58npe.css (from: /, /about, /contact, /privacy)
 </rule>
 <rule id="a11y/color-contrast" severity="warning" category="Accessibility" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/a11y/color-contrast">
  2 potential color contrast issue(s)
  Pages (4): /, /about, /contact, /privacy
  Items (2):
   - Very light text color: 1 instance(s) (from: /, /about, /contact, /privacy)
   - White text (verify background): 1 instance(s) (from: /, /about, /contact, /privacy)
 </rule>
 <rule id="ax/token-weight" severity="warning" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/token-weight">
  Visible text is under 15% of the page HTML — agents pay token cost mostly for markup, scripts, and styles
  Pages (4): /, /about, /contact, /privacy
  Items (4):
   - / (~14% of HTML is visible text (~5.553 est. tokens)) (from: /)
   - /about (~12% of HTML is visible text (~5.931 est. tokens)) (from: /about)
   - /contact (~10% of HTML is visible text (~4.867 est. tokens)) (from: /contact)
   - /privacy (~10% of HTML is visible text (~5.146 est. tokens)) (from: /privacy)
 </rule>
</issues>
<entities count="10" references="18" dangling="0" conflicts="0" without-id="0" stable-id-share="40" pages-without-entities="0">
 <entity type="Person" name="Đỗ Đình Hoàng Anh" id="http://localhost:3000/about#team-do-dinh-hoang-anh" occurrences="4" pages="4"/>
 <entity type="Person" name="Mai Đức Minh" id="http://localhost:3000/about#team-mai-duc-minh" occurrences="4" pages="4"/>
 <entity type="Person" name="Ngô Bình Quang Anh" id="http://localhost:3000/about#team-ngo-binh-quang-anh" occurrences="4" pages="4"/>
 <entity type="Person" name="Trần Lê Minh" id="http://localhost:3000/about#team-tran-le-minh" occurrences="4" pages="4"/>
 <entity type="Article" name="About the ML-DSA Signature Demo" occurrences="1" pages="1"/>
 <entity type="Organization" name="ML-DSA Signature Demo" occurrences="1" pages="1"/>
</entities>
</audit>