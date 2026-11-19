// Compliance edge worker for bdhconsultants.com and environmentlending.com.
// Runs in front of the existing Cloudflare Pages sites (routes on the apex and www) and, without
// touching the site source:
//   - serves the Privacy Policy, Terms of Use, and Accessibility Statement,
//   - holds Google Analytics until the visitor opts in (bdhconsultants.com), honoring Global Privacy Control,
//   - adds legal links, the operating entity, and form notices to every page,
//   - fixes page-level accessibility gaps that don't need the source (lang, skip link, heading roles).
// On environmentlending.com it also carries the Nov 8 site fixes that the Worker environment-site-essentials
// used to apply on its own route (icons, share tags, and a real 404). The icon files are served by that Worker
// through the ESSENTIALS service binding, so they live in one place.
// Everything else is passed through untouched.
import { LEGAL, CONSENT_JS } from "./legal-content.mjs";

const ADDRESS = "26895 Aliso Creek Rd #B306, Aliso Viejo, CA 92656";

const SITES = {
  bdh: {
    hosts: ["bdhconsultants.com", "www.bdhconsultants.com"],
    previewHost: "www.bdhconsultants.com",
    slash: true,
    consent: { policyUrl: "/privacy/", ga4Id: "G-2KG66XG3RH", ga4SiteConfigured: true },
    skipLink: false, // the site already has its own "Skip To Content" link
    copyright: [
      ["© 2026 BDH Consultants.", "© 2026 BDH Consultants LLC."],
      ["&copy; 2026 BDH Consultants.", "&copy; 2026 BDH Consultants LLC."],
      ["&#169; 2026 BDH Consultants.", "&#169; 2026 BDH Consultants LLC."],
    ],
    footerNote: `BDH Consultants LLC · ${ADDRESS}. BDH Consultants provides business consulting, not legal, tax, or investment advice.`,
    formNote: 'We use what you send only to reply to you. See our <a href="/privacy/">Privacy Policy</a>.',
  },
  env: {
    hosts: ["environmentlending.com", "www.environmentlending.com"],
    previewHost: "environmentlending.com",
    slash: false,
    consent: null, // only cookieless Cloudflare Web Analytics (disclosed in the policy), so no banner is needed
    skipLink: true,
    essentials: true,
    copyright: [
      ["© 2026 enviRŌNment. All rights reserved.", "© 2026 CVDH LLC. enviRŌNment is a product of CVDH LLC. All rights reserved."],
      ["&copy; 2026 enviRŌNment. All rights reserved.", "&copy; 2026 CVDH LLC. enviRŌNment is a product of CVDH LLC. All rights reserved."],
      ["&copy; 2026 enviR&#332;Nment. All rights reserved.", "&copy; 2026 CVDH LLC. enviR&#332;Nment is a product of CVDH LLC. All rights reserved."],
      ["© 2026 enviR&#332;Nment. All rights reserved.", "© 2026 CVDH LLC. enviR&#332;Nment is a product of CVDH LLC. All rights reserved."],
    ],
    footerNote: `enviRŌNment is loan software offered by CVDH LLC, ${ADDRESS}. CVDH LLC is not a lender or loan broker, does not make or arrange loans, and does not make credit decisions. Pricing shown is illustrative; your quote controls.`,
    formNote: 'We use your email only to schedule your demo and follow up about it. See our <a href="/privacy">Privacy Policy</a>.',
    fixLinks: true,
  },
};

const TRACKER_SRC = /googletagmanager\.com|google-analytics\.com|clarity\.ms|analytics\.ahrefs\.com/i;

function siteFor(url) {
  // Preview override for testing on a workers.dev hostname: ?__site=bdh or ?__site=env
  const forced = url.searchParams.get("__site");
  if (forced && SITES[forced] && url.hostname.endsWith(".workers.dev")) return [forced, SITES[forced]];
  for (const [key, s] of Object.entries(SITES)) if (s.hosts.includes(url.hostname)) return [key, s];
  return [null, null];
}

function legalLinks(s) {
  const sl = s.slash ? "/" : "";
  let h = `<a href="/privacy${sl}">Privacy Policy</a><a href="/terms${sl}">Terms of Use</a><a href="/accessibility${sl}">Accessibility</a>`;
  if (s.consent) h += `<a href="#privacy-choices" data-consent-open>Your Privacy Choices</a>`;
  return h;
}

const BAR_CSS =
  ".cmp-bar{margin-top:20px;padding-top:14px;border-top:1px solid currentColor;border-top-color:rgba(127,127,127,.35);font-size:13px;line-height:1.6;opacity:.95}" +
  ".cmp-bar nav{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:6px}.cmp-bar a{color:inherit;text-decoration:underline}" +
  ".cmp-bar p{margin:0}.cmp-form-note{font-size:13px;line-height:1.5;margin:10px 0 0}.cmp-form-note a{color:inherit;text-decoration:underline}" +
  ".cmp-skip{position:absolute;left:-9999px;top:0}.cmp-skip:focus{left:16px;top:16px;z-index:2147483001;background:#fff;color:#111;padding:8px 12px;border:2px solid #111}";

// Client-side fixes that need the rendered text (link targets chosen by their label).
function fixScript(s) {
  if (!s.fixLinks) return "";
  return `<script>(function(){function f(){var m={"privacy":"/privacy"};document.querySelectorAll('footer a[href="#"]').forEach(function(a){var t=(a.textContent||"").trim().toLowerCase();if(m[t])a.setAttribute("href",m[t]);});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",f);else f();})();</script>`;
}

class TextReplacer {
  // Buffers each text node so a phrase split across chunks is still matched.
  constructor(pairs) { this.pairs = pairs; this.buf = ""; }
  text(t) {
    this.buf += t.text;
    t.remove();
    if (t.lastInTextNode) {
      let out = this.buf;
      for (const [a, b] of this.pairs) out = out.split(a).join(b);
      t.replace(out, { html: true });
      this.buf = "";
    }
  }
}

function transform(res, key, s) {
  let hasLang = false, sawMain = false, mainHasId = false;
  const head = [];
  if (s.consent) {
    head.push(`<script>window.CONSENT_CONFIG=${JSON.stringify(s.consent)};window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",functionality_storage:"granted",security_storage:"granted",wait_for_update:500});</script>`);
    head.push(`<script src="/__compliance/consent.js" defer></script>`);
  }
  head.push(`<style>${BAR_CSS}</style>`);

  return new HTMLRewriter()
    .on("html", { element(e) { if (!e.getAttribute("lang")) e.setAttribute("lang", "en"); } })
    .on("head", { element(e) { e.prepend(head.join(""), { html: true }); } })
    .on("script[src]", {
      element(e) { if (s.consent && TRACKER_SRC.test(e.getAttribute("src") || "")) e.remove(); },
    })
    .on("body", {
      element(e) {
        if (s.skipLink !== false) e.prepend(`<a class="cmp-skip" href="#main">Skip to content</a>`, { html: true });
        e.append(fixScript(s), { html: true });
      },
    })
    .on("main", { element(e) { if (!sawMain) { sawMain = true; if (!e.getAttribute("id")) e.setAttribute("id", "main"); } } })
    .on("footer h4", { element(e) { e.setAttribute("role", "heading"); e.setAttribute("aria-level", "2"); } })
    .on("footer", new TextReplacer(s.copyright))
    .on("footer", {
      element(e) {
        e.append(`<div class="cmp-bar"><nav aria-label="Legal">${legalLinks(s)}</nav><p>${s.footerNote}</p></div>`, { html: true });
      },
    })
    .on("form", { element(e) { e.append(`<p class="cmp-form-note">${s.formNote}</p>`, { html: true }); } })
    .transform(res);
}

// ---- enviRŌNment site fixes (moved from environment-site-essentials, Nov 8 behavior kept) ----
const ESS_FILES = ["/favicon.ico", "/apple-touch-icon.png", "/og-image.png", "/site.webmanifest"];
const ESS_HTML_PATHS = ["/", "/index.html"]; // pages the Pages build really serves; add any new page here
const ESS_NAME = "enviRŌNment";
const ESS_THEME = "#13c2e0";
const ESS_OG = {
  title: "enviRŌNment — Loan origination and servicing in one platform",
  description: "One platform for loan origination and servicing, from application to payoff. Unlimited users, pay per loan, month to month.",
  url: "https://environmentlending.com/",
  image: "https://environmentlending.com/og-image.png",
  imageAlt: "enviRŌNment: Lending, Origination, Servicing. Loan origination and servicing, built as one platform from the ground up.",
};
const ESS_ICON_LINKS =
  '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" type="image/png" sizes="180x180" href="/apple-touch-icon.png">' +
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">';
const escAttr = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const ESS_NOT_FOUND =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  `<title>Page not found | ${ESS_NAME}</title><meta name="robots" content="noindex">${ESS_ICON_LINKS}` +
  '<style>body{margin:0;font:18px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:#fff;color:#0b1f24}main{max-width:640px;margin:14vh auto;padding:24px}' +
  "h1{font-size:2rem;line-height:1.2;margin:.25rem 0 1rem}a{color:#0b1f24}.k{font-weight:700;letter-spacing:.1em;font-size:.8rem;color:#0aa6c2}" +
  ".row{display:flex;flex-wrap:wrap;gap:12px;margin-top:1.5rem}.btn{display:inline-block;padding:.65rem 1.1rem;border:1px solid #0b1f24;text-decoration:none;border-radius:8px}.btn.p{background:#0aa6c2;border-color:#0aa6c2;color:#06181c;font-weight:700}" +
  ".f{margin-top:2.5rem;font-size:14px}.f a{margin-right:16px}</style></head>" +
  `<body><main><p class="k">404</p><h1>That page isn’t here.</h1><p>The address may have a typo, or the page may have moved. Everything about ${ESS_NAME} starts on the homepage.</p>` +
  '<div class="row"><a class="btn p" href="/#demo">Book a demo</a><a class="btn" href="/">Go to the homepage</a></div>' +
  '<p class="f"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/accessibility">Accessibility</a></p></main></body></html>';

function addHeadTags(res) {
  const seen = new Set();
  return new HTMLRewriter()
    .on("meta[property], meta[name]", { element(e) { seen.add((e.getAttribute("property") || e.getAttribute("name") || "").toLowerCase()); } })
    .on("link[rel~=icon], link[rel=apple-touch-icon], link[rel=manifest]", { element() { seen.add("icon-link"); } })
    .on("head", {
      element(e) {
        e.onEndTag((end) => {
          const tags = [];
          if (!seen.has("icon-link")) tags.push(ESS_ICON_LINKS);
          if (!seen.has("theme-color")) tags.push(`<meta name="theme-color" content="${ESS_THEME}">`);
          const want = [
            ["og:type", "property", "website"], ["og:site_name", "property", ESS_NAME], ["og:title", "property", ESS_OG.title],
            ["og:description", "property", ESS_OG.description], ["og:url", "property", ESS_OG.url], ["og:image", "property", ESS_OG.image],
            ["og:image:width", "property", "800"], ["og:image:height", "property", "420"], ["og:image:alt", "property", ESS_OG.imageAlt],
            ["twitter:card", "name", "summary_large_image"], ["twitter:image", "name", ESS_OG.image],
          ];
          for (const [k, attr, v] of want) if (!seen.has(k)) tags.push(`<meta ${attr}="${k}" content="${escAttr(v)}">`);
          end.before(tags.join(""), { html: true });
        });
      },
    })
    .transform(res);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const [key, s] = siteFor(url);
    if (!s) return fetch(request);

    if (url.pathname === "/__compliance/consent.js") {
      return new Response(CONSENT_JS, {
        headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }

    const m = url.pathname.match(/^\/(privacy|terms|accessibility)\/?$/);
    if (m && (request.method === "GET" || request.method === "HEAD")) {
      const want = s.slash ? `/${m[1]}/` : `/${m[1]}`;
      if (url.pathname !== want) return Response.redirect(new URL(want + url.search, url).toString(), 301);
      return new Response(request.method === "HEAD" ? null : LEGAL[`${key}:${m[1]}`], {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600" },
      });
    }

    const read = request.method === "GET" || request.method === "HEAD";
    if (s.essentials && read && ESS_FILES.includes(url.pathname) && env && env.ESSENTIALS) {
      // Icons, share image, and manifest come from environment-site-essentials (no origin fetch there for these paths).
      return env.ESSENTIALS.fetch(new Request(new URL(url.pathname, "https://environmentlending.com/").toString(), request));
    }

    const upstream = forcedOrigin(url, s) ? new Request(forcedOrigin(url, s), request) : request;
    const res = await fetch(upstream);
    if (url.hostname.endsWith(".workers.dev") && url.searchParams.has("__raw")) {
      // Preview only: show the untouched upstream page source, for checking what the rewriter will see.
      return new Response(`<!-- upstream ${res.status} ${res.headers.get("location") || ""} -->\n` + await res.text(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    }
    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html")) return res;
    if (s.essentials) {
      if (read && !ESS_HTML_PATHS.includes(url.pathname)) {
        return new Response(request.method === "HEAD" ? null : ESS_NOT_FOUND, {
          status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }
      return transform(addHeadTags(res), key, s);
    }
    return transform(res, key, s);
  },
};

// On a workers.dev preview, fetch the real site instead of the preview hostname.
function forcedOrigin(url, s) {
  if (!url.hostname.endsWith(".workers.dev")) return null;
  const u = new URL(url);
  u.hostname = s.previewHost || s.hosts[0];
  u.searchParams.delete("__site");
  return u.toString();
}

export { transform, SITES };
