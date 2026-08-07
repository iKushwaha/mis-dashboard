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
    if (lastStores) renderCharts(lastStores, lastItems, lastEntries);
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

  // ---------- Report snapshot charts ----------
  if (typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels);
  }

  const miniCharts = {};
  let lastStores = null, lastItems = null, lastEntries = null;

  const MINI_PALETTE = [
    "#3b82f6", "#f97316", "#2dd4bf", "#ef4444", "#a855f7", "#eab308",
    "#22c55e", "#ec4899", "#06b6d4", "#fb923c", "#8b5cf6", "#f43f5e"
  ];

  function miniTheme() {
    const dark = theme === "dark";
    return {
      dark,
      grid: dark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
      text: dark ? "#9ca3af" : "#475569"
    };
  }

  function buildMiniChart(canvasId, config) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (miniCharts[canvasId]) miniCharts[canvasId].destroy();
    miniCharts[canvasId] = new Chart(el.getContext("2d"), config);
  }

  function renderCharts(stores, items, entries) {
    lastStores = stores; lastItems = items; lastEntries = entries;
    Object.values(miniCharts).forEach(c => { if (c) c.destroy(); });
    Object.keys(miniCharts).forEach(k => delete miniCharts[k]);

    const th = miniTheme();

    if (stores && stores.length) {
      const labels = stores.map(s => s.storeName || "-");
      buildMiniChart("miniDispatchChart", {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "PO Qty", data: stores.map(s => s.poQty || 0), backgroundColor: th.dark ? "rgba(59, 130, 246, 0.8)" : "rgba(37, 99, 235, 0.85)", borderColor: "#3b82f6", borderWidth: 1, borderRadius: 4 },
            { label: "Sent Qty", data: stores.map(s => s.sentQty || 0), backgroundColor: th.dark ? "rgba(249, 115, 22, 0.8)" : "rgba(234, 88, 12, 0.85)", borderColor: "#f97316", borderWidth: 1, borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: th.text, font: { family: "Inter" }, boxWidth: 12 } },
            datalabels: { color: th.text, font: { family: "Inter", size: 9 }, anchor: "end", align: "end" }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: th.text, font: { family: "Inter" }, maxRotation: 45, autoSkip: true } },
            y: { grid: { color: th.grid }, ticks: { color: th.text, font: { family: "Inter" } } }
          }
        }
      });
    }

    if (items && items.length) {
      const withVar = items.map(i => ({ name: i.itemName || "-", v: (i.physicalQty || 0) - (i.systemQty || 0) }));
      const over = withVar.filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10);
      const short = withVar.filter(x => x.v < 0).sort((a, b) => a.v - b.v).slice(0, 10);
      const top = [...over, ...short];
      if (top.length) {
        const colors = top.map(x => x.v > 0 ? "#f97316" : "#ef4444");
        buildMiniChart("miniInventoryChart", {
          type: "bar",
          data: {
            labels: top.map(x => x.name),
            datasets: [{ label: "Variance", data: top.map(x => Math.abs(x.v)), backgroundColor: colors, borderColor: "#0f172a", borderWidth: 1, borderRadius: 4 }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              datalabels: { display: false }
            },
            scales: {
              x: { grid: { color: th.grid }, ticks: { color: th.text, font: { family: "Inter" } } },
              y: { grid: { display: false }, ticks: { color: th.text, font: { family: "Inter", size: 10 }, autoSkip: false } }
            }
          }
        });
      }
    }

    if (entries && entries.length) {
      const map = {};
      entries.forEach(e => { const k = e.warehouseLocation || "UNKNOWN"; map[k] = (map[k] || 0) + (e.receivedQty || 0); });
      const labels = Object.keys(map).sort((a, b) => map[b] - map[a]);
      const total = labels.reduce((a, k) => a + map[k], 0);
      buildMiniChart("miniRtvChart", {
        type: "doughnut",
        data: {
          labels,
          datasets: [{ label: "Received Qty", data: labels.map(k => map[k]), backgroundColor: labels.map((_, i) => MINI_PALETTE[i % MINI_PALETTE.length]), borderColor: th.dark ? "#111827" : "#ffffff", borderWidth: 2 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { color: th.text, font: { family: "Inter", size: 11 }, boxWidth: 12 } },
            datalabels: { color: "#ffffff", font: { family: "Inter", weight: "bold", size: 11 }, anchor: "center", align: "center", formatter: (value) => total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%" }
          }
        }
      });
    }
  }

  function render() {
    let stores = read("warehouse_dashboard_stores_v2") || [];
    let items = read("inventory_cycle_count_stores_v3") || [];
    let entries = read("rtv_entries_v1") || [];
    const manualWork = read("daily_work_entries_v1") || [];
    let filteredManual = manualWork;

    if (window.DateFilter) {
      const rawTotal = stores.length + items.length + entries.length + manualWork.length;
      stores = DateFilter.apply(stores, s => s.dispatchDate || s.poDate);
      items = DateFilter.apply(items, s => s.countDate);
      entries = DateFilter.apply(entries, s => s.receiveDate);
      filteredManual = DateFilter.apply(manualWork, m => m.date);
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
    const totalWork = (stores ? stores.length : 0) + (items ? items.length : 0) + (entries ? entries.length : 0) + filteredManual.length;
    const unitsHandled = (stores ? stores.reduce((a, s) => a + (s.sentQty || 0), 0) : 0) +
      (items ? items.reduce((a, s) => a + (s.physicalQty || 0), 0) : 0) +
      (entries ? entries.reduce((a, e) => a + (e.receivedQty || 0), 0) : 0) +
      filteredManual.reduce((a, m) => a + (m.qty || 0), 0);
    fill("metaDaily", `${totalWork} work items · ${fmtInt(unitsHandled)} units handled`);

    // Footer date
    const footerDate = document.getElementById("footerDate");
    if (footerDate) {
      footerDate.innerText = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
    }

    renderCharts(stores, items, entries);
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
