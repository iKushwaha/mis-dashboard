// Date Range Filter — shared control injected into every dashboard. By default
// each page shows only the most recent day of data ("Latest Day"); all history
// remains saved in Supabase and can be viewed with a range selection.
(function () {
  const MODES = [
    { id: "latest", label: "Latest Day" },
    { id: "today", label: "Today" },
    { id: "last7", label: "Last 7 Days" },
    { id: "last30", label: "Last 30 Days" },
    { id: "custom", label: "Custom Range" },
    { id: "all", label: "All Data" }
  ];
  const DEFAULTS = { mode: "latest", from: "", to: "" };

  let cfg = { ...DEFAULTS };
  let onApply = null;
  let countLabel = null;

  function storageKey() {
    const page = (window.location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
    return "date_filter_" + page;
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey());
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && MODES.some(m => m.id === parsed.mode)) {
        cfg = { ...DEFAULTS, ...parsed };
        return;
      }
    } catch (e) { /* ignore */ }
    cfg = { ...DEFAULTS };
  }

  function save() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(cfg));
    } catch (e) { /* ignore */ }
  }

  function toYMD(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function today() {
    return toYMD(new Date());
  }

  function addDays(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return toYMD(d);
  }

  function filterByDate(records, getDate) {
    const mode = cfg.mode;
    if (mode === "all" || !records.length) return records;

    const valid = records
      .map(r => ({ r, d: toYMD(getDate(r)) }))
      .filter(x => x.d);

    if (mode === "latest") {
      if (valid.length === 0) return records;
      const max = valid.reduce((m, x) => (x.d > m ? x.d : m), valid[0].d);
      return valid.filter(x => x.d === max).map(x => x.r);
    }

    const t = today();
    if (mode === "today") return valid.filter(x => x.d === t).map(x => x.r);
    if (mode === "last7") {
      const from = addDays(t, -6);
      return valid.filter(x => x.d >= from).map(x => x.r);
    }
    if (mode === "last30") {
      const from = addDays(t, -29);
      return valid.filter(x => x.d >= from).map(x => x.r);
    }
    if (mode === "custom") {
      const from = cfg.from || "";
      const to = cfg.to || "";
      if (!from && !to) return records;
      return valid.filter(x => (!from || x.d >= from) && (!to || x.d <= to)).map(x => x.r);
    }
    return records;
  }

  function buildControl() {
    const bar = document.createElement("div");
    bar.className = "date-filter-bar";
    bar.innerHTML =
      '<span class="date-filter-label">Date Range:</span>' +
      '<div class="date-filter-chips">' +
      MODES.map(m =>
        `<button type="button" class="btn btn-filter date-filter-chip${m.id === cfg.mode ? " active" : ""}" data-mode="${m.id}">${m.label}</button>`
      ).join("") +
      '</div>' +
      `<label class="date-filter-field" title="From date"><span>From</span><input type="date" id="dateFilterFrom" value="${cfg.from || ""}"></label>` +
      `<label class="date-filter-field" title="To date"><span>To</span><input type="date" id="dateFilterTo" value="${cfg.to || ""}"></label>` +
      '<button type="button" class="btn btn-filter" id="dateFilterClear" title="Reset to Latest Day">Reset</button>' +
      '<span class="date-filter-count" id="dateFilterCount"></span>';

    const controlBar = document.querySelector(".control-bar");
    if (controlBar && controlBar.parentNode) {
      controlBar.parentNode.insertBefore(bar, controlBar.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    const chips = bar.querySelectorAll(".date-filter-chip");
    const fromEl = bar.querySelector("#dateFilterFrom");
    const toEl = bar.querySelector("#dateFilterTo");

    function setActive(mode) {
      chips.forEach(c => c.classList.toggle("active", c.dataset.mode === mode));
      const custom = mode === "custom";
      fromEl.disabled = !custom;
      toEl.disabled = !custom;
    }

    function emit() {
      save();
      setActive(cfg.mode);
      if (onApply) onApply();
    }

    chips.forEach(c => c.addEventListener("click", () => {
      cfg.mode = c.dataset.mode;
      emit();
    }));

    fromEl.addEventListener("change", () => {
      cfg.from = fromEl.value;
      if (cfg.mode !== "custom") cfg.mode = "custom";
      emit();
    });

    toEl.addEventListener("change", () => {
      cfg.to = toEl.value;
      if (cfg.mode !== "custom") cfg.mode = "custom";
      emit();
    });

    bar.querySelector("#dateFilterClear").addEventListener("click", () => {
      cfg = { ...DEFAULTS };
      fromEl.value = "";
      toEl.value = "";
      emit();
    });

    countLabel = bar.querySelector("#dateFilterCount");
    setActive(cfg.mode);
  }

  window.DateFilter = {
    init(config) {
      onApply = config.onApply || null;
      load();
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildControl);
      } else {
        buildControl();
      }
    },
    apply(records, getDate) {
      return filterByDate(records, getDate);
    },
    get mode() {
      return cfg.mode;
    },
    setCount(shown, total) {
      if (countLabel) countLabel.innerText = `${shown} of ${total} record${total !== 1 ? "s" : ""} shown`;
    }
  };
})();
