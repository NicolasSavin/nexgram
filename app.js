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
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.chats)) return s;
    }
  } catch {}
  return { chats: JSON.parse(JSON.stringify(DEFAULT_CHATS)), theme: "dark", activeId: null };
}
function saveState() {
  try {
    const slim = (state.chats || []).map((c) => ({
      ...c,
      messages: (c.messages || []).slice(-300).map((m) => {
        const copy = { ...m };
        if (copy.image && String(copy.image).indexOf("blob:") === 0) copy.image = undefined;
        if (copy.video && String(copy.video).indexOf("blob:") === 0) copy.video = undefined;
        return copy;
      })
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats: slim, theme: state.theme, activeId: state.activeId }));
  } catch (e) {}
}

function mergeDesk(fresh) {
  const old = {};
  (state.chats || []).forEach((c) => { old[c.id] = c; });
  (fresh || []).forEach((c) => {
    const prev = old[c.id];
    if (prev && prev.messages && prev.messages.length) c.messages = prev.messages;
    if (prev && prev.unread) c.unread = prev.unread;
    if (prev && prev.status && c.id === "room:smena") c.status = prev.status;
  });
  var work = false;
  try { work = localStorage.getItem("radar-role-v1") === "work"; } catch (e) {}
  var workers = (fresh || []).find(function (c) { return c.id === "room:smena"; });
  function absorb(id) {
    var src = old[id];
    if (!src || !workers || !src.messages) return;
    (src.messages || []).forEach(function (m) {
      if (!workers.messages.some(function (x) { return x.id === m.id && x.ts === m.ts; })) workers.messages.push(m);
    });
  }
  Object.keys(old).forEach((id) => {
    if (fresh.some((c) => c.id === id)) return;
    if (id === "live" || id === "hist:smena" || id === "smena" || (id === "room:smena" && workers)) {
      if (work) absorb(id);
      return;
    }
    if (work && (id === "live")) return;
    if (id.indexOf("room:") === 0 || id.indexOf("hist:") === 0 || id === "saved") fresh.push(old[id]);
  });
  state.chats = fresh;
  saveState();
  if (typeof renderList === "function") renderList();
}
window.mergeDesk = mergeDesk;

const state = loadState();
if (!state.chats) state.chats = JSON.parse(JSON.stringify(DEFAULT_CHATS));
if (!state.chats.some((c) => c.id === "routes")) {
  const routes = DEFAULT_CHATS.find((c) => c.id === "routes");
  if (routes) state.chats.unshift(JSON.parse(JSON.stringify(routes)));
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
  if (ptt) ptt.style.display = isLiveId(id) ? "" : "none";
  if (isLiveId(id) && typeof live !== "undefined" && !live._opening) {
    var same = live.inRoom && (!chat.room || live.roomId === chat.room);
    if (!same) {
      var saved = typeof loadGate === "function" ? loadGate() : null;
      var room = chat.room || (saved && saved.room) || "";
      var pass = (saved && saved.room === room && saved.pass) || "";
      if (room && pass && typeof startLive === "function") {
        live._opening = true;
        chat.status = "подключение к реле…";
        els.convStatus.textContent = chat.status;
        startLive(saved.nick || live.nick || "Гость", room, pass).finally(function () { live._opening = false; });
      } else {
        chat.status = "сначала войдите в комнату";
        els.convStatus.textContent = chat.status;
        var gate = document.getElementById("gate");
        if (gate) gate.classList.remove("hidden");
      }
    }
  }
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
    const place = (typeof live !== "undefined" && live.places && m.author && live.places[m.author]) || "";
    const who = (m.author || "") + (place && String(m.author).indexOf(place) < 0 ? " · " + place : "");
    const author = who && chat.type === "group" ? `<div style="color:#6ec9cb;font-weight:600;font-size:13px;margin-bottom:2px">${who}</div>` : "";
    el.innerHTML = `${author}<span class="text"></span><span class="meta">${fmtTime(m.ts)}${ticks}</span>`;
    el.querySelector(".text").textContent = m.text;
    if (m.voice) {
      const box = document.createElement("div");
      box.className = "voice-msg";
      const player = document.createElement("audio");
      player.controls = true;
      player.preload = "auto";
      player.src = m.voice;
      player.style.width = "220px";
      player.style.height = "36px";
      box.appendChild(player);
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
function pttKb(hide) {
  var w = document.querySelector(".ptt-wrap");
  if (w) w.style.display = hide ? "none" : (isLiveId(state.activeId) ? "" : "none");
}
els.input.addEventListener("focus", () => pttKb(true));
els.input.addEventListener("blur", () => setTimeout(() => pttKb(false), 200));
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

function radarSocket(wsUrl) {
  if (window.RadarNative && typeof RadarNative.wsOpen === "function") {
    const fake = {
      readyState: 0,
      send: function (s) { RadarNative.wsSend(String(s)); },
      close: function () { RadarNative.wsClose(); },
      _onopen: null,
      _onmessage: null,
      _onerror: null,
      _onclose: null
    };
    Object.defineProperty(fake, "onopen", {
      set: function (fn) { fake._onopen = fn; if (fake.readyState === 1 && fn) fn(); },
      get: function () { return fake._onopen; }
    });
    Object.defineProperty(fake, "onmessage", {
      set: function (fn) {
        fake._onmessage = fn;
        var q = fake._queue || [];
        fake._queue = [];
        q.forEach(function (data) { fn({ data: data }); });
      },
      get: function () { return fake._onmessage; }
    });
    Object.defineProperty(fake, "onerror", {
      set: function (fn) { fake._onerror = fn; },
      get: function () { return fake._onerror; }
    });
    Object.defineProperty(fake, "onclose", {
      set: function (fn) { fake._onclose = fn; },
      get: function () { return fake._onclose; }
    });
    window.__radarWsOnOpen = function () {
      fake.readyState = 1;
      if (fake._onopen) fake._onopen();
    };
    fake._queue = [];
    window.__radarWsOnMessage = function (data) {
      if (fake._onmessage) fake._onmessage({ data: data });
      else fake._queue.push(data);
    };
    window.__radarWsOnError = function (m) {
      if (fake._onerror) fake._onerror(new Error(m || "ws"));
    };
    window.__radarWsOnClose = function () {
      fake.readyState = 3;
      if (fake._onclose) fake._onclose();
    };
    RadarNative.wsOpen(String(wsUrl).replace(/^ws:/, "http:").replace(/^wss:/, "https:"));
    return fake;
  }
  return new WebSocket(wsUrl);
}

function radarHttp(method, url, body) {
  return new Promise(function (resolve, reject) {
    if (window.RadarNative && typeof RadarNative.httpReq === "function") {
      window.__radarHttpWait = window.__radarHttpWait || {};
      var id = "h" + Date.now() + Math.random().toString(16).slice(2);
      window.__radarHttpWait[id] = { resolve: resolve, reject: reject };
      window.__radarHttpCb = function (hid, text) {
        var w = window.__radarHttpWait && window.__radarHttpWait[hid];
        if (!w) return;
        delete window.__radarHttpWait[hid];
        if (String(text).indexOf("ERR:") === 0) w.reject(new Error(text.slice(4)));
        else w.resolve(text);
      };
      RadarNative.httpReq(id, method, url, body || "");
      return;
    }
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (method === "POST") opts.body = body || "{}";
    fetch(url, opts).then(function (r) { return r.text(); }).then(resolve).catch(reject);
  });
}

function httpSocket(base) {
  base = String(base || "http://186.246.3.44").replace(/\/$/, "").replace(/\/ws$/, "");
  var sid = "";
  var stopped = false;
  var busy = false;
  var q = [];
  var fake = {
    readyState: 0,
    send: function (s) { q.push(s); pump(); },
    close: function () { stopped = true; fake.readyState = 3; q.length = 0; },
    _onopen: null,
    _onmessage: null,
    _onerror: null,
    _onclose: null
  };
  Object.defineProperty(fake, "onopen", {
    set: function (fn) { fake._onopen = fn; if (fake.readyState === 1 && fn) fn(); },
    get: function () { return fake._onopen; }
  });
  Object.defineProperty(fake, "onmessage", {
    set: function (fn) {
      fake._onmessage = fn;
      var pending = fake._queue || [];
      fake._queue = [];
      pending.forEach(function (data) { fn({ data: data }); });
    },
    get: function () { return fake._onmessage; }
  });
  Object.defineProperty(fake, "onerror", {
    set: function (fn) { fake._onerror = fn; },
    get: function () { return fake._onerror; }
  });
  function emitOut(out) {
    (out || []).forEach(function (m) {
      var data = typeof m === "string" ? m : JSON.stringify(m);
      if (fake._onmessage) fake._onmessage({ data: data });
      else {
        fake._queue = fake._queue || [];
        fake._queue.push(data);
      }
    });
  }
  function pump() {
    if (stopped || busy || !q.length) return;
    busy = true;
    var s = q.shift();
    var frame;
    try { frame = JSON.parse(s); } catch (e) { frame = s; }
    radarHttp("POST", base + "/ngp", JSON.stringify({ sid: sid, frame: frame })).then(function (text) {
      var j = {};
      try { j = JSON.parse(text); } catch (e) {}
      if (j.sid) sid = j.sid;
      emitOut(j.out);
      busy = false;
      pump();
    }).catch(function (e) {
      busy = false;
      if (fake._onerror) fake._onerror(e);
    });
  }
  function poll() {
    if (stopped) return;
    if (!sid) {
      setTimeout(poll, 300);
      return;
    }
    radarHttp("GET", base + "/ngp?sid=" + encodeURIComponent(sid), "").then(function (text) {
      var j = {};
      try { j = JSON.parse(text); } catch (e) {}
      emitOut(j.out);
      if (!stopped) poll();
    }).catch(function () {
      if (!stopped) setTimeout(poll, 1200);
    });
  }
  setTimeout(function () {
    fake.readyState = 1;
    if (fake._onopen) fake._onopen();
    poll();
  }, 0);
  return fake;
}

const live = { ws: null, roomId: null, nick: null, enabled: false };

function isLiveId(id) {
  return id === "live" || String(id || "").indexOf("room:") === 0;
}

function ensureLiveChat(roomId) {
  roomId = roomId || (typeof live !== "undefined" && live.roomId) || "";
  const id = roomId ? ("room:" + roomId) : "live";
  let chat = state.chats.find((c) => c.id === id) || state.chats.find((c) => c.id === "live" && (!roomId || c.room === roomId));
  if (!chat) {
    chat = {
      id: id,
      name: roomId === "smena" ? "Чат работников" : (roomId ? roomId : "Чат"),
      type: "group",
      color: "#2aabee",
      initials: roomId === "smena" ? "ЧР" : "Ч",
      status: "комната",
      unread: 0,
      room: roomId || "",
      messages: []
    };
    state.chats.unshift(chat);
  }
  chat.room = roomId || chat.room || "";
  return chat;
}

async function detectPlace() {
  let cached = "";
  try { cached = localStorage.getItem("radar-place") || ""; } catch (e) {}
  if (cached && live.joinBody) live.joinBody.place = cached;
  const pos = await new Promise(function (resolve) {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, function () { resolve(null); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
  if (!pos) return cached;
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  let place = "";
  try {
    const r = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=ru");
    const j = await r.json();
    const city = j.city || j.locality || j.principalSubdivision || "";
    const country = j.countryName || "";
    place = [city, country].filter(Boolean).join(", ").slice(0, 48);
  } catch (e) {}
  if (!place) return cached;
  try { localStorage.setItem("radar-place", place); } catch (e) {}
  if (live.joinBody) live.joinBody.place = place;
  live.place = place;
  if (live.ws && live.ws.readyState === 1 && live.inRoom) {
    live.ws.send(JSON.stringify(NGP.frame("PLACE", { place: place })));
  }
  return place;
}

async function startLive(nick, roomId, pass) {
  if (roomId === "smena") pass = "ntc-smena";
  await LiveCrypto.unlock(pass, roomId);
  live.nick = nick;
  live.roomId = roomId;
  live.enabled = true;
  live.inRoom = false;
  const chat = ensureLiveChat(roomId);
  chat.name = (roomId === "smena") ? "Чат работников" : roomId;
  chat.status = "подключение к реле…";
  if (els.convStatus) els.convStatus.textContent = chat.status;
  if (typeof renderList === "function") renderList();
  const commit = await NGP.commit(roomId, pass);
  live.joinBody = { room: roomId, nick: nick, commit: commit, place: live.place || "" };
  live.pass = pass;
  detectPlace();
  const here = (location.protocol === "http:" || location.protocol === "https:")
    ? ((location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host)
    : "";
  const relay = (window.NEXGRAM_RELAY || "").replace(/\/$/, "");
  let wsUrl;
  const nativeOnly = location.hostname === "appassets.androidplatform.net";
  if (here && !nativeOnly) {
    wsUrl = here + "/ws";
  } else if (window.RadarNative && RadarNative.wsOpen) {
    const base = relay || "https://karavanmessage.ru";
    wsUrl = base.replace(/^http/, "ws") + (base.indexOf("/ws") >= 0 ? "" : "/ws");
  } else if (relay) {
    wsUrl = relay.replace(/^http/, "ws") + (relay.includes("/ws") ? "" : "/ws");
  } else {
    throw new Error("Нет адреса реле");
  }
  const httpBase = (relay || "https://karavanmessage.ru").replace(/^ws/i, "http").replace(/\/ws\/?$/, "");
  let ws;
  const nativeWs = window.RadarNative && typeof RadarNative.wsOpen === "function";
  async function openHttp() {
    chat.status = "канал HTTPS…";
    if (typeof renderList === "function") renderList();
    ws = httpSocket(httpBase);
    await new Promise(function (resolve, reject) {
      const t = setTimeout(function () { reject(new Error("http timeout")); }, 8000);
      ws.onopen = function () { clearTimeout(t); resolve(); };
    });
  }
  if (nativeWs) {
    try {
      ws = radarSocket(wsUrl);
      await new Promise(function (resolve, reject) {
        const t = setTimeout(function () {
          try { ws.close(); } catch (e) {}
          reject(new Error("ws timeout"));
        }, 6000);
        ws.onopen = function () { clearTimeout(t); resolve(); };
        ws.onerror = function () { clearTimeout(t); reject(new Error("ws error")); };
      });
    } catch (e) {
      await openHttp();
    }
  } else if (window.RadarNative && typeof RadarNative.httpReq === "function") {
    await openHttp();
  } else {
    try {
      ws = radarSocket(wsUrl);
      await new Promise(function (resolve, reject) {
        const t = setTimeout(function () {
          try { ws.close(); } catch (e) {}
          reject(new Error("ws timeout"));
        }, 6000);
        ws.onopen = function () { clearTimeout(t); resolve(); };
        ws.onerror = function () { clearTimeout(t); reject(new Error("ws error")); };
      });
    } catch (e) {
      await openHttp();
    }
  }
  live.ws = ws;
  const joined = new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      reject(new Error("Сервер не ответил. Проверьте сеть."));
    }, 20000);
    live._relayOk = function () { clearTimeout(t); resolve(); };
    live._relayFail = function (e) { clearTimeout(t); reject(e || new Error("relay")); };
    ws.onerror = function () {
      if (typeof live._relayFail === "function") live._relayFail(new Error("ws error"));
    };
  });
  ws.onmessage = async (ev) => {
    const msg = NGP.parse(ev.data);
    if (!msg) return;
    if (msg.t === "ERROR") {
      if (typeof PTT !== "undefined") PTT.handle(msg);
      if (msg.body && msg.body.code === "PTT_BUSY") return;
      chat.status = "ошибка NGP: " + (msg.body && msg.body.code);
      if (isLiveId(state.activeId)) els.convStatus.textContent = chat.status;
      if (msg.body && msg.body.code === "BAD_COMMIT") {
        const err = new Error("Неверный пароль этой комнаты. Возьмите другой код, например radar.");
        if (typeof live._relayFail === "function") live._relayFail(err);
        else alert(err.message);
      }
      if (msg.body && msg.body.code === "NOT_IN_ROOM" && live.joinBody && !live._rejoining) {
        live._rejoining = true;
        chat.status = "повторный вход…";
        if (isLiveId(state.activeId)) els.convStatus.textContent = chat.status;
        ws.send(JSON.stringify(NGP.frame("JOIN", live.joinBody)));
        setTimeout(function () { live._rejoining = false; }, 4000);
      }
      return;
    }
    if (msg.t === "WELCOME") {
      ws.send(JSON.stringify(NGP.frame("JOIN", live.joinBody || { room: roomId, nick, commit })));
      return;
    }
    if (msg.t === "JOINED") {
      live.inRoom = true;
      live._rejoining = false;
      chat.status = "NGP/1 · " + (msg.body.peers || 1);
      if (window.RadarLive) {
        RadarLive.setOnline(msg.body.names || [], msg.body.where || []);
        RadarLive.keep(true);
      }
      if (typeof live._relayOk === "function") {
        live._relayOk();
        live._relayOk = null;
        live._relayFail = null;
      }
      const seen = new Set((chat.messages || []).map((m) => String(m.ts) + ":" + (m.author || "")));
      for (const h of msg.body.history || []) {
        const b = h.body || h;
        const text = await LiveCrypto.decrypt(b.iv, b.data);
        if (!text) continue;
        const key = String(h.ts || "") + ":" + (b.nick || "");
        if (seen.has(key)) continue;
        seen.add(key);
        chat.messages.push({
          id: h.ts || Date.now(),
          from: b.nick === live.nick ? "me" : "them",
          author: b.nick,
          text,
          ts: h.ts || Date.now()
        });
      }
      saveState();
      openChat(chat.id);
      return;
    }
    if (msg.t === "PEERS") {
      if (window.RadarLive) RadarLive.setOnline(msg.body.names || [], msg.body.where || []);
      else {
        chat.status = "NGP/1 · " + msg.body.count;
        if (isLiveId(state.activeId)) els.convStatus.textContent = chat.status;
      }
      return;
    }
    if (msg.t === "CLEAR_MINE") {
      const nick = msg.body && msg.body.nick;
      if (nick) {
        chat.messages = (chat.messages || []).filter(function (m) {
          if (m.author && m.author === nick) return false;
          if (nick === live.nick && m.from === "me") return false;
          return true;
        });
        saveState();
        if (isLiveId(state.activeId)) renderMessages(chat);
        renderList(els.search.value);
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
      if (!isLiveId(state.activeId)) chat.unread = (chat.unread || 0) + 1;
      saveState();
      if (isLiveId(state.activeId)) renderMessages(chat);
      renderList(els.search.value);
    }
  };
  ws.onclose = function () {
    if (live.ws && live.ws !== ws) return;
    chat.status = "нет связи с реле";
    if (isLiveId(state.activeId) && els.convStatus) els.convStatus.textContent = chat.status;
    if (typeof live._relayFail === "function") live._relayFail(new Error("closed"));
    live.inRoom = false;
    if (live.pass && live.roomId && !live._reconnecting) {
      live._reconnecting = true;
      setTimeout(function () {
        live._reconnecting = false;
        if (!live.inRoom && live.pass) {
          startLive(live.nick, live.roomId, live.pass).catch(function () {});
        }
      }, 2000);
    }
  };
  ws.send(JSON.stringify(NGP.frame("HELLO", { client: "nexgram-web/0.3", features: ["aes-gcm", "history"] })));
  await joined;
}

const _sendMessage = sendMessage;
sendMessage = function (text) {
  if (live.enabled && isLiveId(state.activeId) && live.ws && live.ws.readyState === 1) {
    const chat = ensureLiveChat(live.roomId);
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!live.inRoom && live.joinBody) {
      live.ws.send(JSON.stringify(NGP.frame("JOIN", live.joinBody)));
      chat.status = "вход в эфир…";
      if (els.convStatus) els.convStatus.textContent = chat.status;
      setTimeout(function () {
        if (live.inRoom) sendMessage(trimmed);
      }, 800);
      return;
    }
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
    if (typeof openChat === "function" && typeof ensureLiveChat === "function") openChat(ensureLiveChat(room).id);
  } catch (e) {
    const m = (e && e.message) ? e.message : String(e);
    alert("Нет связи с реле или ошибка входа.\n" + m);
  }
});
document.getElementById("gateSkip").addEventListener("click", () => {
  document.getElementById("gate").classList.add("hidden");
});

document.getElementById("clearMine")?.addEventListener("click", () => {
  const chat = state.chats.find((c) => c.id === state.activeId);
  if (!chat) return;
  if (!confirm("Удалить все ваши сообщения в этом чате?")) return;
  const nick = live && live.nick;
  chat.messages = (chat.messages || []).filter(function (m) {
    if (m.from === "me") return false;
    if (nick && m.author === nick) return false;
    return true;
  });
  saveState();
  renderMessages(chat);
  renderList(els.search.value);
  if (live && live.enabled && live.ws && live.ws.readyState === 1 && live.inRoom) {
    live.ws.send(JSON.stringify(NGP.frame("CLEAR_MINE", { room: live.roomId, nick: nick })));
  }
});

document.getElementById("routesBack")?.addEventListener("click", () => {
  document.getElementById("routesPanel")?.classList.add("hidden");
});

