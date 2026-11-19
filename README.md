# bdhconsultants.com compliance layer

This repository holds the California compliance layer for bdhconsultants.com, operated by BDH Consultants LLC, 26895 Aliso Creek Rd #B306, Aliso Viejo, CA 92656.

The layer has been live since November 13, 2026. It runs at Cloudflare's edge, in front of the site, through the `site-compliance-edge` Worker in the DH-Kaizen Cloudflare account. The site's own page source still lives in the Cloudflare Pages project `seo-bdhconsultants`, which builds from `Kaizen-AI-Lab/seo-bdhconsultants`. Nothing in this repository is connected to Cloudflare, so merging here deploys nothing.

## What the layer adds

- A Privacy Policy, Terms of Use, and Accessibility Statement at /privacy/, /terms/, and /accessibility/, all dated November 13, 2026.
- A consent banner that holds Google Analytics until a visitor clicks "Accept analytics", with Google Consent Mode v2 defaulting to denied and Global Privacy Control honored as an opt-out.
- A "Your Privacy Choices" footer link that reopens the banner.
- A legal footer naming BDH Consultants LLC, the Aliso Viejo address, and a "consulting, not legal, tax, or investment advice" line.
- A privacy notice under the inquiry form.
- Accessibility fixes: page language, a "Skip to content" link, and a marked main content area.

## Layout

- `bdhconsultants.com/`: the policy texts in Markdown, with a date placeholder that `edge-worker/build.py` fills in (the live pages were built with `python3 build.py "November 13, 2026"`), and `site-changes.md`, which lists every change and can also be used as drop-in source edits if the site is rebuilt without the Worker.
- `shared/consent.js`: the consent banner script. `shared/cloudflare-zone-settings.md` lists the zone settings (HTTPS, HSTS, TLS).
- `edge-worker/`: the Worker as deployed, its build script, deploy config, and tests. See `edge-worker/README.md` for routes, deploy steps, and rollback.

## Shared Worker

The same `site-compliance-edge` Worker also serves environmentlending.com, so `worker.mjs`, `legal-content.mjs`, and `wrangler.toml` contain enviRŌNment's settings and pages as well. To rebuild `legal-content.mjs` with `edge-worker/build.py`, an `environmentlending.com/` folder with enviRŌNment's three policy files must sit beside `bdhconsultants.com/`. Those files will live in the enviRŌNment repository.

## Deploying

Deploying is a live change to bdhconsultants.com and environmentlending.com. Confirm the target is the DH-Kaizen account (e5ea8bb96c602e98a4bfe76eff3403ba) before any deploy, and deploy only with Don's approval.
