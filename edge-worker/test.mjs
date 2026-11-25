import "./test-shim.mjs";
const { transform, SITES, default: W } = await import("./worker.mjs");
const bdhHtml = `<!doctype html><html><head><meta charset="utf-8"><script async src="https://www.googletagmanager.com/gtag/js?id=G-2KG66XG3RH"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-2KG66XG3RH');</script><script src="/_astro/app.js"></script></head><body><header>BDH</header><main><h1>Hi</h1><form><input name="name"><button>Send</button></form></main><footer><nav aria-label="Footer"><a href="/privacy/">Privacy</a></nav><p>© 2026 BDH Consultants. All rights reserved.</p></footer></body></html>`;
const envHtml = `<!doctype html><html lang="en"><head></head><body><main id="top"><form><input type="email"></form></main><footer><h4>Company</h4><a href="#">Privacy</a><a href="#">Careers</a><p>© 2026 enviRŌNment. All rights reserved.</p></footer></body></html>`;
const mk = (h) => new Response(h, { headers: { "content-type": "text/html" } });
const b = await transform(mk(bdhHtml), "bdh", SITES.bdh).text();
const e = await transform(mk(envHtml), "env", SITES.env).text();
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
ok(!b.includes("googletagmanager.com/gtag/js?id=G-2KG66XG3RH\"></script>"), "bdh GA src removed");
ok(b.includes("/_astro/app.js"), "bdh other script kept");
ok(b.indexOf("CONSENT_CONFIG") < b.indexOf("gtag('config'"), "consent default before site gtag config");
ok(b.includes('<html lang="en">'), "bdh lang added");
ok(b.includes("© 2026 BDH Consultants LLC."), "bdh copyright replaced");
ok(!b.includes("LLC. LLC"), "no double LLC");
ok(b.includes('class="cmp-bar"') && b.includes("Your Privacy Choices"), "bdh footer bar + choices");
ok(b.includes('<main id="main">'), "bdh main id");
ok(b.includes("cmp-form-note") && b.includes('href="/privacy/"'), "bdh form note");
ok(e.includes('<main id="top">'), "env keeps existing main id");
ok(e.includes('© 2026 CVDH LLC. enviRŌNment is a product'), "env copyright (multibyte)");
ok(e.includes('role="heading" aria-level="2"'), "env h4 role");
ok(!e.includes("CONSENT_CONFIG") && !e.includes("__compliance/consent.js"), "env no consent");
ok(e.includes("not a lender"), "env footer note");
ok(e.includes("footer a[href=\"#\"]"), "env link fix script");
console.log("---BDH---\n" + b + "\n---ENV---\n" + e);
// routes
globalThis.fetch = async (r) => new Response("<html><body>up</body></html>", { headers: { "content-type": "text/html" } });
for (const u of ["https://bdhconsultants.com/privacy", "https://bdhconsultants.com/privacy/", "https://environmentlending.com/terms/", "https://environmentlending.com/terms", "https://www.environmentlending.com/__compliance/consent.js", "https://example.com/"]) {
  const r = await W.fetch(new Request(u), {}, {});
  console.log(u, r.status, r.headers.get("location") || r.headers.get("content-type"));
}
