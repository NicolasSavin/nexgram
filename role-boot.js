(function () {
  var KEY = "radar-role-v1";
  function role() {
    try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  }
  function setRole(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    document.documentElement.dataset.role = v;
    apply();
  }
  function apply() {
    var r = role();
    document.documentElement.dataset.role = r;
    var hint = document.getElementById("emptyHint");
    if (hint) {
      hint.innerHTML = r === "work"
        ? "Смена и маршруты."
        : "Закрытые чаты и эфир.";
    }
    if (typeof state !== "undefined" && Array.isArray(state.chats)) {
      if (r !== "work") {
        state.chats = state.chats.filter(function (c) { return c.id !== "routes"; });
      } else if (!state.chats.some(function (c) { return c.id === "routes"; })) {
        state.chats.unshift({
          id: "routes", name: "Маршруты", type: "channel",
          color: "#c8943c", initials: "М", status: "", unread: 0, messages: []
        });
      }
      if (typeof renderList === "function") renderList();
    }
    var routesBtn = document.querySelector('[data-action="routes"]');
    if (routesBtn) routesBtn.style.display = r === "work" ? "" : "none";
  }
  function showPick() {
    var el = document.getElementById("roleGate");
    if (el) el.classList.remove("hidden");
    var g = document.getElementById("gate");
    if (g) g.classList.add("hidden");
  }
  function hidePick() {
    var el = document.getElementById("roleGate");
    if (el) el.classList.add("hidden");
  }
  var gbtn = document.getElementById("roleGuest");
  if (gbtn) gbtn.addEventListener("click", function () {
    setRole("guest"); hidePick();
    var gate = document.getElementById("gate");
    if (gate) gate.classList.remove("hidden");
  });
  var wbtn = document.getElementById("roleWork");
  if (wbtn) wbtn.addEventListener("click", function () {
    setRole("work"); hidePick();
    var gate = document.getElementById("gate");
    if (gate) gate.classList.remove("hidden");
  });
  if (!role()) showPick();
  else { hidePick(); apply(); }
})();
