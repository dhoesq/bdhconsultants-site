# Compliance edge worker (bdhconsultants.com and environmentlending.com)

This Worker sits in front of the two existing Cloudflare Pages sites and adds the compliance pieces without touching their source code. Live since November 13, 2026, on Don's yes, with the policies dated November 13, 2026.

## What it does

On both sites:

- Serves the Privacy Policy, Terms of Use, and Accessibility Statement at /privacy, /terms, and /accessibility (with a trailing slash on bdhconsultants.com, matching that site's links).
- Adds a legal footer bar with links to all three pages, the operating entity, and the Aliso Viejo address.
- Adds a short privacy notice under every form.
- Sets the page language to English, adds a "Skip to content" link, and marks the main content area.

On bdhconsultants.com only:

- Removes the hard-coded Google Analytics loader and loads it only after a visitor clicks "Accept analytics" (Google Consent Mode v2 defaults to denied).
- Honors Global Privacy Control as an opt-out.
- Adds a "Your Privacy Choices" link that reopens the banner.
- Changes the footer copyright to "BDH Consultants LLC" and adds a "consulting, not legal, tax, or investment advice" line.
- The new Privacy Policy replaces the existing one at /privacy/.

On environmentlending.com only:

- No consent banner, because the site loads no analytics or advertising tags.
- Changes the footer copyright to CVDH LLC and adds the "not a lender or loan broker" statement.
- Points the dead footer "Privacy" link to /privacy.
- Gives the footer h4 headings a level-2 heading role so the outline no longer skips a level.

## What it can't fix

- The enviRŌNment pricing slider announces a different number than it shows; that needs a source change.
- The other dead enviRŌNment footer links (Careers, Security, Documentation, Status, Sign in) need real destinations or removal in the source.

## Files

- worker.mjs: the Worker.
- legal-content.mjs: generated pages and the consent script. Do not edit by hand.
- build.py: rebuilds legal-content.mjs from the site markdown and ../shared/consent.js.
- wrangler.toml: deploy config for the DH-Kaizen account, with the live routes and the ESSENTIALS service binding.
- test.mjs and test-shim.mjs: local tests (run with html-rewriter-wasm installed).

## What is live (November 13, 2026)

Worker `site-compliance-edge` in DH-Kaizen (e5ea8bb96c602e98a4bfe76eff3403ba). Preview: https://site-compliance-edge.don-e5e.workers.dev/ with ?__site=bdh or ?__site=env.

Routes:

| Zone | Pattern | Route id |
| --- | --- | --- |
| bdhconsultants.com | www.bdhconsultants.com/* | fccf392cb2604aa4a9298e20fb5ee50f |
| bdhconsultants.com | bdhconsultants.com/* | a8ca6ed1f28f4cc4be7b6599fbe2ac6a |
| environmentlending.com | environmentlending.com/* | b3e656b6ca8b479fb1774e6ff75f57cf (was environment-site-essentials) |

Untouched: environmentlending.com/robots.txt and /sitemap.xml (environment-seo-discovery-v1), the www-to-apex redirect rule, all DNS, and email.

For enviRŌNment the Worker passes /favicon.ico, /og-image.png and the other essentials files to environment-site-essentials through the ESSENTIALS binding, and returns that Worker's 404 page (with legal links) for unknown paths, so the November 8 fixes keep working.

Checked live on November 13, 2026: both home pages, footers, form notes, all six policy pages with the November 13 date, the BDH consent banner, the enviRŌNment 404 page, share image, and robots.txt.

## Rollback

1. In the environmentlending.com zone, edit route b3e656b6ca8b479fb1774e6ff75f57cf back to Worker `environment-site-essentials`.
2. In the bdhconsultants.com zone, delete routes fccf392cb2604aa4a9298e20fb5ee50f and a8ca6ed1f28f4cc4be7b6599fbe2ac6a.
3. Leave the Worker uploaded with no routes. Both sites go straight back to what they served before.

## Changing the pages later

Edit the site markdown, run `python3 build.py "<new date>"`, and upload worker.mjs and legal-content.mjs again with the same metadata (main_module worker.mjs, compatibility date 2026-10-01, ESSENTIALS service binding). The routes do not need to change.

## Local test

```
npm install html-rewriter-wasm@0.4.1
node test.mjs
```
