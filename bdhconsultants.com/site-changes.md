# bdhconsultants.com: compliance changes (live November 13, 2026)

Live since November 13, 2026, on your yes. The changes below are applied at the edge by the `site-compliance-edge` Worker in DH-Kaizen (see ../edge-worker/README.md for routes and rollback), so the Pages project `seo-bdhconsultants` and its source are untouched. The sections that follow describe what the Worker does; they also work as drop-in source edits if the site is ever rebuilt without the Worker.

Checked live November 13, 2026: home page styled as before, privacy choices banner shown with Reject optional and Accept analytics, legal footer with Your Privacy Choices, "© 2026 BDH Consultants LLC", the consulting-not-advice line with the Aliso Viejo address, the inquiry form notice, and /privacy/, /terms/, and /accessibility/ dated November 13, 2026. bdhconsultants.com redirects to www as before.

## Original change list
Source: Cloudflare Pages project `seo-bdhconsultants`, built from GitHub `Kaizen-AI-Lab/seo-bdhconsultants` (this session has no access to that repo, so these are drop-in edits).

## 1. Consent banner before Google Analytics
GA4 (G-2KG66XG3RH) loads on page load with no choice offered. Cloudflare Web Analytics is cookieless and can stay always on.
- Remove the hard-coded gtag snippet and add to every page's `<head>`:
```html
<script>window.CONSENT_CONFIG={policyUrl:"/privacy/",ga4Id:"G-2KG66XG3RH"};</script>
<script src="/consent.js" defer></script>
```
- Keep the existing custom events (form success, tel and mailto clicks, PDF downloads); they queue in `dataLayer` and only send after consent.

## 2. New pages and footer
- Publish `terms-of-use.md` at /terms/ and `accessibility-statement.md` at /accessibility/.
- Replace /privacy/ with `privacy-policy.md` (keeps your plain-English tone and adds the CalOPPA, GPC, and CCPA request elements that were missing).
- Footer line: `© 2026 BDH Consultants LLC · Privacy · Terms · Accessibility · Your Privacy Choices` (the last link is `<a href="#privacy-choices" data-consent-open>`).

## 3. Inquiry form
Add above "Send Inquiry": `We use your details only to reply. See our <a href="/privacy/">Privacy Policy</a>.` and point the form's `aria-describedby` at it.

## 4. Cloudflare housekeeping (needs your yes)
- Delete the leftover Squarespace `_domainconnect` CNAME.
- Delete the stale Worker `bdh-consultants` (last changed July 15) and the Pages project `bdh-astro`, after confirming neither serves anything.
- Add the apex `bdhconsultants.com` as a Pages custom domain (today only www is attached; the apex works through the CNAME but is not managed by Pages).
