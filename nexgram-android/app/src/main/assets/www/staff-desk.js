(function () {
  var SITE = "https://nicolassavin.github.io/multimodal-routes/";
  var STAFF_ROOM = "smena";
  var STAFF_NGP = "ntc-smena";
  var PAGES = {
    routes: { url: SITE, name: "Маршруты", color: "#c8943c", initials: "М" },
    hotels: { url: SITE + "hotels.html", name: "Гостиницы", color: "#d4b483", initials: "ГС" },
    where: { url: SITE + "where.html", name: "Кто где", color: "#faa774", initials: "КГ" },
    teamchat: { url: SITE + "team.html", name: "Чат работников", color: "#2aabee", initials: "ЧР" },
    radio: { url: SITE + "radio.html", name: "Рация сайта", color: "#ee7aae", initials: "РЦ" },
    naryad: { url: SITE + "naryad.html", name: "Наряд", color: "#a695e7", initials: "НР" },
    helper: { url: SITE + "chat.html", name: "Помощник смены", color: "#7bc862", initials: "ИИ" }
  };

  function role() {
    try { return localStorage.getItem("radar-role-v1") || ""; } catch (e) { return ""; }
  }
  function isWork() { return role() === "work"; }

  function workChats() {
    var list = [];
    Object.keys(PAGES).forEach(function (id) {
      var p = PAGES[id];
      list.push({
        id: id, name: p.name, type: "channel", color: p.color, initials: p.initials,
        status: "с сайта", unread: 0,
        messages: [{ id: 1, from: "them", text: "Откроется страница «" + p.name + "».", ts: Date.now() }]
      });
    });
    list.push({
      id: "live", name: "Эфир смены", type: "group", color: "#2aabee", initials: "Э",
      status: "закрытый эфир", unread: 0,
      messages: [{ id: 1, from: "them", text: "Общий эфир Радара. Подпись — ваша фамилия с сайта.", ts: Date.now() }]
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
    state.chats = isWork() ? workChats() : guestChats();
    if (typeof saveState === "function") saveState();
    if (typeof renderList === "function") renderList();
  }

  function openPage(id) {
    var p = PAGES[id];
    if (!p) return;
    var panel = document.getElementById("routesPanel");
    var frame = document.getElementById("routesFrame");
    var title = document.querySelector(".routes-title");
    if (!panel || !frame) return;
    if (title) title.textContent = p.name;
    frame.src = p.url;
    panel.classList.remove("hidden");
  }

  if (typeof openChat === "function") {
    var prevOpen = openChat;
    openChat = function (id) {
      if (PAGES[id]) { openPage(id); return; }
      prevOpen(id);
    };
  }

  function setWorkForm(on) {
    var nick = document.getElementById("gateNick");
    var room = document.getElementById("gateRoom");
    var pass = document.getElementById("gatePass");
    var title = document.querySelector("#gate h2");
    var nickLab = nick && nick.previousElementSibling;
    var roomLab = room && room.previousElementSibling;
    var passLab = pass && pass.previousElementSibling;
    var sel = document.getElementById("gateFio");
    if (on) {
      if (title) title.textContent = "Служебный вход";
      if (nickLab) nickLab.textContent = "Сотрудник";
      if (room) { room.value = STAFF_ROOM; room.style.display = "none"; }
      if (roomLab) roomLab.style.display = "none";
      if (passLab) passLab.textContent = "Пароль как на сайте";
      if (nick) nick.style.display = "none";
      if (sel) sel.style.display = "block";
    } else {
      if (title) title.textContent = "Комната";
      if (nickLab) nickLab.textContent = "Имя";
      if (room) room.style.display = "";
      if (roomLab) roomLab.style.display = "";
      if (passLab) passLab.textContent = "Пароль";
      if (nick) nick.style.display = "";
      if (sel) sel.style.display = "none";
    }
  }

  function fillFio(users) {
    var sel = document.getElementById("gateFio");
    if (!sel) return;
    sel.innerHTML = '<option value="">— фамилия —</option>';
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
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SITE + "users.js";
      s.onload = function () {
        fillFio(window.HOTEL_USERS || []);
        resolve(window.HOTEL_USERS || []);
      };
      s.onerror = function () { reject(new Error("staff list")); };
      document.head.appendChild(s);
    });
  }

  function norm(s) { return String(s || "").trim().toLowerCase().replace(/ё/g, "е"); }

  var joinBtn = document.getElementById("gateJoin");
  if (joinBtn) {
    joinBtn.addEventListener("click", function (ev) {
      if (!isWork()) return;
      ev.stopImmediatePropagation();
      var users = window.HOTEL_USERS || [];
      var sel = document.getElementById("gateFio");
      var login = sel ? sel.value : "";
      var pass = (document.getElementById("gatePass").value || "").trim();
      var u = users.find(function (x) { return norm(x.login) === norm(login) && String(x.pass) === pass; });
      if (!u) {
        alert("Нет в списке сотрудников или неверный пароль сайта.");
        return;
      }
      try {
        localStorage.setItem("mm_user", JSON.stringify({ login: u.login, admin: !!u.admin, name: u.name || u.login }));
      } catch (e) {}
      var nick = u.name || u.login;
      document.getElementById("gateNick").value = nick;
      document.getElementById("gateRoom").value = STAFF_ROOM;
      if (typeof startLive === "function") {
        startLive(nick, STAFF_ROOM, STAFF_NGP).catch(function () {
          alert("Эфир пока без сети. Страницы смены откроются.");
        });
      }
      document.getElementById("gate").classList.add("hidden");
    }, true);
  }

  var wbtn = document.getElementById("roleWork");
  if (wbtn) {
    wbtn.addEventListener("click", function () {
      setWorkForm(true);
      loadUsers().catch(function () {
        alert("Не удалось загрузить список с сайта. Проверьте интернет.");
      });
      applyDesk();
    });
  }
  var gbtn = document.getElementById("roleGuest");
  if (gbtn) {
    gbtn.addEventListener("click", function () {
      setWorkForm(false);
      applyDesk();
    });
  }

  try { localStorage.removeItem("nexgram-v1"); } catch (e) {}
  applyDesk();
  if (isWork()) {
    setWorkForm(true);
    loadUsers().catch(function () {});
  }

  window.newChat = function () {
    var g = document.getElementById("gate");
    if (g) g.classList.remove("hidden");
  };
})();
