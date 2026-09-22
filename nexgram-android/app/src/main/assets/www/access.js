(function () {
  function roleName() {
    var u = null;
    try { u = JSON.parse(localStorage.getItem("mm_user") || "null"); } catch (e) {}
    var role = "";
    try { role = localStorage.getItem("radar-role-v1") || ""; } catch (e) {}
    if (u && u.admin) return { key: "admin", title: "Администратор смены", who: u.name || u.login };
    if (u && role === "work") return { key: "work", title: "Сотрудник смены", who: u.name || u.login };
    return { key: "guest", title: "Гражданский доступ", who: "пользователь" };
  }

  function textFor(r) {
    if (r.key === "admin") {
      return r.who + " · администратор\n\nМожно: маршруты, гостиницы, кто где, чат работников, рация, наряд, помощник, эфир, фото/видео, состав.\nГражданский чат — отдельно, из меню.\nПосторонние этот список не видят.";
    }
    if (r.key === "work") {
      return r.who + " · сотрудник\n\nМожно: маршруты, гостиницы, кто где, чат работников, рация, наряд, помощник, эфир, фото.\nНельзя: чужие гражданские комнаты, список фамилий без кода смены.\nАдмин-функции наряда — у старших.";
    }
    return "Гражданский доступ\n\nМожно: свои комнаты, имя, фото в своей комнате, рация комнаты.\nНельзя: список сотрудников, кто где, наряд, служебный эфир.\nСмена открывается только кодом «охрана».";
  }

  function show() {
    var panel = document.getElementById("rightsPanel");
    var body = document.getElementById("rightsBody");
    if (!panel || !body) return;
    body.textContent = textFor(roleName());
    panel.classList.remove("hidden");
  }

  var btn = document.getElementById("rightsClose");
  if (btn) btn.addEventListener("click", function () {
    var panel = document.getElementById("rightsPanel");
    if (panel) panel.classList.add("hidden");
  });

  window.radarRights = { show: show, roleName: roleName };
})();
