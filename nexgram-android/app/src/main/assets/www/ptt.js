const PTT = {
  rec: null,
  stream: null,
  seq: 0,
  talking: false,
  video: false,
  sticky: false,
  chan: 0,
  facing: "environment",
  localChunks: [],
  inbox: {},
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

  chanName(n) {
    const c = n == null ? this.chan : n;
    return c ? ("канал " + c) : "общий";
  },

  setChan(n) {
    if (this.talking) {
      this.status("Сначала отпустите рацию", "live");
      this.paintChan();
      return;
    }
    n = parseInt(n, 10);
    this.chan = (n >= 1 && n <= 100) ? n : 0;
    try { localStorage.setItem("radar-chan", String(this.chan)); } catch (e) {}
    this.paintChan();
    this.status("Рация · " + this.chanName());
  },

  paintChan() {
    const all = document.getElementById("chanAll");
    const num = document.getElementById("chanNum");
    if (all) all.classList.toggle("hot", !this.chan);
    if (num && document.activeElement !== num) num.value = this.chan ? String(this.chan) : "";
  },

  sameChan(b) {
    const n = parseInt(b && b.chan, 10);
    const theirs = (n >= 1 && n <= 100) ? n : 0;
    return theirs === (this.chan || 0);
  },

  send(t, body) {
    body = body || {};
    body.chan = this.chan || 0;
    if (typeof live !== "undefined" && live.enabled && live.ws && live.ws.readyState === 1 && live.inRoom) {
      live.ws.send(JSON.stringify(NGP.frame(t, body)));
      return true;
    }
    return false;
  },

  async start(videoMode, sticky) {
    if (this.talking) return;
    this.video = !!videoMode;
    this.sticky = !!sticky;
    this.localChunks = [];
    const btn = document.getElementById(this.video ? "pttVidBtn" : "pttBtn");
    const tries = this.video
      ? [
          { audio: true, video: { facingMode: this.facing, width: { ideal: 640 }, height: { ideal: 480 } } },
          { audio: true, video: { facingMode: this.facing } },
          { audio: true, video: true }
        ]
      : [{ audio: true }];
    this.stream = null;
    for (let i = 0; i < tries.length; i++) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(tries[i]);
        break;
      } catch (e) {}
    }
    if (!this.stream) {
      this.status(this.video ? "Нет доступа к камере" : "Нет доступа к микрофону", "live");
      return;
    }
    if (this.video) {
      const prev = this.preview();
      if (prev) {
        prev.srcObject = this.stream;
        prev.muted = true;
        prev.playsInline = true;
        prev.classList.toggle("front", this.facing === "user");
        this.show(prev, true);
        const kick = function () { prev.play().catch(function () {}); };
        kick();
        setTimeout(kick, 300);
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
      this.status(this.video ? (this.sticky ? "Постоянное видео" : "Видеоэфир… говорите") : "Эфир… говорите", "live");
    }

    const opts = this.mime ? { mimeType: this.mime } : {};
    if (this.video) opts.videoBitsPerSecond = 180000;
    else opts.audioBitsPerSecond = 24000;
    this.rec = new MediaRecorder(this.stream, opts);
    this.rec.ondataavailable = async (ev) => {
      if (!ev.data || ev.data.size < 12) return;
      if (!this.video) this.localChunks.push(ev.data);
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
    const flip = document.getElementById("pttFlipBtn");
    if (flip) flip.textContent = this.facing === "user" ? "Тыл" : "Фронт";
  },

  keepClip(blob, from, author, label) {
    const chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : null;
    if (!chat || !blob || blob.size < 12) return;
    const msg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      from: from,
      author: author,
      text: label,
      voice: URL.createObjectURL(blob),
      ts: Date.now()
    };
    chat.messages.push(msg);
    if (typeof saveState === "function") saveState();
    if (typeof renderMessages === "function" && typeof state !== "undefined" && isLiveId(state.activeId)) renderMessages(chat);
    if (blob.size < 500000) {
      const reader = new FileReader();
      reader.onload = function () {
        msg.voice = reader.result;
        if (typeof saveState === "function") saveState();
      };
      reader.readAsDataURL(blob);
    }
  },

  async flip() {
    this.facing = this.facing === "user" ? "environment" : "user";
    const flip = document.getElementById("pttFlipBtn");
    if (flip) flip.textContent = this.facing === "user" ? "Тыл" : "Фронт";
    if (!this.talking || !this.video) {
      this.status(this.facing === "user" ? "Камера: фронтальная" : "Камера: тыльная", "live");
      return;
    }
    const prev = this.preview();
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: this.facing }
      });
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      this.stream = next;
      if (prev) {
        prev.srcObject = next;
        prev.muted = true;
        prev.classList.toggle("front", this.facing === "user");
        prev.play().catch(function () {});
      }
      if (this.rec && this.rec.state !== "inactive") {
        try { this.rec.stop(); } catch (e) {}
      }
      const opts = this.mime ? { mimeType: this.mime, videoBitsPerSecond: 180000 } : { videoBitsPerSecond: 180000 };
      this.rec = new MediaRecorder(this.stream, opts);
      const self = this;
      this.rec.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size < 12) return;
        const buf = new Uint8Array(await ev.data.arrayBuffer());
        self.seq += 1;
        if (live.enabled && LiveCrypto.key) {
          const packet = await LiveCrypto.encryptBytes(buf);
          self.send("PTT_CHUNK", {
            room: live.roomId,
            nick: live.nick,
            seq: self.seq,
            mime: self.rec.mimeType || self.mime,
            video: true,
            ...packet
          });
        }
      };
      this.rec.start(500);
      this.status("Постоянное видео · " + (this.facing === "user" ? "фронт" : "тыл"), "live");
    } catch (e) {
      this.status("Камера не переключилась", "live");
    }
  },

  stop() {
    const chunks = this.localChunks || [];
    const wasVideo = this.video;
    document.getElementById("pttBtn") && document.getElementById("pttBtn").classList.remove("hot");
    document.getElementById("pttVidBtn") && document.getElementById("pttVidBtn").classList.remove("hot");
    if (this.rec && this.rec.state !== "inactive") {
      try { this.rec.stop(); } catch (e) {}
    }
    this.rec = null;
    const prev = this.preview();
    if (prev) { prev.srcObject = null; this.show(prev, false); }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (!wasVideo && chunks.length) {
      const blob = new Blob(chunks, { type: this.mime || "audio/webm" });
      this.keepClip(blob, "me", live && live.nick, "Голосовое · " + this.chanName());
    }
    this.localChunks = [];
    if (this.talking) this.send("PTT_END", { room: live && live.roomId, nick: live && live.nick });
    this.talking = false;
    this.video = false;
    this.sticky = false;
    this.status("Рация · " + this.chanName());
  },

  async handle(msg) {
    const b = msg.body || {};
    if (msg.t === "PTT_START" || msg.t === "PTT_CHUNK" || msg.t === "PTT_END") {
      if (!this.sameChan(b)) return;
    }
    if (msg.t === "PTT_START") {
      if (b.nick === (live && live.nick)) return;
      this.status((b.video ? "Видео: " : "Эфир: ") + (b.nick || "абонент"), "rx");
      if (window.RadarLive) RadarLive.notify(b.nick || "Рация", b.video ? "Видео в эфире" : "Говорит в эфире");
      if (b.video) this.show(this.remote(), true);
      return;
    }
    if (msg.t === "PTT_END") {
      const bag = this.inbox[b.nick];
      if (bag && bag.parts.length && !bag.video) {
        const blob = new Blob(bag.parts, { type: bag.mime || "audio/webm" });
        this.keepClip(blob, "them", b.nick, "Голосовое · " + this.chanName(b.chan));
      }
      if (b.nick) delete this.inbox[b.nick];
      this.show(this.remote(), false);
      const rv = this.remote();
      if (rv) rv.removeAttribute("src");
      if (!this.talking) this.status("Рация · " + this.chanName());
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
    if (!this.inbox[b.nick]) this.inbox[b.nick] = { parts: [], mime: b.mime, video: isVid };
    const bag = this.inbox[b.nick];
    bag.video = bag.video || isVid;
    bag.mime = b.mime || bag.mime;
    bag.parts.push(new Blob([raw], { type: b.mime || "application/octet-stream" }));
    const blob = new Blob([raw], { type: b.mime || (isVid ? "video/webm" : "audio/webm") });
    const url = URL.createObjectURL(blob);
    this.playQ = this.playQ.then(() => this.play(url, isVid)).catch(() => {});
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
  const vid = document.getElementById("pttVidBtn");
  if (vid) {
    vid.addEventListener("click", function (e) {
      e.preventDefault();
      if (PTT.talking && PTT.video && PTT.sticky) PTT.stop();
      else if (!PTT.talking) PTT.start(true, true);
    });
  }
  const flip = document.getElementById("pttFlipBtn");
  if (flip) {
    flip.addEventListener("click", function (e) {
      e.preventDefault();
      PTT.flip();
    });
  }
  try { PTT.chan = parseInt(localStorage.getItem("radar-chan") || "0", 10) || 0; } catch (e) {}
  if (PTT.chan < 1 || PTT.chan > 100) PTT.chan = 0;
  PTT.paintChan();
  PTT.status("Рация · " + PTT.chanName());
  const all = document.getElementById("chanAll");
  const num = document.getElementById("chanNum");
  if (all) all.addEventListener("click", function () { PTT.setChan(0); });
  if (num) num.addEventListener("change", function () { PTT.setChan(num.value); });
})();
