// Merged All Reports page: auto-sizes embedded reports, syncs theme, hides internal switchers.
(function () {
  const SUN_ICON = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
  const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("iframe.report-frame").forEach(frame => {
      if (frame.contentDocument) {
        frame.contentDocument.documentElement.setAttribute("data-theme", theme);
      }
    });
    const icon = document.getElementById("themeIcon");
    if (icon) {
      icon.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
      icon.setAttribute("stroke", theme === "dark" ? "#f59e0b" : "#1e293b");
    }
  }

  const storedTheme = localStorage.getItem("warehouse_dashboard_theme");
  if (storedTheme) applyTheme(storedTheme);
  else applyTheme("dark");

  window.addEventListener("storage", (e) => {
    if (e.key === "warehouse_dashboard_theme") {
      applyTheme(e.newValue || "dark");
    }
  });

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = getTheme() === "dark" ? "light" : "dark";
      localStorage.setItem("warehouse_dashboard_theme", next);
      applyTheme(next);
    });
  }

  // Auto-size embedded reports and hide their internal report switcher
  const frames = document.querySelectorAll("iframe.report-frame");
  frames.forEach(frame => {
    const resize = () => {
      const doc = frame.contentDocument;
      if (!doc || !doc.body) return;
      frame.style.height = (doc.body.scrollHeight + 2) + "px";
    };

    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      if (doc) {
        const switcher = doc.querySelector(".report-switcher");
        if (switcher) switcher.style.display = "none";
      }
      resize();
      if (frame.contentWindow && frame.contentWindow.ResizeObserver && frame.contentDocument && frame.contentDocument.body) {
        new frame.contentWindow.ResizeObserver(resize).observe(frame.contentDocument.body);
      }
    });

    resize();
  });
})();
