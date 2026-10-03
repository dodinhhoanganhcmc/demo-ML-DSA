<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.101">
<site url="http://localhost:3000" crawled="4" date="2026-10-02T09:17:47.532Z"/>
<score overall="80" grade="B">
 <group name="SEO" score="98" errors="0" warnings="8"/>
 <group name="Performance" score="94" errors="2" warnings="4"/>
 <group name="Security" score="85" errors="4" warnings="0"/>
 <group name="Agents" score="93" errors="0" warnings="3"/>
 <cat name="Security" score="79"/>
 <cat name="Performance" score="94"/>
 <cat name="Accessibility" score="99"/>
 <cat name="Agent Experience" score="93"/>
 <cat name="E-E-A-T" score="83"/>
 <cat name="Core SEO" score="98"/>
 <cat name="Content" score="99"/>
 <cat name="Crawlability" score="100"/>
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
<summary passed="441" warnings="21" failed="6"/>
<scan-scope origin="cli" crawled="4" max-pages="100" capped="false"/>
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
 <rule id="legal/subprocessor-disclosure" severity="info" category="Legal Compliance" group="security" status="warn" docs="https://docs.squirrelscan.com/rules/legal/subprocessor-disclosure">
  No sub-processor / data-processing (DPA) disclosure found
 </rule>
 <rule id="ax/markdown-response" severity="info" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/markdown-response">
  No Markdown response — consider honoring Accept: text/markdown or publishing a .md variant so agents get clean content
 </rule>
 <rule id="core/meta-description" severity="warning" category="Core SEO" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-description">
  Description too long
  Pages (1): /contact
  Items (1):
   - /contact (How to reach the team behind the ML-DSA Signature  (161 chars)) (from: /contact)
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
 <rule id="eeat/author-byline" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/author-byline">
  Only 25% of content pages have author attribution
 </rule>
 <rule id="eeat/content-dates" severity="warning" category="E-E-A-T" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/eeat/content-dates">
  Only 25% of content has datePublished
 </rule>
 <rule id="ax/token-weight" severity="warning" category="Agent Experience" group="ai" status="warn" docs="https://docs.squirrelscan.com/rules/ax/token-weight">
  Visible text is under 15% of the page HTML — agents pay token cost mostly for markup, scripts, and styles
  Pages (3): /about, /contact, /privacy
  Items (3):
   - /about (~13% of HTML is visible text (~5.806 est. tokens)) (from: /about)
   - /contact (~11% of HTML is visible text (~4.368 est. tokens)) (from: /contact)
   - /privacy (~12% of HTML is visible text (~4.574 est. tokens)) (from: /privacy)
 </rule>
</issues>
<entities count="7" references="6" dangling="0" conflicts="0" without-id="0" stable-id-share="0" pages-without-entities="3">
 <entity type="Article" name="About the ML-DSA Signature Demo" occurrences="1" pages="1"/>
 <entity type="Organization" name="ML-DSA Signature Demo" occurrences="1" pages="1"/>
 <entity type="Person" name="Mai Đức Minh" occurrences="1" pages="1"/>
 <entity type="Person" name="Ngô Bình Quang Anh" occurrences="1" pages="1"/>
 <entity type="Person" name="Trần Lê Minh" occurrences="1" pages="1"/>
 <entity type="Person" name="Đỗ Đình Hoàng Anh" occurrences="1" pages="1"/>
</entities>
</audit>