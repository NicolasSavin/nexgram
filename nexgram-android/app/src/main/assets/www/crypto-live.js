/** AES-256-GCM. На HTTPS — Web Crypto, на http:// — forge. */
const LiveCrypto = {
  key: null,
  mode: null,
  async unlock(passphrase, roomId) {
    const enc = new TextEncoder();
    const salt = enc.encode("NGP1-aes:" + roomId);
    if (globalThis.crypto && crypto.subtle) {
      try {
        const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
        this.key = await crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: 120000, hash: "SHA-256" },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
        this.mode = "subtle";
        return;
      } catch (e) { /* WebView sometimes breaks PBKDF2 — forge below */ }
    }
    if (typeof forge === "undefined") throw new Error("no crypto");
    let saltStr = "";
    for (let i = 0; i < salt.length; i++) saltStr += String.fromCharCode(salt[i]);
    this.key = forge.pkcs5.pbkdf2(
      forge.util.encodeUtf8(passphrase),
      saltStr,
      120000,
      32,
      forge.md.sha256.create()
    );
    this.mode = "forge";
  },
  toB64(u8) {
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  },
  fromB64(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  },
  strToU8(bin) {
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  },
  u8ToStr(u8) {
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  },
  async encrypt(plain) {
    return this.encryptBytes(new TextEncoder().encode(plain));
  },
  async encryptBytes(bytes) {
    if (!this.key) throw new Error("no key");
    if (this.mode === "subtle") {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, this.key, bytes);
      return { iv: this.toB64(iv), data: this.toB64(new Uint8Array(buf)) };
    }
    const iv = forge.random.getBytesSync(12);
    const cipher = forge.cipher.createCipher("AES-GCM", this.key);
    cipher.start({ iv: iv, tagLength: 128 });
    cipher.update(forge.util.createBuffer(this.u8ToStr(bytes)));
    if (!cipher.finish()) throw new Error("encrypt fail");
    const packed = cipher.output.getBytes() + cipher.mode.tag.getBytes();
    return { iv: this.toB64(this.strToU8(iv)), data: this.toB64(this.strToU8(packed)) };
  },
  async decrypt(ivB64, dataB64) {
    const bytes = await this.decryptBytes(ivB64, dataB64);
    return bytes ? new TextDecoder().decode(bytes) : null;
  },
  async decryptBytes(ivB64, dataB64) {
    try {
      const iv = this.fromB64(ivB64);
      const data = this.fromB64(dataB64);
      if (this.mode === "subtle") {
        const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, this.key, data);
        return new Uint8Array(buf);
      }
      const tag = this.u8ToStr(data.subarray(data.length - 16));
      const ct = this.u8ToStr(data.subarray(0, data.length - 16));
      const dec = forge.cipher.createDecipher("AES-GCM", this.key);
      dec.start({ iv: this.u8ToStr(iv), tag: tag, tagLength: 128 });
      dec.update(forge.util.createBuffer(ct));
      if (!dec.finish()) return null;
      return this.strToU8(dec.output.getBytes());
    } catch {
      return null;
    }
  }
};
