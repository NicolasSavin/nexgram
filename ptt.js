const PTT = {
  rec: null,
  stream: null,
  seq: 0,
  talking: false,
  playQ: Promise.resolve(),
  mime: "audio/webm;codecs=opus",

  status(text, cls) {
    const el = document.getElementById("pttStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "ptt-status" + (cls ? " " + cls : "");
  },

  send(t, body) {
    if (typeof live !== "undefined" && live.enabled && live.ws && live.ws.readyState === 1) {
      live.ws.send(JSON.stringify(NGP.frame(t, body)));
      return true;
    }
    return false;
  },

  async start() {
    if (this.talking) return;
    const btn = document.getElementById("pttBtn");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      this.status("Нет доступа к микрофону", "live");
      return;
    }
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    this.mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
    this.seq = 0;
    this.talking = true;
    btn && btn.classList.add("hot");
    const online = this.send("PTT_START", { room: live.roomId, nick: live.nick });
    this.status(online ? "Эфир… говорите" : "Запись только у вас (нет реле)", "live");

    this.rec = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
    this.rec.ondataavailable = async (ev) => {
      if (!ev.data || ev.data.size < 12) return;
      const buf = new Uint8Array(await ev.data.arrayBuffer());
      this.seq += 1;
      if (live.enabled && LiveCrypto.key) {
        const packet = await LiveCrypto.encryptBytes(buf);
        this.send("PTT_CHUNK", {
          room: live.roomId,
          nick: live.nick,
          seq: this.seq,
          mime: this.rec.mimeType || this.mime,
          ...packet
        });
      } else {
        this.addLocalVoice(URL.createObjectURL(ev.data));
      }
    };
    this.rec.start(400);
  },

  stop() {
    const btn = document.getElementById("pttBtn");
    btn && btn.classList.remove("hot");
    if (this.rec && this.rec.state !== "inactive") {
      try { this.rec.stop(); } catch {}
    }
    this.rec = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.talking) this.send("PTT_END", { room: live && live.roomId, nick: live && live.nick });
    this.talking = false;
    this.status("Рация · зажмите и говорите");
  },

  addLocalVoice(url) {
    const chat = (typeof state !== "undefined" && state.chats.find((c) => c.id === state.activeId)) || (typeof ensureLiveChat === "function" ? ensureLiveChat() : null);
    if (!chat) return;
    chat.messages.push({
      id: Date.now(),
      from: "me",
      text: "Голосовое",
      voice: url,
      ts: Date.now()
    });
    if (typeof saveState === "function") saveState();
    if (typeof renderMessages === "function") renderMessages(chat);
  },

  async handle(msg) {
    const b = msg.body || {};
    if (msg.t === "PTT_START") {
      if (b.nick === (live && live.nick)) return;
      this.status("Эфир: " + (b.nick || "абонент"), "rx");
      return;
    }
    if (msg.t === "PTT_END") {
      if (!this.talking) this.status("Рация · зажмите и говорите");
      return;
    }
    if (msg.t === "ERROR" && b.code === "PTT_BUSY") {
      this.status("Канал занят", "live");
      this.stop();
      return;
    }
    if (msg.t !== "PTT_CHUNK") return;
    if (b.nick === (live && live.nick)) return;
    if (!LiveCrypto.key) return;
    const raw = await LiveCrypto.decryptBytes(b.iv, b.data);
    if (!raw) return;
    const blob = new Blob([raw], { type: b.mime || "audio/webm" });
    const url = URL.createObjectURL(blob);
    this.playQ = this.playQ.then(() => this.play(url)).catch(() => {});
    const chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : null;
    if (chat && msg.seq === 1) {
      chat.messages.push({
        id: Date.now(),
        from: "them",
        author: b.nick,
        text: "Голосовое",
        voice: url,
        ts: Date.now()
      });
      if (state.activeId === "live" && typeof renderMessages === "function") renderMessages(chat);
    }
  },

  play(url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      a.onended = resolve;
      a.onerror = resolve;
      a.play().catch(resolve);
    });
  }
};

(function bindPtt() {
  const btn = document.getElementById("pttBtn");
  if (!btn) return;
  const down = (e) => { e.preventDefault(); PTT.start(); };
  const up = (e) => { e.preventDefault(); PTT.stop(); };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  btn.addEventListener("pointerleave", () => { if (PTT.talking) PTT.stop(); });
})();
