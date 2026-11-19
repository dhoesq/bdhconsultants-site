/*!
 * Lightweight cookie / tracking consent banner (no vendor, no dependencies).
 * - Nothing non-essential loads until the visitor chooses "Accept analytics".
 * - Honors Global Privacy Control (navigator.globalPrivacyControl) as an opt-out
 *   (Cal. Code Regs. tit. 11, § 7025) and shows that it was honored.
 * - Sets Google Consent Mode v2 defaults to "denied" before any Google tag runs.
 * - Choice is stored in a first-party cookie for 365 days; "Privacy choices" link reopens it.
 *
 * Usage: place BEFORE any analytics tag, and configure window.CONSENT_CONFIG:
 *   <script>
 *     window.CONSENT_CONFIG = {
 *       policyUrl: "/privacy",
 *       ga4Id: "G-XXXXXXXXXX",        // optional
 *       clarityId: "xxxxxxxxxx",      // optional (session replay; only after opt-in)
 *       ahrefsKey: "xxxxxxxx",        // optional
 *       ga4SiteConfigured: false      // true if the page keeps its own inline gtag("config") snippet
 *     };
 *   </script>
 *   <script src="/consent.js" defer></script>
 *   ...and REMOVE the existing hard-coded GA4 / Clarity / Ahrefs <script> tags.
 * Add anywhere in the footer:  <a href="#privacy-choices" data-consent-open>Your Privacy Choices</a>
 */
(function () {
  "use strict";
  var cfg = window.CONSENT_CONFIG || {};
  var COOKIE = "site_consent";
  var gpc = navigator.globalPrivacyControl === true;

  // Google Consent Mode v2: deny by default before anything loads.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: "denied", functionality_storage: "granted", security_storage: "granted",
    wait_for_update: 500
  });

  function read() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function write(v) {
    document.cookie = COOKIE + "=" + encodeURIComponent(v) + "; Max-Age=31536000; Path=/; SameSite=Lax; Secure";
  }
  function addScript(src, attrs) {
    var s = document.createElement("script");
    s.async = true; s.src = src;
    if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
    document.head.appendChild(s);
  }
  var loaded = false;
  function loadAnalytics() {
    if (loaded) return; loaded = true;
    window.gtag("consent", "update", { analytics_storage: "granted" });
    if (cfg.ga4Id) {
      addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4Id));
      // ga4SiteConfigured: the page's own inline snippet already queued gtag("js") and gtag("config"),
      // so only the library is loaded here (avoids a duplicate page_view).
      if (!cfg.ga4SiteConfigured) {
        window.gtag("js", new Date());
        window.gtag("config", cfg.ga4Id, { allow_google_signals: false, allow_ad_personalization_signals: false });
      }
    }
    if (cfg.clarityId) {
      (function (c, l, a, r, i) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        addScript("https://www.clarity.ms/tag/" + i);
      })(window, document, "clarity", "script", cfg.clarityId);
      window.clarity("consent");
    }
    if (cfg.ahrefsKey) addScript("https://analytics.ahrefs.com/analytics.js", { "data-key": cfg.ahrefsKey });
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  var banner;
  function close() { if (banner) { banner.remove(); banner = null; } }
  function choose(v) { write(v); close(); if (v === "accept") loadAnalytics(); else if (loaded) location.reload(); }

  function show(returnFocusTo) {
    if (banner) return;
    banner = el("section", { "class": "consent-banner", role: "region", "aria-label": "Privacy choices", tabindex: "-1" });
    var h = el("h2", { id: "consent-title" }, "Your privacy choices");
    var p = el("p", {}, gpc
      ? "Your browser sent a Global Privacy Control signal, so analytics stay off and we treat it as a request to opt out of the sale or sharing of your personal information. You can still turn analytics on below."
      : "We use strictly necessary cookies to run this site. With your permission we also use analytics tools to understand how the site is used. Nothing optional loads until you choose.");
    var link = el("a", { href: cfg.policyUrl || "/privacy" }, "Read our Privacy Policy");
    p.appendChild(document.createTextNode(" ")); p.appendChild(link);
    var row = el("div", { "class": "consent-actions" });
    var acc = el("button", { type: "button" }, "Accept analytics");
    var rej = el("button", { type: "button" }, "Reject optional");
    acc.addEventListener("click", function () { choose("accept"); if (returnFocusTo) returnFocusTo.focus(); });
    rej.addEventListener("click", function () { choose("reject"); if (returnFocusTo) returnFocusTo.focus(); });
    row.appendChild(rej); row.appendChild(acc);
    banner.appendChild(h); banner.appendChild(p); banner.appendChild(row);
    banner.addEventListener("keydown", function (e) { if (e.key === "Escape") { choose("reject"); } });
    document.body.appendChild(banner);
    if (returnFocusTo) banner.focus();
  }

  var css = ".consent-banner{position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;z-index:2147483000;background:#fff;color:#111;border:2px solid #111;border-radius:8px;padding:16px 18px;font:15px/1.5 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}" +
    ".consent-banner h2{font-size:17px;margin:0 0 6px}.consent-banner p{margin:0 0 12px}.consent-banner a{color:#0b57d0;text-decoration:underline}" +
    ".consent-actions{display:flex;gap:10px;flex-wrap:wrap}.consent-actions button{flex:1 1 160px;min-height:44px;font:inherit;font-weight:600;border:2px solid #111;border-radius:6px;padding:8px 14px;cursor:pointer;background:#fff;color:#111}" +
    ".consent-actions button:last-child{background:#111;color:#fff}.consent-banner :focus-visible{outline:3px solid #0b57d0;outline-offset:2px}" +
    "@media (prefers-reduced-motion:reduce){.consent-banner{transition:none}}";

  function init() {
    var style = el("style"); style.textContent = css; document.head.appendChild(style);
    var v = read();
    if (v === "accept") loadAnalytics(); // an explicit opt-in after a GPC signal is honored
    else if (!v) { if (gpc) write("reject"); show(); }
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-consent-open]");
      if (t) { e.preventDefault(); show(t); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
