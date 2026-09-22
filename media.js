(function () {
  var pick = document.getElementById("filePick");
  if (!pick) {
    pick = document.createElement("input");
    pick.type = "file";
    pick.id = "filePick";
    pick.accept = "image/*,video/*,audio/*";
    pick.style.display = "none";
    document.body.appendChild(pick);
  }

  function addMsg(chat, extra) {
    var msg = Object.assign({ id: Date.now(), from: "me", text: extra.text || "Файл", ts: Date.now() }, extra);
    chat.messages.push(msg);
    if (typeof renderMessages === "function") renderMessages(chat);
    if (typeof renderList === "function") renderList(els.search.value);
  }

  function showIncoming(chat, fromNick, extra) {
    chat.messages.push(Object.assign({
      id: Date.now(),
      from: fromNick === (live && live.nick) ? "me" : "them",
      author: fromNick,
      ts: Date.now()
    }, extra));
    if (state.activeId === chat.id && typeof renderMessages === "function") renderMessages(chat);
    else chat.unread = (chat.unread || 0) + 1;
    if (typeof renderList === "function") renderList(els.search.value);
  }

  function blobUrl(bytes, mime) {
    return URL.createObjectURL(new Blob([bytes], { type: mime || "application/octet-stream" }));
  }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf("image/") !== 0) {
        resolve(file);
        return;
      }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1280;
        var w = img.width, h = img.height;
        if (w > max || h > max) {
          var r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) { resolve(b || file); }, "image/jpeg", 0.72);
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { resolve(file); };
      img.src = url;
    });
  }

  function chunkBytes(u8, size) {
    var out = [];
    for (var i = 0; i < u8.length; i += size) out.push(u8.subarray(i, i + size));
    return out;
  }

  async function sendEncrypted(file) {
    var chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : state.chats.find(function (c) { return c.id === state.activeId; });
    if (!chat) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Файл больше 4 МБ. Сожмите или отправьте фото.");
      return;
    }
    var packed = await compressImage(file);
    var buf = new Uint8Array(await packed.arrayBuffer());
    var mime = packed.type || file.type || "application/octet-stream";
    var localUrl = blobUrl(buf, mime);
    var kind = mime.indexOf("video/") === 0 ? "video" : mime.indexOf("audio/") === 0 ? "audio" : "image";
    var extra = { text: kind === "image" ? "Фото" : kind === "video" ? "Видео" : "Файл" };
    extra[kind] = localUrl;
    addMsg(chat, extra);

    if (!(typeof live !== "undefined" && live.enabled && live.ws && live.ws.readyState === 1 && LiveCrypto.key)) {
      return;
    }
    var parts = chunkBytes(buf, 12000);
    live.ws.send(JSON.stringify(NGP.frame("MEDIA_START", {
      room: live.roomId, nick: live.nick, mime: mime, name: (file.name || "").slice(0, 80), total: parts.length, kind: kind
    })));
    for (var i = 0; i < parts.length; i++) {
      var packet = await LiveCrypto.encryptBytes(parts[i]);
      live.ws.send(JSON.stringify(NGP.frame("MEDIA_CHUNK", {
        room: live.roomId, nick: live.nick, seq: i, mime: mime, kind: kind, ...packet
      })));
    }
    live.ws.send(JSON.stringify(NGP.frame("MEDIA_END", { room: live.roomId, nick: live.nick, mime: mime, kind: kind })));
  }

  var incoming = {};
  function handle(msg) {
    var b = msg.body || {};
    if (msg.t !== "MEDIA_START" && msg.t !== "MEDIA_CHUNK" && msg.t !== "MEDIA_END") return false;
    if (b.nick === (live && live.nick)) return true;
    var key = String(b.nick || "") + ":" + (b.kind || "file");
    if (msg.t === "MEDIA_START") {
      incoming[key] = { parts: [], mime: b.mime, kind: b.kind || "image", total: b.total || 0 };
      return true;
    }
    if (msg.t === "MEDIA_CHUNK") {
      if (!incoming[key]) incoming[key] = { parts: [], mime: b.mime, kind: b.kind || "image" };
      LiveCrypto.decryptBytes(b.iv, b.data).then(function (raw) {
        if (raw) incoming[key].parts[b.seq || 0] = raw;
      });
      return true;
    }
    if (msg.t === "MEDIA_END") {
      var pack = incoming[key];
      delete incoming[key];
      if (!pack) return true;
      setTimeout(function () {
        var total = 0;
        pack.parts.forEach(function (p) { if (p) total += p.length; });
        var u8 = new Uint8Array(total);
        var off = 0;
        pack.parts.forEach(function (p) {
          if (!p) return;
          u8.set(p, off);
          off += p.length;
        });
        var url = blobUrl(u8, pack.mime);
        var chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : null;
        if (!chat) return;
        var extra = { text: pack.kind === "video" ? "Видео" : pack.kind === "audio" ? "Аудио" : "Фото" };
        extra[pack.kind === "video" ? "video" : pack.kind === "audio" ? "audio" : "image"] = url;
        showIncoming(chat, b.nick, extra);
      }, 80);
      return true;
    }
    return false;
  }


  var btn = document.getElementById("attachBtn");
  if (btn) {
    btn.onclick = function (e) {
      e.preventDefault();
      pick.click();
    };
  }
  pick.addEventListener("change", function () {
    var f = pick.files && pick.files[0];
    pick.value = "";
    if (!f) return;
    sendEncrypted(f).catch(function () { alert("Не удалось отправить файл."); });
  });

  window.RadarMedia = { handle: handle, sendEncrypted: sendEncrypted };
})();
