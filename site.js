/* Small progressive enhancements: copy buttons on code blocks,
   search + category filter on the writing page. */
(function () {
  "use strict";

  /* ---------------- Copy button on code blocks ---------------- */
  var COPY_ICON =
    '<svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>' +
    '<svg class="icon-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function addCopyButtons() {
    if (!navigator.clipboard) return;
    var blocks = document.querySelectorAll(".prose .code-block");
    blocks.forEach(function (block) {
      var pre = block.querySelector("pre");
      if (!pre || pre.classList.contains("mermaid")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", "Copy code");
      btn.title = "Copy code";
      btn.innerHTML = COPY_ICON;
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = (code || pre).textContent || "";
        navigator.clipboard.writeText(text).then(function () {
          btn.classList.add("copied");
          setTimeout(function () {
            btn.classList.remove("copied");
          }, 2000);
        });
      });
      block.appendChild(btn);
    });
  }

  /* ---------------- Writing page filters ---------------- */
  function setupFilters() {
    var root = document.getElementById("writing");
    if (!root) return;

    var input = document.getElementById("search");
    var clear = document.getElementById("search-clear");
    var reset = document.getElementById("reset-filters");
    var dropdown = document.getElementById("category-dropdown");
    var toggle = dropdown.querySelector(":scope > button");
    var label = toggle.querySelector(".label");
    var options = dropdown.querySelectorAll('[role="option"]');
    var items = root.querySelectorAll(".post-list li");
    var groups = root.querySelectorAll(".year-group");

    var category = "";

    function apply() {
      var q = (input.value || "").trim().toLowerCase();
      root.querySelector(".search").classList.toggle("has-value", q.length > 0);

      items.forEach(function (li) {
        var title = (li.getAttribute("data-title") || "").toLowerCase();
        var cat = li.getAttribute("data-category") || "";
        var show = (!q || title.indexOf(q) !== -1) && (!category || cat === category);
        li.classList.toggle("hidden", !show);
      });

      var any = false;
      groups.forEach(function (g) {
        var visible = g.querySelectorAll(".post-list li:not(.hidden)").length > 0;
        g.classList.toggle("hidden", !visible);
        if (visible) any = true;
      });
      root.classList.toggle("is-empty", !any);
    }

    function setCategory(value, text) {
      category = value;
      label.textContent = text;
      options.forEach(function (o) {
        o.setAttribute("aria-selected", o.getAttribute("data-value") === value ? "true" : "false");
      });
      apply();
    }

    function closeMenu() {
      dropdown.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    input.addEventListener("input", apply);
    clear.addEventListener("click", function () {
      input.value = "";
      apply();
      input.focus();
    });
    reset.addEventListener("click", function () {
      input.value = "";
      setCategory("", "all");
    });

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    options.forEach(function (o) {
      o.addEventListener("click", function () {
        var value = o.getAttribute("data-value") || "";
        setCategory(value, value || "all");
        closeMenu();
      });
    });
    document.addEventListener("mousedown", function (e) {
      if (!dropdown.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    apply();
  }

  function init() {
    addCopyButtons();
    setupFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
