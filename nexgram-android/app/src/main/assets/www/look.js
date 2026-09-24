(function () {
  var BASES = ["https://photography-word-essence-knowledge.trycloudflare.com", "http://186.246.3.44", ""];
  function guest() {
    try { return localStorage.getItem("radar-role-v1") !== "work"; } catch (e) { return true; }
  }
  function roomNow() {
    if (typeof live !== "undefined" && live.roomId && live.roomId !== "smena") return live.roomId;
    if (typeof state === "undefined" || !state.activeId) return "";
    var chat = (state.chats || []).find(function (c) { return c.id === state.activeId; });
    var room = chat && chat.room;
    return room && room !== "smena" ? room : "";
  }
  function api(room, opts) {
    var i = 0;
    var q = room ? ("?room=" + encodeURIComponent(room)) : "";
    function one() {
      if (i >= BASES.length) return Promise.reject(new Error("look"));
      var base = BASES[i++];
      return fetch(base + "/room-look" + q, Object.assign({ cache: "no-store" }, opts || {})).then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      }).catch(function () { return one(); });
    }
    return one();
  }
  function paint(wall) {
    var box = document.getElementById("messages");
    if (!box) return;
    if (!wall || wall === "night") delete box.dataset.wall;
    else box.dataset.wall = wall;
  }
  function showHi(room, text) {
    if (typeof state === "undefined" || typeof ensureLiveChat !== "function") return;
    var chat = ensureLiveChat(room);
    chat.messages = chat.messages || [];
    var old = chat.messages.find(function (m) { return m.welcome; });
    if (!text) {
      if (old) chat.messages = chat.messages.filter(function (m) { return !m.welcome; });
    } else if (old) old.text = text;
    else chat.messages.unshift({ id: "welcome", welcome: 1, from: "them", text: text, ts: 1 });
    if (typeof saveState === "function") saveState();
    if (state.activeId === chat.id && typeof renderMessages === "function") renderMessages(chat);
  }
  function load(room) {
    if (!room || room === "smena") { paint(""); return; }
    api(room).then(function (j) {
      paint(j.wall || "night");
      showHi(room, j.welcome || "");
    }).catch(function () {});
  }
  function save(room, wall, welcome) {
    if (!room || room === "smena") return Promise.resolve();
    return api(room, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: room, wall: wall || "night", welcome: welcome || "" })
    }).then(function (j) {
      paint(j.wall || wall);
      showHi(room, j.welcome || "");
    });
  }
  function chosen() {
    var on = document.querySelector("#gateWalls .on");
    var hi = document.getElementById("gateHi");
    return {
      wall: on ? on.getAttribute("data-wall") : "night",
      welcome: hi ? hi.value.trim() : ""
    };
  }
  var walls = document.getElementById("gateWalls");
  if (walls) {
    walls.addEventListener("click", function (e) {
      var b = e.target.closest("[data-wall]");
      if (!b) return;
      [].forEach.call(walls.querySelectorAll("button"), function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });
  }
  var join = document.getElementById("gateJoin");
  if (join) {
    join.addEventListener("click", function () {
      if (!guest()) return;
      var roomEl = document.getElementById("gateRoom");
      var room = roomEl ? roomEl.value.trim() : "";
      var pick = chosen();
      if (!room || room.toLowerCase() === "smena") return;
      if (pick.wall === "night" && !pick.welcome) {
        setTimeout(function () { load(room); }, 1200);
        return;
      }
      save(room, pick.wall, pick.welcome);
    });
  }
  if (typeof openChat === "function") {
    var prev = openChat;
    openChat = function (id) {
      prev(id);
      var room = roomNow();
      var btn = document.getElementById("lookBtn");
      if (btn) btn.style.display = room ? "" : "none";
      if (room) load(room);
      else paint("");
    };
  }
  var actions = document.querySelector(".conv-actions");
  if (actions && !document.getElementById("lookBtn")) {
    var b = document.createElement("button");
    b.id = "lookBtn";
    b.type = "button";
    b.className = "icon-btn";
    b.textContent = "Обои";
    b.style.width = "auto";
    b.style.padding = "0 10px";
    b.style.display = "none";
    actions.appendChild(b);
    b.addEventListener("click", function () {
      var room = roomNow();
      if (!room) return;
      var panel = document.getElementById("lookPanel");
      if (!panel) {
        panel = document.createElement("div");
        panel.id = "lookPanel";
        panel.className = "gate";
        panel.innerHTML = '<div class="gate-card"><h2>Оформление комнаты</h2><div class="walls" id="lookWalls">' +
          '<button type="button" data-wall="night" class="on"></button><button type="button" data-wall="sea"></button>' +
          '<button type="button" data-wall="forest"></button><button type="button" data-wall="sand"></button>' +
          '<button type="button" data-wall="dusk"></button><button type="button" data-wall="paper"></button></div>' +
          '<label>Приветствие</label><input id="lookHi" maxlength="200" placeholder="Что увидят при входе">' +
          '<button type="button" id="lookSave">Сохранить</button><button type="button" class="ghost" id="lookClose">Закрыть</button></div>';
        document.body.appendChild(panel);
        panel.querySelector("#lookWalls").addEventListener("click", function (e) {
          var t = e.target.closest("[data-wall]");
          if (!t) return;
          [].forEach.call(panel.querySelectorAll("#lookWalls button"), function (x) { x.classList.remove("on"); });
          t.classList.add("on");
        });
        panel.querySelector("#lookClose").onclick = function () { panel.classList.add("hidden"); };
        panel.querySelector("#lookSave").onclick = function () {
          var on = panel.querySelector("#lookWalls .on");
          var wall = on ? on.getAttribute("data-wall") : "night";
          var hi = panel.querySelector("#lookHi").value.trim();
          save(roomNow(), wall, hi).then(function () { panel.classList.add("hidden"); }).catch(function () {
            alert("Не сохранилось");
          });
        };
      }
      var cur = document.getElementById("messages");
      var wall = (cur && cur.dataset.wall) || "night";
      [].forEach.call(panel.querySelectorAll("#lookWalls button"), function (x) {
        x.classList.toggle("on", x.getAttribute("data-wall") === wall);
      });
      var hiEl = document.getElementById("lookHi");
      var chat = (state.chats || []).find(function (c) { return c.room === roomNow(); });
      var note = chat && (chat.messages || []).find(function (m) { return m.welcome; });
      if (hiEl) hiEl.value = note ? note.text : "";
      panel.classList.remove("hidden");
    });
  }
})();
