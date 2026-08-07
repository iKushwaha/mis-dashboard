// Chart Sizing — height slider injected into the chart toolbar on every
// dashboard. Chart containers always span the full card width horizontally;
// the slider only controls height. Charts use responsive +
// maintainAspectRatio:false, so container size drives chart dimensions.
(function () {
  const DEFAULTS = { height: 350 };
  const MIN_HEIGHT = 160, MAX_HEIGHT = 800;

  function storageKey() {
    const page = (window.location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
    return "chart_size_" + page;
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey());
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.height === "number") return { height: parsed.height };
    } catch (e) { /* ignore */ }
    return { ...DEFAULTS };
  }

  function save(size) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(size));
    } catch (e) { /* ignore */ }
  }

  function apply(size) {
    document.querySelectorAll(".chart-container").forEach(el => {
      el.style.width = "100%";
      el.style.maxWidth = "none";
      el.style.height = size.height + "px";
    });
    window.dispatchEvent(new Event("resize"));
  }

  function buildControl(toolbar) {
    const size = load();
    const wrap = document.createElement("span");
    wrap.className = "chart-size-control";
    wrap.innerHTML =
      '<span class="chart-toolbar-sep" aria-hidden="true"></span>' +
      '<span class="chart-toolbar-label">Height:</span>' +
      `<label class="chart-size-field" title="Chart height"><span>H</span><input type="range" id="chartSizeH" min="${MIN_HEIGHT}" max="${MAX_HEIGHT}" step="10" value="${size.height}" aria-label="Chart height"></label>` +
      '<button type="button" class="btn btn-filter" id="chartSizeReset" title="Reset chart height">Reset</button>';
    toolbar.appendChild(wrap);

    const hInput = wrap.querySelector("#chartSizeH");
    const update = () => {
      const next = { height: parseInt(hInput.value, 10) || DEFAULTS.height };
      save(next);
      apply(next);
    };
    hInput.addEventListener("input", update);
    wrap.querySelector("#chartSizeReset").addEventListener("click", () => {
      hInput.value = DEFAULTS.height;
      update();
    });

    apply(size);
  }

  function init() {
    const toolbar = document.querySelector(".chart-toolbar");
    if (toolbar) buildControl(toolbar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
