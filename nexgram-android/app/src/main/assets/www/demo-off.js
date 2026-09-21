(function () {
  function keep(c) {
    return c && (c.id === "routes" || String(c.id).indexOf("live") === 0);
  }
  try { localStorage.removeItem("nexgram-v1"); } catch (e) {}
  if (typeof state !== "undefined" && Array.isArray(state.chats)) {
    state.chats = state.chats.filter(keep);
    var isWork = false;
    try { isWork = localStorage.getItem("radar-role-v1") === "work"; } catch (e) {}
    if (isWork && !state.chats.some(function (c) { return c.id === "routes"; })) {
      state.chats.unshift({
        id: "routes", name: "Маршруты", type: "channel",
        color: "#c8943c", initials: "М", status: "", unread: 0, messages: []
      });
    }
    if (!isWork) state.chats = state.chats.filter(function (c) { return c.id !== "routes"; });
    if (typeof saveState === "function") saveState();
    if (typeof renderList === "function") renderList();
  }
  window.newChat = function () {
    var g = document.getElementById("gate");
    if (g) g.classList.remove("hidden");
  };
})();
