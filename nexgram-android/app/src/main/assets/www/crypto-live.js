/** Клиентское шифрование AES-GCM. Ключ выводится из пароля комнаты (PBKDF2). Сервер видит только ciphertext. */
const LiveCrypto = {
  key: null,
  async unlock(passphrase, roomId) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    this.key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode("NGP1-aes:" + roomId), iterations: 120000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
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
  async encrypt(plain) {
    const packet = await this.encryptBytes(new TextEncoder().encode(plain));
    return packet;
  },
  async encryptBytes(bytes) {
    if (!this.key) throw new Error("no key");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.key, bytes);
    return { iv: this.toB64(iv), data: this.toB64(new Uint8Array(buf)) };
  },
  async decrypt(ivB64, dataB64) {
    const bytes = await this.decryptBytes(ivB64, dataB64);
    return bytes ? new TextDecoder().decode(bytes) : null;
  },
  async decryptBytes(ivB64, dataB64) {
    try {
      const iv = this.fromB64(ivB64);
      const data = this.fromB64(dataB64);
      const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, this.key, data);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }
};
