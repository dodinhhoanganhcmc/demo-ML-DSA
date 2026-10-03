<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.101">
<site url="http://localhost:3000" crawled="4" date="2026-10-02T08:21:22.220Z"/>
<score overall="74" grade="C">
 <group name="SEO" score="84" errors="1" warnings="8"/>
 <group name="Performance" score="94" errors="2" warnings="4"/>
 <group name="Security" score="85" errors="4" warnings="0"/>
 <group name="Agents" score="90" errors="0" warnings="4"/>
 <cat name="Security" score="79"/>
 <cat name="Performance" score="94"/>
 <cat name="Structured Data" score="83"/>
 <cat name="Agent Experience" score="90"/>
 <cat name="Accessibility" score="99"/>
 <cat name="E-E-A-T" score="83"/>
 <cat name="Content" score="99"/>
 <cat name="Core SEO" score="100"/>
 <cat name="Crawlability" score="100"/>
 <cat name="Internationalization" score="100"/>
 <cat name="Images" score="100"/>
 <cat name="Site Integrity" score="100"/>
 <cat name="Legal Compliance" score="100"/>
 <cat name="Links" score="100"/>
 <cat name="Mobile" score="100"/>
 <cat name="Social Media" score="100"/>
 <cat name="URL Structure" score="100"/>
</score>
<summary passed="438" warnings="22" failed="7"/>
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
 <rule id="content/keyword-stuffing" severity="warning" category="Content" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/content/keyword-stuffing">
  1 word(s) may be overused
  Pages (1): /
  Items (1):
   - dsa (&quot;dsa&quot; (3.2%)) [count: 11, density: 3.225806451612903] (from: /)
 </rule>
 <rule id="schema/json-ld-valid" severity="warning" category="Structured Data" group="seo" status="fail" docs="https://docs.squirrelscan.com/rules/schema/json-ld-valid">
  Invalid JSON-LD syntax
  Pages (1): /about
  Items (4):
   - Article:image (Article missing image) [message: Validation: Article.image is required, severity: missing, path: [&quot;image&quot;]] (from: /about)
   - Article:publisher.logo (Article missing publisher.logo) [message: Validation: Article.publisher.logo is required, severity: missing, path: [&quot;publisher&quot;,&quot;logo&quot;]] (from: /about)
   - parse-0 (Validation: Article.image is required) (from: /about)
   - parse-1 (Validation: Article.publisher.logo is required) (from: /about)
 </rule>
 <rule id="schema/entity-authors" severity="warning" category="Structured Data" group="seo" status="warn" docs="https://docs.squirrelscan.com/rules/schema/entity-authors">
  1 of 1 Person entity has no url and no sameAs
  Pages (1): /about
  Items (1):
   - syn:Person|name:[student name] ([student name] (Person)) [types: [&quot;Person&quot;], pages: 1, occurrences: 1] (from: /about)
 </rule>
 <rule id="perf/bad-caching" severity="warning" category="Performance" group="performance" status="fail" docs="https://docs.squirrelscan.com/rules/perf/bad-caching">
  4/4 pages set no caching policy (no freshness lifetime and no validator); 4/4 pages lack an ETag or Last-Modified validator
  Pages (4): /, /about, /contact, /privacy
 </rule>
 <rule id="perf/critical-request-chains" severity="warning" category="Performance" group="performance" status="warn" docs="https://docs.squirrelscan.com/rules/perf/critical-request-chains">
  1 critical request chain(s) found
  Pages (4): /, /about, /contact, /privacy
  Items (1):
   - CSS: /_next/static/chunks/25i-skptbephz.css (from: /, /about, /contact, /privacy)
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
  Pages (4): /, /about, /contact, /privacy
  Items (4):
   - / (~14% of HTML is visible text (~4.862 est. tokens)) (from: /)
   - /about (~13% of HTML is visible text (~5.490 est. tokens)) (from: /about)
   - /contact (~11% of HTML is visible text (~4.280 est. tokens)) (from: /contact)
   - /privacy (~11% of HTML is visible text (~4.487 est. tokens)) (from: /privacy)
 </rule>
</issues>
<entities count="3" references="2" dangling="0" conflicts="0" without-id="0" stable-id-share="0" pages-without-entities="3">
 <entity type="Article" name="About the ML-DSA Signature Demo" occurrences="1" pages="1"/>
 <entity type="Organization" name="ML-DSA Signature Demo" occurrences="1" pages="1"/>
 <entity type="Person" name="[student name]" occurrences="1" pages="1"/>
</entities>
</audit>