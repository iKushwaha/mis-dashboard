(function () {
  const SVG_ICONS = {
    sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
    moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`
  };

  let theme = localStorage.getItem("warehouse_dashboard_theme") || "dark";

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    icon.innerHTML = theme === "dark" ? SVG_ICONS.sun : SVG_ICONS.moon;
    icon.setAttribute("stroke", theme === "dark" ? "#f59e0b" : "#1e293b");
  }

  const themeToggle = document.getElementById("themeToggle");
  themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("warehouse_dashboard_theme", theme);
    applyTheme();
  });

  // ---------- Data helpers ----------
  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function fmtInt(n) {
    return (n || 0).toLocaleString("en-IN");
  }

  function fmtPct(n) {
    return `${(n || 0).toFixed(2)}%`;
  }

  function fill(id, value, subText) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
    if (subText) {
      const sub = document.getElementById(id + "Sub");
      if (sub) sub.innerText = subText;
    }
  }

  function render() {
    let stores = read("warehouse_dashboard_stores_v2") || [];
    let items = read("inventory_cycle_count_stores_v3") || [];
    let entries = read("rtv_entries_v1") || [];
    const manualWork = read("daily_work_entries_v1") || [];

    if (window.DateFilter) {
      const rawTotal = stores.length + items.length + entries.length + manualWork.length;
      stores = DateFilter.apply(stores, s => s.dispatchDate || s.poDate);
      items = DateFilter.apply(items, s => s.countDate);
      entries = DateFilter.apply(entries, s => s.receiveDate);
      const filteredManual = DateFilter.apply(manualWork, m => m.date);
      DateFilter.setCount(stores.length + items.length + entries.length + filteredManual.length, rawTotal);
    }

    // ---- Store Dispatch ----
    if (stores && stores.length > 0) {
      const totalPO = stores.reduce((a, s) => a + (s.poQty || 0), 0);
      const totalSent = stores.reduce((a, s) => a + (s.sentQty || 0), 0);
      const totalShortage = stores.reduce((a, s) => a + Math.max(0, (s.poQty || 0) - (s.sentQty || 0)), 0);
      const efficiency = totalPO > 0 ? (totalSent / totalPO) * 100 : 0;
      fill("metaStore", `${stores.length} stores · ${fmtInt(totalPO)} PO units`);
      fill("heroStores", `${stores.length} Stores`);
      fill("sumEfficiency", fmtPct(efficiency));
      fill("sumShortage", fmtInt(totalShortage));
    } else {
      fill("metaStore", "No data yet — open the report to load it");
      fill("heroStores", "No store data");
      fill("sumEfficiency", "-");
      fill("sumShortage", "-");
    }

    // ---- Inventory Cycle Count ----
    if (items && items.length > 0) {
      const systemQty = items.reduce((a, s) => a + (s.systemQty || 0), 0);
      const totalVariance = items.reduce((a, s) => a + Math.abs((s.physicalQty || 0) - (s.systemQty || 0)), 0);
      const varianceSkuCount = items.filter(s => (s.physicalQty || 0) - (s.systemQty || 0) !== 0).length;
      const accuracy = systemQty > 0 ? Math.max(0, (1 - totalVariance / systemQty) * 100) : 100;
      fill("metaInventory", `${items.length} SKUs · ${fmtInt(systemQty)} system units`);
      fill("heroItems", `${items.length} Items`);
      fill("sumAccuracy", fmtPct(accuracy));
      fill("sumItems", fmtInt(items.length));
      fill("sumItemsSub", `${varianceSkuCount} SKUs with variance`);
    } else {
      fill("metaInventory", "No data yet — open the report to load it");
      fill("heroItems", "No item data");
      fill("sumAccuracy", "-");
      fill("sumItems", "-");
      fill("sumItemsSub", "SKU codes verified");
    }

    // ---- RTV ----
    if (entries && entries.length > 0) {
      const totalQtyReturned = entries.reduce((a, e) => a + (e.receivedQty || 0), 0);
      const completed = entries.filter(e =>
        e.unboxingStatus === "DONE" && e.videoUploadStatus === "UPLOADED" && e.booking === "BOOKED"
      ).length;
      const completionScore = (completed / entries.length) * 100;
      fill("metaRtv", `${entries.length} entries · ${fmtInt(totalQtyReturned)} units returned`);
      fill("heroEntries", `${entries.length} RTV Entries`);
      fill("sumCompletion", fmtPct(completionScore));
      fill("sumReturned", fmtInt(totalQtyReturned));
    } else {
      fill("metaRtv", "No data yet — open the report to load it");
      fill("heroEntries", "No RTV data");
      fill("sumCompletion", "-");
      fill("sumReturned", "-");
    }

    // ---- Daily Work Report ----
    const totalWork = (stores ? stores.length : 0) + (items ? items.length : 0) + (entries ? entries.length : 0) + manualWork.length;
    const unitsHandled = (stores ? stores.reduce((a, s) => a + (s.sentQty || 0), 0) : 0) +
      (items ? items.reduce((a, s) => a + (s.physicalQty || 0), 0) : 0) +
      (entries ? entries.reduce((a, e) => a + (e.receivedQty || 0), 0) : 0);
    fill("metaDaily", `${totalWork} work items · ${fmtInt(unitsHandled)} units handled`);

    // Footer date
    const footerDate = document.getElementById("footerDate");
    if (footerDate) {
      footerDate.innerText = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
    }
  }

  applyTheme();

  // Date range filter (defaults to latest day; rest stays saved in cloud)
  if (window.DateFilter) {
    DateFilter.init({ onApply: () => render() });
  }

  render();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => render());
  }

  // Pull cloud data into LocalStorage (falls back silently when offline)
  (async function syncFromCloud() {
    if (!window.DataService || !DataService.ready) return;
    const mapping = {
      STORE_DISPATCH: "warehouse_dashboard_stores_v2",
      INVENTORY: "inventory_cycle_count_stores_v3",
      RTV: "rtv_entries_v1"
    };
    let changed = false;
    for (const [table, key] of Object.entries(mapping)) {
      const merged = await DataService.syncTable(table, read(key) || []);
      if (merged) {
        localStorage.setItem(key, JSON.stringify(merged));
        changed = true;
      }
    }
    if (changed) render();
  })();
})();
