(function () {
  function isWork() {
    try { return localStorage.getItem("radar-role-v1") === "work"; } catch (e) { return false; }
  }
  function desk() {
    if (isWork()) {
      return [
        { id: "routes", name: "Маршруты", type: "channel", color: "#c8943c", initials: "М", status: "поезд · автобус", unread: 0, messages: [{ id: 1, from: "them", text: "Нажмите — маршрут НТЦ Охрана (Туту, Busfor).", ts: Date.now() }] },
        { id: "live", name: "Эфир смены", type: "group", color: "#2aabee", initials: "Э", status: "рация и чат", unread: 0, messages: [{ id: 1, from: "them", text: "Общий эфир. Второй сотрудник — тот же код и пароль.", ts: Date.now() }] },
        { id: "helper", name: "Помощник смены", type: "bot", color: "#7bc862", initials: "ИИ", status: "по рейсу", unread: 0, messages: [{ id: 1, from: "them", text: "Спросите: маршрут, рация, объект, гостиница, код.", ts: Date.now() }] },
        { id: "object", name: "На объекте", type: "group", color: "#faa774", initials: "ОБ", status: "кто на месте", unread: 0, messages: [{ id: 1, from: "them", text: "Напишите «я на объекте» или «уехал».", ts: Date.now() }] },
        { id: "hotel", name: "Гостиница", type: "group", color: "#a695e7", initials: "ГС", status: "кто в гостинице", unread: 0, messages: [{ id: 1, from: "them", text: "Напишите «я в гостинице» или «выехал».", ts: Date.now() }] }
      ];
    }
    return [
      { id: "live", name: "Чат", type: "group", color: "#2aabee", initials: "Ч", status: "комната", unread: 0, messages: [] },
      { id: "saved", name: "Избранное", type: "saved", color: "#6b8afd", initials: "★", status: "", unread: 0, messages: [] }
    ];
  }
  try { /* keep history */ } catch (e) {}
  function applyDesk() {
    if (typeof mergeDesk === "function") return;
    if (typeof state === "undefined" || !Array.isArray(state.chats)) return;
    state.chats = desk();
    if (typeof saveState === "function") saveState();
    if (typeof renderList === "function") renderList();
  }
  if (typeof mergeDesk !== "function") applyDesk();

  function helperAnswer(t) {
    t = String(t || "").toLowerCase();
    if (t.indexOf("маршрут") >= 0 || t.indexOf("поезд") >= 0 || t.indexOf("автобус") >= 0)
      return "Маршруты — верхний пункт списка. Там Туту и Busfor.";
    if (t.indexOf("рац") >= 0 || t.indexOf("ptt") >= 0 || t.indexOf("эфир") >= 0)
      return "Эфир смены: откройте чат, зажмите рацию. Второй — тот же код и пароль.";
    if (t.indexOf("объект") >= 0)
      return "Чат «На объекте»: напишите статус. Общий эфир — отдельный чат.";
    if (t.indexOf("гостин") >= 0 || t.indexOf("отел") >= 0)
      return "Чат «Гостиница»: отметьтесь «я в гостинице».";
    if (t.indexOf("парол") >= 0 || t.indexOf("код") >= 0 || t.indexOf("smena") >= 0)
      return "Код комнаты smena, пароль один на всех. Быстрый вход сохраняет его.";
    if (t.indexOf("помощ") >= 0)
      return "Спросите: маршрут, рация, объект, гостиница, код.";
    return "Я помощник смены. Спросите про маршрут, рацию, объект или гостиницу.";
  }

  if (typeof maybeReply === "function") {
    var prevMaybe = maybeReply;
    maybeReply = function (chat, userText) {
      if (chat && chat.id === "helper") {
        setTimeout(function () {
          chat.messages.push({ id: Date.now(), from: "them", text: helperAnswer(userText), ts: Date.now() });
          if (typeof saveState === "function") saveState();
          if (state.activeId === "helper" && typeof renderMessages === "function") renderMessages(chat);
          if (typeof renderList === "function") renderList(els.search.value);
        }, 350);
        return;
      }
      prevMaybe(chat, userText);
    };
  }

  if (typeof startLive === "function") {
    var origStart = startLive;
    startLive = async function (nick, roomId, pass) {
      var relays = [];
      if (location.hostname && location.hostname !== "appassets.androidplatform.net") {
        relays.push(location.protocol + "//" + location.host);
      }
      relays.push("http://186.246.3.44");
      if (window.NEXGRAM_RELAY) relays.push(window.NEXGRAM_RELAY.replace(/\/$/, ""));
      relays.push("https://karavanmessage.ru");
      var lastErr = null;
      for (var i = 0; i < relays.length; i++) {
        window.NEXGRAM_RELAY = relays[i];
        try {
          await origStart(nick, roomId, pass);
          return;
        } catch (e) {
          lastErr = e;
          var m = String((e && e.message) || e);
          if (m.indexOf("парол") >= 0 || m.indexOf("BAD_COMMIT") >= 0) break;
        }
      }
      if (typeof ensureLiveChat === "function") {
        var c = ensureLiveChat();
        c.status = "нет сети";
        if (typeof renderList === "function") renderList();
      }
      if (lastErr) throw lastErr;
    };
  }

  window.newChat = function () {
    var g = document.getElementById("gate");
    if (g) g.classList.remove("hidden");
  };
})();
