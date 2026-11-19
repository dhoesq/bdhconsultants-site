import { HTMLRewriter as WasmRewriter } from "html-rewriter-wasm";
export class HTMLRewriter {
  constructor() { this.h = []; }
  on(sel, handler) { this.h.push([sel, handler]); return this; }
  transform(res) {
    const h = this.h;
    const body = (async () => {
      const src = await res.text();
      let out = "";
      const dec = new TextDecoder();
      const rw = new WasmRewriter((c) => { out += dec.decode(c); });
      for (const [s, x] of h) rw.on(s, x);
      // feed in small chunks to exercise split text nodes
      const enc = new TextEncoder().encode(src);
      for (let i = 0; i < enc.length; i += 7) await rw.write(enc.slice(i, i + 7));
      await rw.end(); rw.free();
      return out;
    })();
    return { text: () => body, headers: res.headers };
  }
}
globalThis.HTMLRewriter = HTMLRewriter;
