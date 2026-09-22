const EMOJIS = "😀😁😂🤣😊😍😘😎🤔😴😢😡👍👎❤️🔥✨🎉👏🙏✅❌⭐💯👋🤝💡🚀🎯".split(/(?:)/u).filter(Boolean);

const AVATAR_COLORS = ["#e17076","#faa774","#a695e7","#7bc862","#6ec9cb","#65aadd","#ee7aae","#6b8afd"];

function colorFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yest.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
function previewText(text) {
  return text.replace(/\n/g, " ").slice(0, 80);
}

const ROUTES_URL = "https://nicolassavin.github.io/multimodal-routes/";

const DEFAULT_CHATS = [
  {
    id: "routes",
    name: "Маршруты",
    type: "channel",
    color: "#c8943c",
    initials: "М",
    status: "поезд и автобус",
    unread: 0,
    messages: [
      { id: 1, from: "them", text: "Мультимодальный маршрут · НТЦ Охрана. Поезд и автобус, пересадки, места на Туту и Busfor.", ts: Date.now() - 30000 }
    ]
  },
  {
    id: "saved",
    name: "Избранное",
    type: "saved",
    color: "#6b8afd",
    initials: "★",
    status: "облако заметок",
    unread: 0,
    muted: false,
    messages: [
      { id: 1, from: "me", text: "Черновик: доделать NexGram и показать Николаю.", ts: Date.now() - 86400000 * 2 - 3600000 },
      { id: 2, from: "me", text: "Идеи:\n• тёмная тема как в Telegram\n• локальное хранение\n• автоответы в демо", ts: Date.now() - 3600000 }
    ]
  },
  {
    id: "anna",
    name: "Анна Козлова",
    type: "private",
    online: true,
    status: "в сети",
    unread: 2,
    messages: [
      { id: 1, from: "them", text: "Привет! Ты уже видел новый прототип?", ts: Date.now() - 7200000 },
      { id: 2, from: "me", text: "Да, как раз собираю интерфейс.", ts: Date.now() - 7000000 },
      { id: 3, from: "them", text: "Выглядит почти как Telegram Web 🔥", ts: Date.now() - 120000 },
      { id: 4, from: "them", text: "Кинь ссылку, когда будет готово", ts: Date.now() - 60000 }
    ]
  },
  {
    id: "team",
    name: "Команда проекта",
    type: "group",
    status: "12 участников",
    unread: 5,
    messages: [
      { id: 1, from: "them", author: "Максим", text: "Дедлайн по макету — понедельник.", ts: Date.now() - 5000000 },
      { id: 2, from: "them", author: "Ира", text: "Я залью иконки вечером.", ts: Date.now() - 4800000 },
      { id: 3, from: "me", text: "Ок, тогда вечером соберём сборку.", ts: Date.now() - 4000000 }
    ]
  },
  {
    id: "news",
    name: "NexGram News",
    type: "channel",
    status: "4 812 подписчиков",
    unread: 1,
    muted: true,
    messages: [
      { id: 1, from: "them", text: "Обновление 0.1: тёмная тема, избранное, поиск по чатам и локальное сохранение истории.", ts: Date.now() - 20000000 }
    ]
  },
  {
    id: "alex",
    name: "Алексей Морозов",
    type: "private",
    status: "был(а) недавно",
    unread: 0,
    messages: [
      { id: 1, from: "me", text: "Поедем завтра?", ts: Date.now() - 90000000 },
      { id: 2, from: "them", text: "Да, давай в 11 у метро.", ts: Date.now() - 89000000 }
    ]
  },
  {
    id: "support",
    name: "Поддержка NexGram",
    type: "bot",
    status: "бот",
    unread: 0,
    messages: [
      { id: 1, from: "them", text: "Здравствуйте! Это демо-мессенджер. Напишите «помощь», чтобы увидеть команды.", ts: Date.now() - 100000 }
    ]
  }
];

const REPLIES = {
  anna: [
    "Отлично, жду!",
    "Супер 🔥",
    "Давай вечером созвонимся?",
    "Выглядит чисто, мне нравится."
  ],
  team: [
    "Принято.",
    "Могу взять на себя эту часть.",
    "Давайте зафиксируем в задаче."
  ],
  alex: [
    "Ок!",
    "Напиши за час.",
    "Договорились."
  ],
  support: null
};

const STORAGE_KEY = "nexgram-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { chats: structuredClone(DEFAULT_CHATS), theme: "dark", activeId: null };
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats: state.chats, theme: state.theme, activeId: state.activeId }));
}

const state = loadState();
if (!state.chats.some((c) => c.id === "routes")) {
  state.chats.unshift(structuredClone(DEFAULT_CHATS.find((c) => c.id === "routes")));
}
let emojiOpen = false;

const els = {
  app: document.getElementById("app"),
  chatList: document.getElementById("chatList"),
  search: document.getElementById("searchInput"),
  empty: document.getElementById("emptyState"),
  conv: document.getElementById("conversation"),
  messages: document.getElementById("messages"),
  convName: document.getElementById("convName"),
  convStatus: document.getElementById("convStatus"),
  convAvatar: document.getElementById("convAvatar"),
  composer: document.getElementById("composer"),
  input: document.getElementById("msgInput"),
  menuBtn: document.getElementById("menuBtn"),
  drawer: document.getElementById("drawer"),
  backdrop: document.getElementById("drawerBackdrop"),
  backBtn: document.getElementById("backBtn"),
  emojiBtn: document.getElementById("emojiBtn"),
  emojiPanel: document.getElementById("emojiPanel"),
  attachBtn: document.getElementById("attachBtn")
};

document.documentElement.dataset.theme = state.theme === "light" ? "light" : "dark";

function lastMessage(chat) {
  return chat.messages[chat.messages.length - 1];
}

function renderList(filter = "") {
  const q = filter.trim().toLowerCase();
  const chats = [...state.chats].sort((a, b) => (lastMessage(b)?.ts || 0) - (lastMessage(a)?.ts || 0));
  els.chatList.innerHTML = "";
  chats.forEach((chat) => {
    const last = lastMessage(chat);
    const hay = (chat.name + " " + (last?.text || "")).toLowerCase();
    if (q && !hay.includes(q)) return;
    const item = document.createElement("div");
    item.className = "chat-item" + (state.activeId === chat.id ? " active" : "");
    item.dataset.id = chat.id;
    const color = chat.color || colorFor(chat.name);
    const ini = chat.initials || initials(chat.name);
    const who = last?.from === "me" ? "<b>Вы: </b>" : last?.author ? `<b>${last.author}: </b>` : "";
    item.innerHTML = `
      <div class="avatar" style="background:${color}">
        ${ini}
        ${chat.online ? '<span class="online-dot"></span>' : ""}
      </div>
      <div class="chat-meta">
        <div class="chat-top">
          <div class="chat-name">${chat.name}</div>
          <div class="time">${last ? fmtTime(last.ts) : ""}</div>
        </div>
        <div class="chat-bottom">
          <div class="preview">${last ? who + previewText(last.text) : "Нет сообщений"}</div>
          ${chat.unread ? `<span class="badge${chat.muted ? " muted" : ""}">${chat.unread}</span>` : ""}
        </div>
      </div>`;
    item.addEventListener("click", () => openChat(chat.id));
    els.chatList.appendChild(item);
  });
}

function openRoutes() {
  const panel = document.getElementById("routesPanel");
  const frame = document.getElementById("routesFrame");
  if (!panel || !frame) return;
  if (!frame.src || frame.src === "about:blank") frame.src = ROUTES_URL;
  panel.classList.remove("hidden");
}

function openChat(id) {
  if (id === "routes") {
    openRoutes();
    return;
  }
  const chat = state.chats.find((c) => c.id === id);
  if (!chat) return;
  state.activeId = id;
  chat.unread = 0;
  saveState();
  els.empty.classList.add("hidden");
  els.conv.classList.remove("hidden");
  els.app.classList.add("chat-open");
  const color = chat.color || colorFor(chat.name);
  els.convAvatar.style.background = color;
  els.convAvatar.textContent = chat.initials || initials(chat.name);
  els.convName.textContent = chat.name;
  els.convStatus.textContent = chat.online ? "в сети" : chat.status;
  els.convStatus.classList.toggle("online", !!chat.online);
  renderMessages(chat);
  renderList(els.search.value);
  els.input.focus();
  var ptt = document.querySelector(".ptt-wrap");
  if (ptt) ptt.style.display = id === "live" ? "" : "none";
}

function renderMessages(chat) {
  els.messages.innerHTML = "";
  let lastDay = "";
  chat.messages.forEach((m) => {
    const day = fmtDay(m.ts);
    if (day !== lastDay) {
      lastDay = day;
      const sep = document.createElement("div");
      sep.className = "day-sep";
      sep.textContent = day;
      els.messages.appendChild(sep);
    }
    const el = document.createElement("div");
    el.className = "msg " + (m.from === "me" ? "out" : "in");
    const ticks = m.from === "me" ? '<span class="ticks">✓✓</span>' : "";
    const author = m.author && chat.type === "group" ? `<div style="color:#6ec9cb;font-weight:600;font-size:13px;margin-bottom:2px">${m.author}</div>` : "";
    el.innerHTML = `${author}<span class="text"></span><span class="meta">${fmtTime(m.ts)}${ticks}</span>`;
    el.querySelector(".text").textContent = m.text;
    if (m.voice) {
      const box = document.createElement("div");
      box.className = "voice-msg";
      const play = document.createElement("button");
      play.type = "button";
      play.textContent = "▶ голос";
      play.addEventListener("click", () => new Audio(m.voice).play());
      box.appendChild(play);
      el.querySelector(".text").after(box);
    }
    if (m.image) {
      const img = document.createElement("img");
      img.src = m.image;
      img.alt = "фото";
      img.style.maxWidth = "220px";
      img.style.borderRadius = "10px";
      img.style.display = "block";
      img.style.margin = "6px 0";
      el.querySelector(".text").after(img);
    }
    if (m.video) {
      const v = document.createElement("video");
      v.src = m.video;
      v.controls = true;
      v.style.maxWidth = "240px";
      v.style.borderRadius = "10px";
      el.querySelector(".text").after(v);
    }
    if (m.audio && !m.voice) {
      const a = document.createElement("audio");
      a.src = m.audio;
      a.controls = true;
      el.querySelector(".text").after(a);
    }
    els.messages.appendChild(el);
  });
  els.messages.scrollTop = els.messages.scrollHeight;
}

function sendMessage(text) {
  const chat = state.chats.find((c) => c.id === state.activeId);
  if (!chat || !text.trim()) return;
  const msg = { id: Date.now(), from: "me", text: text.trim(), ts: Date.now() };
  chat.messages.push(msg);
  saveState();
  renderMessages(chat);
  renderList(els.search.value);
  maybeReply(chat, text.trim());
}

function maybeReply(chat, userText) {
  if (chat.id === "support") {
    setTimeout(() => botReply(chat, userText), 500 + Math.random() * 400);
    return;
  }
  const pool = REPLIES[chat.id];
  if (!pool) return;
  const delay = 700 + Math.random() * 1400;
  els.convStatus.textContent = "печатает...";
  els.convStatus.classList.add("online");
  setTimeout(() => {
    chat.messages.push({
      id: Date.now(),
      from: "them",
      author: chat.type === "group" ? "Максим" : undefined,
      text: pool[Math.floor(Math.random() * pool.length)],
      ts: Date.now()
    });
    if (state.activeId !== chat.id) chat.unread = (chat.unread || 0) + 1;
    saveState();
    if (state.activeId === chat.id) {
      els.convStatus.textContent = chat.online ? "в сети" : chat.status;
      renderMessages(chat);
    }
    renderList(els.search.value);
  }, delay);
}

function botReply(chat, text) {
  const t = text.toLowerCase();
  let answer = "Я демо-бот NexGram. Команды: помощь, тема, время, привет.";
  if (t.includes("помощь") || t.includes("help")) {
    answer = "Команды:\n• привет — поздороваться\n• время — текущее время\n• тема — переключить оформление\n• новый — создать чат";
  } else if (t.includes("привет") || t.includes("здравств")) {
    answer = "Привет! Это веб-мессенджер в духе Telegram. Сообщения остаются в вашем браузере.";
  } else if (t.includes("время")) {
    answer = "Сейчас " + new Date().toLocaleString("ru-RU");
  } else if (t.includes("тема")) {
    toggleTheme();
    answer = "Тема переключена.";
  }
  chat.messages.push({ id: Date.now(), from: "them", text: answer, ts: Date.now() });
  saveState();
  if (state.activeId === chat.id) renderMessages(chat);
  renderList(els.search.value);
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  saveState();
}

function openDrawer(open) {
  els.drawer.classList.toggle("hidden", !open);
  els.backdrop.classList.toggle("hidden", !open);
}

function newChat() {
  const name = prompt("Имя собеседника:");
  if (!name || !name.trim()) return;
  const id = "u-" + Date.now();
  state.chats.unshift({
    id,
    name: name.trim(),
    type: "private",
    status: "был(а) недавно",
    unread: 0,
    messages: [{ id: 1, from: "them", text: "Привет! Это новый чат.", ts: Date.now() }]
  });
  saveState();
  openChat(id);
}

function resetDemo() {
  if (!confirm("Сбросить все чаты к исходному демо?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

els.search.addEventListener("input", () => renderList(els.search.value));
els.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(els.input.value);
  els.input.value = "";
  els.input.style.height = "auto";
});
els.input.addEventListener("input", () => {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
});
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    els.composer.requestSubmit();
  }
});
els.menuBtn.addEventListener("click", () => openDrawer(true));
els.backdrop.addEventListener("click", () => openDrawer(false));
els.backBtn.addEventListener("click", () => {
  state.activeId = null;
  els.conv.classList.add("hidden");
  els.empty.classList.remove("hidden");
  els.app.classList.remove("chat-open");
  renderList(els.search.value);
  saveState();
});
els.attachBtn.addEventListener("click", () => {
  const pick = document.getElementById("filePick");
  if (pick) pick.click();
});

EMOJIS.forEach((e) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = e;
  b.addEventListener("click", () => {
    els.input.value += e;
    els.input.focus();
  });
  els.emojiPanel.appendChild(b);
});
els.emojiBtn.addEventListener("click", () => {
  emojiOpen = !emojiOpen;
  els.emojiPanel.classList.toggle("hidden", !emojiOpen);
});
document.addEventListener("click", (e) => {
  if (emojiOpen && !els.emojiPanel.contains(e.target) && e.target !== els.emojiBtn) {
    emojiOpen = false;
    els.emojiPanel.classList.add("hidden");
  }
});

document.getElementById("drawer").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  openDrawer(false);
  if (action === "routes") openRoutes();
  if (action === "rights" && window.radarRights) window.radarRights.show();
  if (action === "guest" && window.radarToGuest) window.radarToGuest();
  if (action === "work" && window.radarToWork) window.radarToWork();
  if (action === "saved") openChat("saved");
  if (action === "rooms") {
    var list = (window.RadarLive && RadarLive.loadRooms()) || [];
    if (!list.length) alert("Пока нет комнат, в которые вы входили.");
    else alert("Комнаты:\n" + list.map(function (r) { return r.room + (r.nick ? " · " + r.nick : ""); }).join("\n") + "\n\nОни же в списке слева. Нажмите, чтобы войти снова.");
  }
  if (action === "new") newChat();
  if (action === "theme") toggleTheme();
  if (action === "reset") resetDemo();
});

renderList();
if (state.activeId && state.chats.some((c) => c.id === state.activeId)) {
  openChat(state.activeId);
}

const live = { ws: null, roomId: null, nick: null, enabled: false };

function ensureLiveChat() {
  let chat = state.chats.find((c) => c.id === "live");
  if (!chat) {
    chat = {
      id: "live",
      name: "Защищённая комната",
      type: "group",
      color: "#2aabee",
      initials: "🔒",
      status: "E2E AES-256-GCM",
      unread: 0,
      messages: []
    };
    state.chats.unshift(chat);
  }
  return chat;
}

async function startLive(nick, roomId, pass) {
  await LiveCrypto.unlock(pass, roomId);
  live.nick = nick;
  live.roomId = roomId;
  live.enabled = true;
  const relay = (window.NEXGRAM_RELAY || "").replace(/\/$/, "");
  let wsUrl;
  if (relay) {
    wsUrl = relay.replace(/^http/, "ws") + (relay.includes("/ws") ? "" : "/ws");
  } else if (location.protocol === "http:" || location.protocol === "https:") {
    wsUrl = (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + "/ws";
  } else {
    alert("Укажите адрес реле NGP (в приложении: меню → сервер). Без него доступно только локальное демо.");
    return;
  }
  const ws = new WebSocket(wsUrl);
  live.ws = ws;
  const chat = ensureLiveChat();
  chat.name = "🔒 " + roomId;
  const commit = await NGP.commit(roomId, pass);
  const joined = new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      reject(new Error("relay timeout"));
    }, 6000);
    live._relayOk = function () { clearTimeout(t); resolve(); };
    live._relayFail = function (e) { clearTimeout(t); reject(e || new Error("relay")); };
    ws.onerror = () => live._relayFail(new Error("ws error"));
  });
  ws.onopen = () => ws.send(JSON.stringify(NGP.frame("HELLO", { client: "nexgram-web/0.3", features: ["aes-gcm", "history"] })));
  ws.onmessage = async (ev) => {
    const msg = NGP.parse(ev.data);
    if (!msg) return;
    if (msg.t === "ERROR") {
      if (typeof PTT !== "undefined") PTT.handle(msg);
      chat.status = "ошибка NGP: " + (msg.body && msg.body.code);
      if (state.activeId === "live") els.convStatus.textContent = chat.status;
      if (msg.body && msg.body.code === "BAD_COMMIT") alert("Неверный пароль комнаты (NGP BAD_COMMIT).");
      return;
    }
    if (msg.t === "WELCOME") {
      ws.send(JSON.stringify(NGP.frame("JOIN", { room: roomId, nick, commit })));
      return;
    }
    if (msg.t === "JOINED") {
      chat.status = "NGP/1 · " + (msg.body.peers || 1);
      if (window.RadarLive) {
        RadarLive.setOnline(msg.body.names || []);
        RadarLive.keep(true);
      }
      if (typeof live._relayOk === "function") {
        live._relayOk();
        live._relayOk = null;
        live._relayFail = null;
      }
      for (const h of msg.body.history || []) {
        const b = h.body || h;
        const text = await LiveCrypto.decrypt(b.iv, b.data);
        if (text) {
          chat.messages.push({
            id: h.ts || Date.now(),
            from: b.nick === live.nick ? "me" : "them",
            author: b.nick,
            text,
            ts: h.ts || Date.now()
          });
        }
      }
      saveState();
      openChat("live");
      return;
    }
    if (msg.t === "PEERS") {
      if (window.RadarLive) RadarLive.setOnline(msg.body.names || []);
      else {
        chat.status = "NGP/1 · " + msg.body.count;
        if (state.activeId === "live") els.convStatus.textContent = chat.status;
      }
      return;
    }
    if (typeof PTT !== "undefined") PTT.handle(msg);
    if (typeof RadarMedia !== "undefined" && RadarMedia.handle(msg)) return;
    if (msg.t === "CIPHER") {
      const b = msg.body || {};
      const text = await LiveCrypto.decrypt(b.iv, b.data);
      if (!text) return;
      if (b.nick === live.nick && Math.abs(msg.ts - Date.now()) < 2000) return;
      chat.messages.push({
        id: msg.ts,
        from: b.nick === live.nick ? "me" : "them",
        author: b.nick,
        text,
        ts: msg.ts
      });
      if (b.nick !== live.nick && window.RadarLive) RadarLive.notify(b.nick || "Радар", text.slice(0, 80));
      if (state.activeId !== "live") chat.unread = (chat.unread || 0) + 1;
      saveState();
      if (state.activeId === "live") renderMessages(chat);
      renderList(els.search.value);
    }
  };
  ws.onclose = () => {
    chat.status = "нет связи с реле";
    if (state.activeId === "live") els.convStatus.textContent = chat.status;
    if (typeof live._relayFail === "function") live._relayFail(new Error("closed"));
  };
  await joined;
}

const _sendMessage = sendMessage;
sendMessage = function (text) {
  if (live.enabled && state.activeId === "live" && live.ws && live.ws.readyState === 1) {
    const chat = ensureLiveChat();
    const trimmed = text.trim();
    if (!trimmed) return;
    LiveCrypto.encrypt(trimmed).then((packet) => {
      live.ws.send(JSON.stringify(NGP.frame("CIPHER", { room: live.roomId, nick: live.nick, ...packet })));
      chat.messages.push({ id: Date.now(), from: "me", text: trimmed, ts: Date.now() });
      saveState();
      renderMessages(chat);
      renderList(els.search.value);
    });
    return;
  }
  _sendMessage(text);
};

document.getElementById("gateJoin").addEventListener("click", async () => {
  const nick = document.getElementById("gateNick").value.trim() || "Гость";
  const room = document.getElementById("gateRoom").value.trim();
  const pass = document.getElementById("gatePass").value;
  if (!room || !pass) {
    alert("Нужны код комнаты и пароль.");
    return;
  }
  try {
    await startLive(nick, room, pass);
    document.getElementById("gate").classList.add("hidden");
  } catch (e) {
    alert("Не удалось включить шифрование в этом браузере.");
  }
});
document.getElementById("gateSkip").addEventListener("click", () => {
  document.getElementById("gate").classList.add("hidden");
});

document.getElementById("routesBack")?.addEventListener("click", () => {
  document.getElementById("routesPanel")?.classList.add("hidden");
});

