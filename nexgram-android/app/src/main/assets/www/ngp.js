/** Кодек NGP/1 — свой протокол NexGram. */
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
  async commit(room, password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode("NGP1-commit:" + room + ":" + password));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
};
