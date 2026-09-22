/** Кодек NGP/1. SHA-256 работает и без HTTPS. */
const NGP = {
  P: "NGP",
  V: 1,
  frame(t, body, id) {
    return {
      p: this.P,
      v: this.V,
      t,
      id: id || Math.random().toString(16).slice(2, 10),
      ts: Date.now(),
      body: body || {}
    };
  },
  parse(raw) {
    const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!msg || msg.p !== "NGP" || msg.v !== 1 || !msg.t) return null;
    return msg;
  },
  async sha256bytes(bytes) {
    if (globalThis.crypto && crypto.subtle) {
      return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    }
    if (typeof forge !== "undefined") {
      const md = forge.md.sha256.create();
      md.update(forgeBytes(bytes));
      const d = md.digest().getBytes();
      const out = new Uint8Array(d.length);
      for (let i = 0; i < d.length; i++) out[i] = d.charCodeAt(i);
      return out;
    }
    throw new Error("no sha256");
  },
  async commit(room, password) {
    const enc = new TextEncoder();
    const buf = await this.sha256bytes(enc.encode("NGP1-commit:" + room + ":" + password));
    return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
};

function forgeBytes(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}
