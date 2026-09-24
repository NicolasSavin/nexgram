(function () {
  var ROOMS_KEY = "radar-rooms-v1";

  function loadRooms() {
    try { return JSON.parse(localStorage.getItem(ROOMS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveRooms(list) {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(list.slice(0, 24)));
  }
  function rememberRoom(nick, room, pass) {
    if (!room) return;
    var list = loadRooms().filter(function (x) { return x.room !== room; });
    list.unshift({ room: room, nick: nick || "", pass: pass || "", ts: Date.now() });
    saveRooms(list);
  }

  function roleGuest() {
    try { return (localStorage.getItem("radar-role-v1") || "") !== "work"; } catch (e) { return true; }
  }

  function roomChats() {
    return loadRooms().filter(function (r) {
      if (r.room === "smena") return false;
      if (roleGuest() && r.room === "smena") return false;
      return true;
    }).map(function (r) {
      return {
        id: "hist:" + r.room,
        name: r.room,
        type: "group",
        color: "#65aadd",
        initials: "К",
        status: (r.nick ? r.nick + " · " : "") + "вы входили",
        unread: 0,
        hist: true,
        messages: [{ id: 1, from: "them", text: "Комната, в которую вы уже входили. Нажмите, чтобы войти снова.", ts: r.ts || Date.now() }]
      };
    });
  }

  function setOnline(names, where) {
    names = names || [];
    live.online = names;
    live.places = live.places || {};
    (where || []).forEach(function (w) {
      if (w && w.nick) live.places[w.nick] = w.place || "";
    });
    var chat = typeof ensureLiveChat === "function" ? ensureLiveChat() : null;
    var line = names.length ? names.join(", ") : "никого нет";
    if (chat) {
      chat.status = line;
      chat.online = names.length > 1;
    }
    var st = document.getElementById("convStatus");
    if (st && state.activeId === "live") st.textContent = chat ? chat.status : "";
    var box = document.getElementById("onlineList");
    if (box) {
      box.innerHTML = names.length
        ? names.map(function (n) { return "<div class='online-row'><span class='online-dot'></span> " + n + "</div>"; }).join("")
        : "<div class='online-row'>Пока никого</div>";
    }
    if (typeof renderList === "function") renderList();
  }

  function notify(title, body) {
    try {
      if (window.RadarNative && RadarNative.notify) {
        RadarNative.notify(String(title || "Радар"), String(body || ""));
        return;
      }
    } catch (e) {}
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification(title || "Радар", { body: body || "", silent: false });
      }
    } catch (e) {}
  }

  function keep(on) {
    try { if (window.RadarNative && RadarNative.keepAlive) RadarNative.keepAlive(!!on); } catch (e) {}
  }

  window.RadarLive = {
    rememberRoom: rememberRoom,
    roomChats: roomChats,
    setOnline: setOnline,
    notify: notify,
    keep: keep,
    loadRooms: loadRooms
  };

  var origApply = window.applyDesk;
  // staff-desk applyDesk is inside IIFE; we wrap renderList / guest merge via renderList patch
  var origRender = renderList;
  renderList = function (filter) {
    if (typeof state !== "undefined" && state.chats) {
      var extra = roomChats();
      extra.forEach(function (c) {
        if (!state.chats.some(function (x) { return x.id === c.id; })) state.chats.push(c);
      });
    }
    origRender(filter);
  };

  if (typeof openChat === "function") {
    var prev = openChat;
    openChat = function (id) {
      if (String(id).indexOf("hist:") === 0) {
        var room = String(id).slice(5);
        if (room === "smena") {
          prev("room:smena");
          return;
        }
        var rec = loadRooms().filter(function (x) { return x.room === room; })[0];
        var g = document.getElementById("gate");
        if (g) g.classList.remove("hidden");
        if (rec) {
          var n = document.getElementById("gateNick");
          var r = document.getElementById("gateRoom");
          var p = document.getElementById("gatePass");
          if (n) n.value = rec.nick || "";
          if (r) r.value = rec.room;
          if (p) p.value = rec.pass || "";
        }
        return;
      }
      prev(id);
      if (isLiveId ? isLiveId(id) : (id === "live" || String(id).indexOf("room:") === 0)) {
        var panel = document.getElementById("onlinePanel");
        if (panel) panel.classList.remove("hidden");
      } else {
        var panel2 = document.getElementById("onlinePanel");
        if (panel2) panel2.classList.add("hidden");
      }
    };
  }

  var st = document.getElementById("convStatus");
  if (st) {
    st.style.cursor = "pointer";
    st.addEventListener("click", function () {
      var names = (live && live.online) || [];
      alert(names.length ? ("Сейчас в комнате:\n" + names.join("\n")) : "В комнате пока никого, кроме вас.");
    });
  }

  var join = document.getElementById("gateJoin");
  if (join) {
    join.addEventListener("click", function () {
      var nick = (document.getElementById("gateNick").value || "").trim();
      var room = (document.getElementById("gateRoom").value || "").trim();
      var pass = document.getElementById("gatePass").value || "";
      if (room) rememberRoom(nick, room, pass);
    });
  }
})();
