const GATE_KEY = "radar-gate-v1";
function loadGate() {
  try { return JSON.parse(localStorage.getItem(GATE_KEY) || "null"); } catch (e) { return null; }
}
function saveGate(nick, room, pass) {
  localStorage.setItem(GATE_KEY, JSON.stringify({ nick: nick, room: room, pass: pass }));
}
(function () {
  var g = loadGate();
  if (g) {
    var n = document.getElementById("gateNick");
    var r = document.getElementById("gateRoom");
    var p = document.getElementById("gatePass");
    if (n && g.nick) n.value = g.nick;
    if (r && g.room) r.value = g.room;
    if (p && g.pass) p.value = g.pass;
  }
  var savedBtn = document.getElementById("gateSaved");
  if (savedBtn) {
    savedBtn.addEventListener("click", function () {
      var s = loadGate();
      if (!s || !s.room || !s.pass) {
        alert("Сохранённой смены ещё нет. Один раз войдите вручную.");
        return;
      }
      document.getElementById("gateNick").value = s.nick || "";
      document.getElementById("gateRoom").value = s.room;
      document.getElementById("gatePass").value = s.pass;
      document.getElementById("gateJoin").click();
    });
  }
  var join = document.getElementById("gateJoin");
  if (join) {
    join.addEventListener("click", function () {
      var nick = (document.getElementById("gateNick").value || "").trim() || "Гость";
      var room = (document.getElementById("gateRoom").value || "").trim();
      var pass = document.getElementById("gatePass").value || "";
      if (room && pass) saveGate(nick, room, pass);
    });
  }
})();
