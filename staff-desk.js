(function () {
  var SITE = "https://nicolassavin.github.io/multimodal-routes/";
  var STAFF_ROOM = "smena";
  var STAFF_NGP = "ntc-smena";
  var STAFF_PIN = "охрана";
  var staffOk = false;
  var PAGES = {
    routes: { url: SITE, name: "Маршруты", color: "#c8943c", initials: "М" },
    hotels: { url: SITE + "hotels.html", name: "Гостиницы", color: "#d4b483", initials: "ГС" },
    where: { url: SITE + "where.html", name: "Кто где", color: "#faa774", initials: "КГ" },
    naryad: { url: "naryad.html", name: "Наряд", color: "#a695e7", initials: "НР" },
    helper: { url: SITE + "chat.html", name: "Помощник смены", color: "#7bc862", initials: "ИИ" }
  };

  function role() {
    try { return localStorage.getItem("radar-role-v1") || ""; } catch (e) { return ""; }
  }
  function isWork() { return role() === "work"; }
  function mmUser() {
    try { return JSON.parse(localStorage.getItem("mm_user") || "null"); } catch (e) { return null; }
  }
  function staffIn() { return isWork() && !!mmUser(); }

  function workChats() {
    var list = [];
    list.push({
      id: "room:smena", name: "Чат работников", type: "group", color: "#2aabee", initials: "ЧР",
      status: "чат и рация", unread: 0, room: "smena",
      messages: [{ id: 1, from: "them", text: "Общий чат смены: текст, фото и рация (PTT внизу). Посторонние сюда не входят.", ts: Date.now() }]
    });
    Object.keys(PAGES).forEach(function (id) {
      var p = PAGES[id];
      list.push({
        id: id, name: p.name, type: "channel", color: p.color, initials: p.initials,
        status: "с сайта", unread: 0,
        messages: [{ id: 1, from: "them", text: "Откроется страница «" + p.name + "».", ts: Date.now() }]
      });
    });
    list.push({
      id: "guide", name: "Инструкция", type: "channel", color: "#6ec9cb", initials: "?",
      status: "памятка", unread: 0,
      messages: [{ id: 1, from: "them", text: "РАДАР — памятка\n\n1. Служебный вход (не «Я пользователь»).\n2. Код смены: охрана — посторонним не говорить.\n3. Фамилия из списка, пароль как на сайте (дата рождения, 8 цифр).\n4. Маршруты, гостиницы, кто где, наряд, помощник — страницы с сайта.\n5. Чат работников — единственный эфир: пишите, шлите фото, внизу PTT.\n6. Скрепка — фото/видео. Видят только своя смена.\n7. Посторонним только «Я пользователь».", ts: Date.now() }]
    });
    return list;
  }

  function guestChats() {
    return [
      { id: "live", name: "Чат", type: "group", color: "#2aabee", initials: "Ч", status: "комната", unread: 0, messages: [] },
      { id: "saved", name: "Избранное", type: "saved", color: "#6b8afd", initials: "★", status: "", unread: 0, messages: [] }
    ];
  }

  function applyDesk() {
    if (typeof state === "undefined") return;
    var next = staffIn() ? workChats() : guestChats();
    if (typeof mergeDesk === "function") mergeDesk(next);
    else {
      state.chats = next;
      if (typeof saveState === "function") saveState();
      if (typeof renderList === "function") renderList();
    }
  }

  function openPage(id) {
    if (!staffIn()) return;
    var p = PAGES[id];
    if (!p) return;
    var panel = document.getElementById("routesPanel");
    var frame = document.getElementById("routesFrame");
    var title = document.querySelector(".routes-title");
    if (!panel || !frame) return;
    if (title) title.textContent = p.name;
    var u = mmUser();
    var url = p.url;
    if (u && u.login) {
      url += "#mm=" + encodeURIComponent(JSON.stringify({ login: u.login, name: u.name || u.login, admin: !!u.admin }));
    }
    frame.setAttribute("allow", "microphone; camera");
    frame.src = url;
    panel.classList.remove("hidden");
  }

  if (typeof openChat === "function") {
    var prevOpen = openChat;
    openChat = function (id) {
      if (id === "radio" || id === "room:smena" || id === "teamchat") {
        prevOpen("room:smena");
        return;
      }
      if (PAGES[id]) { openPage(id); return; }
      prevOpen(id);
    };
  }

  function vis(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
    var lab = el.previousElementSibling;
    if (lab && lab.tagName === "LABEL") lab.style.display = on ? "" : "none";
  }

  function setWorkForm(on) {
    var nick = document.getElementById("gateNick");
    var room = document.getElementById("gateRoom");
    var pass = document.getElementById("gatePass");
    var pin = document.getElementById("gatePin");
    var sel = document.getElementById("gateFio");
    var title = document.querySelector("#gate h2");
    var join = document.getElementById("gateJoin");
    if (on) {
      if (title) title.textContent = "Служебный вход";
      vis(nick, false);
      vis(sel, false);
      vis(room, false);
      vis(pass, false);
      vis(pin, true);
      if (join) join.textContent = "Далее";
      staffOk = false;
      if (sel) sel.innerHTML = "";
    } else {
      if (title) title.textContent = "Гражданский чат";
      vis(nick, true);
      vis(sel, false);
      vis(room, true);
      vis(pass, true);
      vis(pin, false);
      var passLab = pass && pass.previousElementSibling;
      if (passLab) passLab.textContent = "Пароль комнаты (свой, не с сайта)";
      var roomLab = room && room.previousElementSibling;
      if (roomLab) roomLab.textContent = "Код комнаты";
      if (join) join.textContent = "Войти";
      staffOk = false;
    }
  }

  function showFioStep() {
    vis(document.getElementById("gatePin"), false);
    vis(document.getElementById("gateNick"), false);
    vis(document.getElementById("gateRoom"), false);
    vis(document.getElementById("gateFio"), true);
    vis(document.getElementById("gatePass"), true);
    var passLab = document.getElementById("gatePass") && document.getElementById("gatePass").previousElementSibling;
    if (passLab) passLab.textContent = "Пароль как на сайте";
    var join = document.getElementById("gateJoin");
    if (join) join.textContent = "Войти";
  }

  function fillFio(users) {
    var sel = document.getElementById("gateFio");
    if (!sel) return;
    sel.innerHTML = '<option value="">— сотрудник —</option>';
    users.slice().sort(function (a, b) {
      return String(a.name || a.login).localeCompare(String(b.name || b.login), "ru");
    }).forEach(function (u) {
      var o = document.createElement("option");
      o.value = u.login;
      o.textContent = u.name || u.login;
      sel.appendChild(o);
    });
  }

  function loadUsers() {
    if (window.HOTEL_USERS && window.HOTEL_USERS.length) {
      fillFio(window.HOTEL_USERS);
      return Promise.resolve(window.HOTEL_USERS);
    }
    var urls = [
      "users.js",
      "http://186.246.3.44/users.js",
      "https://cdn.jsdelivr.net/gh/NicolasSavin/multimodal-routes@main/users.js",
      SITE + "users.js"
    ];
    return new Promise(function (resolve, reject) {
      var i = 0;
      function next() {
        if (i >= urls.length) {
          reject(new Error("staff list"));
          return;
        }
        var s = document.createElement("script");
        s.src = urls[i++];
        s.onload = function () {
          if (window.HOTEL_USERS && window.HOTEL_USERS.length) {
            fillFio(window.HOTEL_USERS);
            resolve(window.HOTEL_USERS);
          } else next();
        };
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    });
  }

  function norm(s) { return String(s || "").trim().toLowerCase().replace(/ё/g, "е"); }

  var joinBtn = document.getElementById("gateJoin");
  if (joinBtn) {
    joinBtn.addEventListener("click", function (ev) {
      if (!isWork()) return;
      ev.stopImmediatePropagation();
      if (!staffOk) {
        var pin = (document.getElementById("gatePin").value || "").trim().toLowerCase().replace(/ё/g, "е");
        if (pin !== STAFF_PIN) {
          alert("Неверный код смены.");
          return;
        }
        staffOk = true;
        loadUsers().then(showFioStep).catch(function () {
          staffOk = false;
          alert("Не удалось открыть список. Нужен интернет.");
        });
        return;
      }
      var users = window.HOTEL_USERS || [];
      var sel = document.getElementById("gateFio");
      var login = sel ? sel.value : "";
      var pass = (document.getElementById("gatePass").value || "").trim();
      var u = users.find(function (x) { return norm(x.login) === norm(login) && String(x.pass) === pass; });
      if (!u) {
        alert("Неверная фамилия или пароль сайта.");
        return;
      }
      try {
        localStorage.setItem("mm_user", JSON.stringify({ login: u.login, admin: !!u.admin, name: u.name || u.login }));
        localStorage.setItem("radar-role-v1", "work");
      } catch (e) {}
      var nick = u.name || u.login;
      document.getElementById("gateNick").value = nick;
      document.getElementById("gateRoom").value = STAFF_ROOM;
      applyDesk();
      if (typeof startLive === "function") {
        startLive(nick, STAFF_ROOM, STAFF_NGP).then(function () {
          if (typeof openChat === "function") openChat(typeof ensureLiveChat === "function" ? ensureLiveChat(STAFF_ROOM).id : "live");
        }).catch(function (e) {
          alert("Эфир без реле: " + ((e && e.message) || e));
        });
      }
      document.getElementById("gate").classList.add("hidden");
    }, true);
  }

  var wbtn = document.getElementById("roleWork");
  if (wbtn) {
    wbtn.addEventListener("click", function () {
      setWorkForm(true);
    });
  }
  var gbtn = document.getElementById("roleGuest");
  if (gbtn) {
    gbtn.addEventListener("click", function () {
      try { localStorage.setItem("radar-role-v1", "guest"); } catch (e) {}
      setWorkForm(false);
      applyDesk();
    });
  }
  var skip = document.getElementById("gateSkip");
  if (skip) {
    skip.addEventListener("click", function () {
      if (!isWork() || staffIn()) return;
      try { localStorage.setItem("radar-role-v1", "guest"); } catch (e) {}
      staffOk = false;
      applyDesk();
    });
  }

  try { /* keep chat history */ } catch (e) {}
  applyDesk();
  if (isWork() && !staffIn()) setWorkForm(true);

  window.newChat = function () {
    var g = document.getElementById("gate");
    if (g) g.classList.remove("hidden");
  };

  window.radarToGuest = function () {
    try {
      localStorage.setItem("radar-role-v1", "guest");
      localStorage.removeItem("mm_user");
    } catch (e) {}
    if (typeof live !== "undefined") {
      live.enabled = false;
      try { if (live.ws) live.ws.close(); } catch (e) {}
    }
    setWorkForm(false);
    applyDesk();
    var rg = document.getElementById("roleGate");
    var g = document.getElementById("gate");
    if (rg) rg.classList.add("hidden");
    if (g) g.classList.remove("hidden");
    var t = document.querySelector("#gate h2");
    if (t) t.textContent = "Гражданский чат";
  };

  window.radarToWork = function () {
    try { localStorage.setItem("radar-role-v1", "work"); } catch (e) {}
    setWorkForm(true);
    var rg = document.getElementById("roleGate");
    var g = document.getElementById("gate");
    if (rg) rg.classList.add("hidden");
    if (g) g.classList.remove("hidden");
  };
})();
