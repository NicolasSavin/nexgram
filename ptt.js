const PTT = {
  rec: null,
  stream: null,
  seq: 0,
  talking: false,
  video: false,
  playQ: Promise.resolve(),
  mime: "audio/webm;codecs=opus",

  preview() { return document.getElementById("pttPreview"); },
  remote() { return document.getElementById("pttRemote"); },
  show(el, on) { if (el) el.classList.toggle("hidden", !on); },

  status(text, cls) {
    const el = document.getElementById("pttStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "ptt-status" + (cls ? " " + cls : "");
  },

  send(t, body) {
    if (typeof live !== "undefined" && live.enabled && live.ws && live.ws.readyState === 1 && live.inRoom) {
      live.ws.send(JSON.stringify(NGP.frame(t, body)));
      return true;
    }
    return false;
  },

  async start(videoMode) {
    if (this.talking) return;
    this.video = !!videoMode;
    const btn = document.getElementById(this.video ? "pttVidBtn" : "pttBtn");
    const cons = this.video
      ? { audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { max: 480 }, height: { max: 360 }, frameRate: { max: 12 } } }
      : { audio: { echoCancellation: true, noiseSuppression: true } };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(cons);
    } catch {
      this.status(this.video ? "Нет доступа к камере" : "Нет доступа к микрофону", "live");
      return;
    }
    if (this.video) {
      const prev = this.preview();
      if (prev) {
        prev.srcObject = this.stream;
        this.show(prev, true);
        prev.play().catch(function () {});
      }
    }
    const types = this.video
      ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    this.mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
    this.seq = 0;
    this.talking = true;
    btn && btn.classList.add("hot");
    const online = this.send("PTT_START", { room: live.roomId, nick: live.nick, video: this.video });
    if (!online) {
      this.status("Ждём реле…", "live");
      if (typeof startLive === "function" && live.nick && live.roomId) {
        try {
          var g = (typeof loadGate === "function" && loadGate()) || {};
          var pass = (live.roomId === "smena") ? "ntc-smena" : (g.pass || "ntc-smena");
          await startLive(live.nick, live.roomId, pass);
          this.send("PTT_START", { room: live.roomId, nick: live.nick, video: this.video });
          this.status(this.video ? "Видеоэфир… говорите" : "Эфир… говорите", "live");
        } catch (e) {
          this.status("Нет реле. Сеть или сервер.", "live");
        }
      } else {
        this.status("Нет реле. Сначала войдите в комнату.", "live");
      }
    } else {
      this.status(this.video ? "Видеоэфир… говорите" : "Эфир… говорите", "live");
    }

    const opts = this.mime ? { mimeType: this.mime } : {};
    if (this.video) opts.videoBitsPerSecond = 180000;
    else opts.audioBitsPerSecond = 24000;
    this.rec = new MediaRecorder(this.stream, opts);
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
          video: this.video,
          ...packet
        });
      }
    };
    this.rec.start(this.video ? 500 : 400);
  },

  stop() {
    document.getElementById("pttBtn") && document.getElementById("pttBtn").classList.remove("hot");
    document.getElementById("pttVidBtn") && document.getElementById("pttVidBtn").classList.remove("hot");
    if (this.rec && this.rec.state !== "inactive") {
      try { this.rec.stop(); } catch {}
    }
    this.rec = null;
    const prev = this.preview();
    if (prev) { prev.srcObject = null; this.show(prev, false); }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.talking) this.send("PTT_END", { room: live && live.roomId, nick: live && live.nick });
    this.talking = false;
    this.video = false;
    this.status("Рация · зажмите PTT или Видео");
  },

  async handle(msg) {
    const b = msg.body || {};
    if (msg.t === "PTT_START") {
      if (b.nick === (live && live.nick)) return;
      this.status((b.video ? "Видео: " : "Эфир: ") + (b.nick || "абонент"), "rx");
      if (window.RadarLive) RadarLive.notify(b.nick || "Рация", b.video ? "Видео в эфире" : "Говорит в эфире");
      if (b.video) this.show(this.remote(), true);
      return;
    }
    if (msg.t === "PTT_END") {
      this.show(this.remote(), false);
      const rv = this.remote();
      if (rv) rv.removeAttribute("src");
      if (!this.talking) this.status("Рация · зажмите PTT или Видео");
      return;
    }
    if (msg.t === "ERROR" && b.code === "PTT_BUSY") {
      this.status("Канал занят — отпустите и нажмите ещё раз", "live");
      return;
    }
    if (msg.t !== "PTT_CHUNK") return;
    if (b.nick === (live && live.nick)) return;
    if (!LiveCrypto.key) return;
    const raw = await LiveCrypto.decryptBytes(b.iv, b.data);
    if (!raw) return;
    const isVid = !!(b.video || (b.mime && String(b.mime).indexOf("video/") === 0));
    const blob = new Blob([raw], { type: b.mime || (isVid ? "video/webm" : "audio/webm") });
    const url = URL.createObjectURL(blob);
    this.playQ = this.playQ.then(() => this.play(url, isVid)).catch(() => {});
    const chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : null;
    if (chat && b.seq === 1) {
      chat.messages.push({
        id: Date.now(),
        from: "them",
        author: b.nick,
        text: isVid ? "Видеоэфир" : "Голосовое",
        voice: isVid ? undefined : url,
        video: isVid ? url : undefined,
        ts: Date.now()
      });
      if (typeof renderMessages === "function") renderMessages(chat);
    }
  },

  play(url, isVid) {
    return new Promise((resolve) => {
      if (isVid) {
        const v = this.remote();
        if (!v) { resolve(); return; }
        this.show(v, true);
        v.src = url;
        v.onended = resolve;
        v.onerror = resolve;
        v.play().catch(resolve);
        return;
      }
      const a = new Audio(url);
      a.onended = resolve;
      a.onerror = resolve;
      a.play().catch(resolve);
    });
  }
};

(function bindPtt() {
  function bind(id, video) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const down = (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      PTT.start(video);
    };
    const up = (e) => {
      e.preventDefault();
      try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
      PTT.stop();
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
  }
  bind("pttBtn", false);
  bind("pttVidBtn", true);
})();
