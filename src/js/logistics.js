// B2B & B2C Daily Logistics & Order Dispatch Report
(function () {
  const STORAGE_KEY = "logistics_dispatch_v3";
  const SHORT_STORAGE_KEY = "logistics_short_sku_v3";

  // ---- Configuration ----
  const CONFIG_KEY = "logistics_config_v1";

  const DEFAULT_LOCATIONS = ["Kundli", "Farukh Nagar SR", "Dasna D3", "Noida N1", "Lucknow L5", "Sanpka", "Rajpura R2"];

  const DEFAULT_CHANNELS = [
    { name: "Blinkit", type: "B2B", rate: 65 },
    { name: "FK Consignment", type: "B2B", rate: 75 },
    { name: "Zomato Instant", type: "B2B", rate: 55 },
    { name: "Delhivery B2C", type: "B2C", rate: 145 },
    { name: "DTDC B2C", type: "B2C", rate: 155 },
    { name: "Blue Dart B2C", type: "B2C", rate: 175 },
    { name: "Ekart B2C", type: "B2C", rate: 135 }
  ];

  // Report scope — logistics.html forces B2B-only, dispatch-summary.html B2C-only,
  // via window.MIS_REPORT. Defaults to ALL when not set.
  const SCOPE = (window.MIS_REPORT && window.MIS_REPORT.scope) || "ALL";

  // B2C report uses Order terminology; B2B uses PO terminology.
  const PO_LABEL = SCOPE === "B2C" ? "Order" : "PO";

  let LOCATIONS = [];
  let LOC_CODE = {};
  let CHANNELS = [];

  function buildLocCodes(locations) {
    const codes = {};
    const used = new Set();
    locations.forEach(l => {
      const base = (l.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3) || "XXX");
      let code = base;
      let i = 1;
      while (used.has(code)) code = base + String(i++);
      used.add(code);
      codes[l] = code;
    });
    return codes;
  }

  function loadConfig() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(CONFIG_KEY)); } catch (e) { /* ignore */ }
    LOCATIONS = Array.isArray(stored && stored.locations) && stored.locations.length
      ? stored.locations.slice()
      : DEFAULT_LOCATIONS.slice();
    CHANNELS = Array.isArray(stored && stored.channels) && stored.channels.length
      ? stored.channels.map(c => ({ ...c }))
      : DEFAULT_CHANNELS.map(c => ({ ...c }));
    LOC_CODE = buildLocCodes(LOCATIONS);
  }

  function saveConfig() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ locations: LOCATIONS, channels: CHANNELS }));
    } catch (e) { /* ignore */ }
    if (window.DataService) {
      DataService.push("LOGISTICS_CONFIG", [{ id: "logistics-config-v1", locations: LOCATIONS, channels: CHANNELS }]);
    }
  }

  async function syncFromCloud() {
    if (!window.DataService || !DataService.ready) return;
    const [merged, shortMerged] = await Promise.all([
      DataService.syncTable("LOGISTICS_DISPATCH", state.rows),
      DataService.syncTable("LOGISTICS_SHORT_SKU", state.shortRows)
    ]);
    let changed = false;
    if (Array.isArray(merged) && merged.length) {
      state.rows = merged.map(normalizeRow).sort((a, b) => a.dispatchDate.localeCompare(b.dispatchDate));
      changed = true;
    }
    if (Array.isArray(shortMerged) && shortMerged.length) {
      state.shortRows = shortMerged.map(normalizeShortRow);
      changed = true;
    }
    if (changed) {
      saveState();
      saveShortState();
      renderDashboard();
    }
  }

  loadConfig();

  function activeChannels() {
    return SCOPE === "B2B" ? CHANNELS.filter(c => c.type === "B2B")
      : SCOPE === "B2C" ? CHANNELS.filter(c => c.type === "B2C")
      : CHANNELS;
  }

  function activeChannelNames() {
    return new Set(activeChannels().map(c => c.name));
  }

  function rateFor(channel) {
    const c = CHANNELS.find(x => x.name === channel);
    return c ? (Number(c.rate) || 0) : 0;
  }

  function defaultChannel() {
    if (SCOPE === "B2C") return activeChannels()[0].name;
    const b2b = activeChannels().find(c => c.name === "FK Consignment");
    return (b2b && b2b.name) || (activeChannels()[0] && activeChannels()[0].name) || CHANNELS[0].name;
  }

  const PALETTE = [
    "#3b82f6", "#f97316", "#2dd4bf", "#ef4444", "#a855f7", "#eab308",
    "#22c55e", "#ec4899", "#06b6d4", "#fb923c", "#8b5cf6", "#f43f5e"
  ];

  const state = {
    rows: [],
    shortRows: [],
    theme: localStorage.getItem("warehouse_dashboard_theme") || "dark",
    view: "all",
    sortKey: "dispatchDate",
    sortDir: "desc",
    locFilter: "all",
    channelFilter: "all",
    filterStatus: "all",
    editingId: null,
    shortSortKey: "dispatchDate",
    shortSortDir: "desc",
    shortLocFilter: "all",
    shortChannelFilter: "all",
    shortEditingId: null,
    chartType: "bar",
    chartMetric: "fulfillRate"
  };

  const chartInstances = {};

  // ---- SVG icons ----
  const SVG_ICONS = {
    edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    view: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>`,
    sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
    moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`
  };

  // ---- Date helpers ----
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function fmtDateDDMMMYY(iso) {
    if (!iso) return "-";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${d.padStart(2, "0")}-${MONTHS[parseInt(m, 10) - 1]}-${String(y).slice(2)}`;
  }

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDaysIso(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---- Number helpers ----
  const round2 = n => Math.round(n * 100) / 100;

  function fmtInt(n) {
    return (n || 0).toLocaleString("en-IN");
  }

  function fmtMoney(n) {
    return `₹${(Math.round(n || 0)).toLocaleString("en-IN")}`;
  }

  function fulfillRate(r) {
    return r.poQty > 0 ? round2((r.dispatchQty / r.poQty) * 100) : 0;
  }

  // ---- Row helpers ----
  function fulfillStatus(r) {
    const rate = r.fulfillRate ?? fulfillRate(r);
    return rate >= 90 ? "ON TRACK" : rate >= 60 ? "PARTIAL" : "CRITICAL";
  }

  function statusClass(s) {
    return s === "ON TRACK" ? "badge-green" : s === "PARTIAL" ? "badge-orange" : "badge-red";
  }

  function genPoNumber(date, location) {
    const prefix = LOC_CODE[location] || "XX";
    const count = state.rows.filter(r => r.location === location && r.dispatchDate === date).length + 1;
    return `PO-${prefix}-${String(count).padStart(4, "0")}`;
  }

  function normalizeRow(r) {
    const rate = rateFor(r.channel);
    r.poQty = r.poQty || 0;
    r.dispatchQty = r.dispatchQty || 0;
    r.poValue = Math.round(r.poQty * rate);
    r.invoiceValue = Math.round(r.dispatchQty * rate);
    r.fulfillRate = fulfillRate(r);
    if (!r.poNumber) r.poNumber = genPoNumber(r.dispatchDate, r.location);
    return r;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
    } catch (e) { /* ignore */ }
    if (window.DataService && state.rows && state.rows.length) {
      DataService.push("LOGISTICS_DISPATCH", state.rows);
    }
  }

  // ---- Sample data baseline ----
  // [dispatchDate, location, channel, poQty, dispatchQty, deliveryOffsetDays]
  function loadRows() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeRow);
        }
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  // ---- Short SKUs (B2B & B2C short-shipment detail) ----
  function genShortPoNumber(date, location) {
    const prefix = LOC_CODE[location] || "XX";
    const count = state.shortRows.filter(r => r.location === location && r.dispatchDate === date).length + 1;
    return `PO-${prefix}-${String(count).padStart(4, "0")}`;
  }

  function normalizeShortRow(r) {
    r.shortQty = r.shortQty || 0;
    const raw = r.invoiceValue;
    if (raw === undefined || raw === null || raw === "" || isNaN(Number(raw))) {
      r.invoiceValue = Math.round(r.shortQty * rateFor(r.channel));
    } else {
      r.invoiceValue = Math.round(Number(raw));
    }
    if (!r.poNumber) r.poNumber = genShortPoNumber(r.dispatchDate, r.location);
    r.notes = r.notes || "-";
    return r;
  }

  function saveShortState() {
    try {
      localStorage.setItem(SHORT_STORAGE_KEY, JSON.stringify(state.shortRows));
    } catch (e) { /* ignore */ }
    if (window.DataService && state.shortRows && state.shortRows.length) {
      DataService.push("LOGISTICS_SHORT_SKU", state.shortRows);
    }
  }

  function loadShortRows() {
    try {
      const raw = localStorage.getItem(SHORT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeShortRow);
        }
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  // ---- Theme ----
  function updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (icon) {
      icon.innerHTML = state.theme === "dark" ? SVG_ICONS.sun : SVG_ICONS.moon;
      icon.setAttribute("stroke", state.theme === "dark" ? "#f59e0b" : "#1e293b");
    }
  }

  function isDark() {
    return state.theme === "dark";
  }

  function chartColors() {
    const dark = isDark();
    return {
      dark,
      grid: dark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
      text: dark ? "#9ca3af" : "#475569",
      value: dark ? "#e5e7eb" : "#0f172a"
    };
  }

  // ---- Data scoping ----
  function scopeRows(rows) {
    if (SCOPE !== "ALL") return rows.filter(r => activeChannelNames().has(r.channel));
    return rows;
  }

  function viewRows(rows) {
    if (SCOPE !== "ALL") return scopeRows(rows);
    if (state.view === "all") return rows;
    const types = new Set(CHANNELS.filter(c => c.type === state.view).map(c => c.name));
    return rows.filter(r => types.has(r.channel));
  }

  function filteredRows(rows) {
    return rows.filter(r =>
      (state.locFilter === "all" || r.location === state.locFilter) &&
      (state.channelFilter === "all" || r.channel === state.channelFilter) &&
      (state.filterStatus === "all" || fulfillStatus(r) === state.filterStatus)
    );
  }

  function getSortValue(r, key) {
    switch (key) {
      case "dispatchDate": return r.dispatchDate;
      case "deliveryDate": return r.deliveryDate;
      case "poQty": return r.poQty;
      case "dispatchQty": return r.dispatchQty;
      case "poValue": return r.poValue;
      case "invoiceValue": return r.invoiceValue;
      case "fulfillRate": return r.fulfillRate;
      default: return String(r[key] || "").toLowerCase();
    }
  }

  // ---- KPI rendering ----
  function renderKPIs(rows) {
    const totalPO = rows.reduce((a, r) => a + r.poQty, 0);
    const totalDispatch = rows.reduce((a, r) => a + r.dispatchQty, 0);
    const totalPOValue = rows.reduce((a, r) => a + r.poValue, 0);
    const totalInvoiceValue = rows.reduce((a, r) => a + r.invoiceValue, 0);
    const rate = totalPO > 0 ? (totalDispatch / totalPO) * 100 : 0;

    const el = id => document.getElementById(id);
    el("valTotalPO").innerText = fmtInt(totalPO);
    el("subTotalPO").innerText = `${fmtInt(rows.length)} ${PO_LABEL} Lines`;
    el("valTotalDispatch").innerText = fmtInt(totalDispatch);
    el("subTotalDispatch").innerText = "Units Shipped Out";
    el("valFulfillRate").innerText = `${rate.toFixed(2)}%`;
    el("subFulfillRate").innerText = `${fmtInt(totalDispatch)} / ${fmtInt(totalPO)} Units`;
    el("valInvoiceValue").innerText = fmtMoney(totalInvoiceValue);
    el("subInvoiceValue").innerText = `PO Value ${fmtMoney(totalPOValue)}`;
    el("valRevenueGap").innerText = fmtMoney(totalPOValue - totalInvoiceValue);
    el("subRevenueGap").innerText = `${fmtInt(totalPO - totalDispatch)} Units Short`;

    const kpi = document.getElementById("kpiFulfillRate");
    if (kpi) {
      kpi.classList.remove("variant-green", "variant-red");
      kpi.classList.add(rate >= 90 ? "variant-green" : "variant-red");
    }
    const gapKpi = document.getElementById("kpiRevenueGap");
    if (gapKpi) {
      gapKpi.classList.remove("variant-red", "variant-green");
      gapKpi.classList.add((totalPOValue - totalInvoiceValue) > 0 ? "variant-red" : "variant-green");
    }

    const sortedDates = rows.map(r => r.dispatchDate).filter(Boolean).sort();
    const headerDate = document.getElementById("headerDispatchDate");
    if (headerDate) {
      headerDate.innerText = sortedDates.length
        ? `${fmtDateDDMMMYY(sortedDates[0])} - ${fmtDateDDMMMYY(sortedDates[sortedDates.length - 1])}`
        : "-";
    }
    const headerSnap = document.getElementById("headerSnapshot");
    if (headerSnap) {
      headerSnap.innerText = state.view === "all" ? "All Channels" : `${state.view} View`;
    }
  }

  // ---- Chart building ----
  function destroyCharts() {
    Object.values(chartInstances).forEach(c => { if (c) c.destroy(); });
    Object.keys(chartInstances).forEach(k => delete chartInstances[k]);
  }

  function buildChart(canvasId, type, data, options) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(el.getContext("2d"), { type, data, options });
  }

  const METRIC_LABELS = {
    fulfillRate: "Fulfill Rate %",
    poQty: `${PO_LABEL} Qty`,
    dispatchQty: "Dispatch Qty",
    poValue: "PO Value",
    invoiceValue: "Invoice Value"
  };

  const METRIC_FIELD = {
    poQty: "po",
    dispatchQty: "d",
    poValue: "poVal",
    invoiceValue: "invVal"
  };

  function renderLocationChart(locMap, c) {
    const metric = state.chartMetric || "fulfillRate";
    const type = state.chartType || "bar";

    let locLabels, locData, locColors;
    if (metric === "fulfillRate") {
      locLabels = Object.keys(locMap).sort((a, b) => {
        const ra = locMap[a].po > 0 ? locMap[a].d / locMap[a].po * 100 : 0;
        const rb = locMap[b].po > 0 ? locMap[b].d / locMap[b].po * 100 : 0;
        return ra - rb;
      });
      locData = locLabels.map(l => round2(locMap[l].po > 0 ? locMap[l].d / locMap[l].po * 100 : 0));
      locColors = locData.map(r => r >= 90 ? "#22c55e" : r >= 60 ? "#fbbf24" : "#f87171");
    } else {
      const field = METRIC_FIELD[metric] || "po";
      locLabels = Object.keys(locMap).sort((a, b) => locMap[b][field] - locMap[a][field]);
      locData = locLabels.map(l => locMap[l][field]);
      locColors = "#3b82f6";
    }

    const title = document.getElementById("locationChartTitle");
    if (title) title.innerText = `Performance by Location \u2014 ${METRIC_LABELS[metric]}`;

    const singleSeries = ["pie", "doughnut", "polarArea"].includes(type);
    const isHorizontal = type === "horizontalBar";
    const isLine = type === "line";
    const isCartesian = ["bar", "horizontalBar", "line"].includes(type);
    const effectiveType = isLine ? "line" : (isHorizontal ? "bar" : type);

    let datasets;
    if (singleSeries) {
      datasets = [{
        label: METRIC_LABELS[metric],
        data: locData,
        backgroundColor: locLabels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: isDark() ? "#111827" : "#ffffff",
        borderWidth: 1
      }];
    } else if (isLine) {
      datasets = [{
        label: METRIC_LABELS[metric],
        data: locData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.3
      }];
    } else {
      datasets = [{
        label: METRIC_LABELS[metric],
        data: locData,
        backgroundColor: Array.isArray(locColors) ? locColors : locColors,
        borderColor: "#0f172a",
        borderWidth: 1,
        borderRadius: 4
      }];
    }

    const fmt = v => metric === "fulfillRate"
      ? `${Number(v).toFixed(1)}%`
      : (metric === "poValue" || metric === "invoiceValue") ? fmtMoney(v) : fmtInt(v);

    const scales = isCartesian ? {
      x: {
        grid: { display: false },
        ticks: {
          color: c.text,
          font: { family: "Inter" },
          maxRotation: isHorizontal ? 0 : 45,
          minRotation: isHorizontal ? 0 : 30
        }
      },
      y: {
        grid: { color: c.grid },
        ticks: {
          color: c.text,
          font: { family: "Inter" },
          callback: metric === "fulfillRate" ? v => `${v}%` : v => fmtInt(v)
        },
        ...(metric === "fulfillRate" ? { max: 100, min: 0 } : {})
      }
    } : undefined;

    buildChart("locationChart", effectiveType, {
      labels: locLabels,
      datasets
    }, {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? "y" : "x",
      cutout: type === "doughnut" ? "55%" : undefined,
      plugins: {
        legend: { position: singleSeries ? "right" : "top", labels: { color: c.text, font: { family: "Inter" }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.parsed.y ?? ctx.parsed)}` } },
        datalabels: {
          color: singleSeries ? "#ffffff" : c.value,
          font: { family: "Inter", weight: "bold", size: 10 },
          anchor: singleSeries ? "center" : "end",
          align: singleSeries ? "center" : (isLine ? "top" : "end"),
          formatter: fmt
        }
      },
      scales
    });
  }

  function renderCharts(rows) {
    destroyCharts();
    const c = chartColors();

    const locMap = {};
    rows.forEach(r => {
      if (!locMap[r.location]) locMap[r.location] = { po: 0, d: 0, poVal: 0, invVal: 0 };
      locMap[r.location].po += r.poQty;
      locMap[r.location].d += r.dispatchQty;
      locMap[r.location].poVal += r.poValue;
      locMap[r.location].invVal += r.invoiceValue;
    });

    // 1. Performance by Location (interactive — type & metric driven)
    renderLocationChart(locMap, c);

    // 2. Order Channel Share (Donut) — dispatched volume by channel
    const chanMap = {};
    rows.forEach(r => { chanMap[r.channel] = (chanMap[r.channel] || 0) + r.dispatchQty; });
    const chanEntries = Object.entries(chanMap).sort((a, b) => b[1] - a[1]);
    const chanTotal = chanEntries.reduce((a, e) => a + e[1], 0);
    buildChart("channelChart", "doughnut", {
      labels: chanEntries.map(e => e[0]),
      datasets: [{
        label: "Dispatched Qty",
        data: chanEntries.map(e => e[1]),
        backgroundColor: chanEntries.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: isDark() ? "#111827" : "#ffffff",
        borderWidth: 2
      }]
    }, {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: { position: "bottom", labels: { color: c.text, font: { family: "Inter" }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmtInt(ctx.parsed)} units` } },
        datalabels: { color: "#ffffff", font: { family: "Inter", weight: "bold", size: 11 }, anchor: "center", align: "center", formatter: v => chanTotal > 0 ? `${((v / chanTotal) * 100).toFixed(1)}%` : "0%" }
      }
    });

    // 3. Value Variance Analysis (Combo) — PO vs Invoice + Fulfill % line
    const locs = Object.keys(locMap);
    const locRate = locs.map(l => round2(locMap[l].po > 0 ? locMap[l].d / locMap[l].po * 100 : 0));
    buildChart("valueChart", "bar", {
      labels: locs,
      datasets: [
        { type: "bar", label: "PO Value", data: locs.map(l => locMap[l].poVal), backgroundColor: "rgba(59, 130, 246, 0.8)", borderColor: "#3b82f6", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
        { type: "bar", label: "Invoice Value", data: locs.map(l => locMap[l].invVal), backgroundColor: "rgba(249, 115, 22, 0.8)", borderColor: "#f97316", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
        { type: "line", label: "Fulfill Rate %", data: locRate, borderColor: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.15)", pointRadius: 3, borderWidth: 2, tension: 0.3, yAxisID: "y1" }
      ]
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { color: c.text, font: { family: "Inter" }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label === "Fulfill Rate %" ? `${ctx.parsed.y.toFixed(2)}%` : `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}` } },
        datalabels: { color: c.value, font: { family: "Inter", size: 8 }, anchor: "end", align: "end", formatter: (v, ctx) => ctx.dataset.label === "Fulfill Rate %" ? `${v.toFixed(0)}%` : (ctx.datasetIndex === 0 ? fmtInt(v) : "") }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, font: { family: "Inter" } } },
        y: { position: "left", grid: { color: c.grid }, ticks: { color: c.text, font: { family: "Inter" }, callback: v => `₹${(v / 1000).toFixed(0)}k` } },
        y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#22c55e", font: { family: "Inter" }, callback: v => `${v}%` }, max: 100, min: 0 }
      }
    });

    // 4. Delivery Schedule Timeline (Stacked Bar) — by delivery date, stacked by channel
    const delMap = {};
    const delChanSet = {};
    rows.forEach(r => {
      if (!delMap[r.deliveryDate]) delMap[r.deliveryDate] = {};
      delMap[r.deliveryDate][r.channel] = (delMap[r.deliveryDate][r.channel] || 0) + r.dispatchQty;
      delChanSet[r.channel] = true;
    });
    const delLabels = Object.keys(delMap).sort();
    const delChannels = Object.keys(delChanSet).sort();
    buildChart("deliveryChart", "bar", {
      labels: delLabels.map(d => fmtDateDDMMMYY(d)),
      datasets: delChannels.map((ch, i) => ({
        label: ch,
        data: delLabels.map(d => delMap[d][ch] || 0),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderColor: "#0f172a",
        borderWidth: 1,
        borderRadius: 2
      }))
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { color: c.text, font: { family: "Inter" }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)} units` } },
        datalabels: { color: c.value, font: { family: "Inter", size: 8 }, anchor: "end", align: "end", formatter: v => (v > 0 ? fmtInt(v) : "") }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: c.text, font: { family: "Inter" } } },
        y: { stacked: true, grid: { color: c.grid }, ticks: { color: c.text, font: { family: "Inter" } } }
      }
    });
  }

  // ---- Grid rendering ----
  function fulfillClass(rate) {
    return rate >= 90 ? "fulfill-good" : rate >= 60 ? "fulfill-warn" : "fulfill-bad";
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function renderGrid(rows) {
    const tbody = document.getElementById("logisticsTableBody");
    const filtered = filteredRows(rows);

    document.getElementById("recordCount").innerText = `${filtered.length} of ${rows.length} records`;

    const sorted = [...filtered].sort((a, b) => {
      const av = getSortValue(a, state.sortKey);
      const bv = getSortValue(b, state.sortKey);
      if (typeof av === "number" && typeof bv === "number") {
        return state.sortDir === "asc" ? av - bv : bv - av;
      }
      return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    tbody.innerHTML = "";
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: var(--text-muted); padding:32px;">${rows.length === 0 ? 'No dispatch records found. Click "Add Dispatch" to create one.' : "No transactions match the current filters."}</td></tr>`;
      return;
    }

    sorted.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateDDMMMYY(r.dispatchDate)}</td>
        <td>${escapeHtml(r.channel)}</td>
        <td>${escapeHtml(r.location)}</td>
        <td>${escapeHtml(r.poNumber)}</td>
        <td>${fmtInt(r.poQty)}</td>
        <td>${fmtInt(r.dispatchQty)}</td>
        <td>${fmtMoney(r.poValue)}</td>
        <td>${fmtMoney(r.invoiceValue)}</td>
        <td>${fmtDateDDMMMYY(r.deliveryDate)}</td>
        <td><span class="badge ${statusClass(fulfillStatus(r))}" style="margin-right:4px;">${fulfillStatus(r)}</span><span class="${fulfillClass(r.fulfillRate)}">${r.fulfillRate.toFixed(2)}%</span></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-icon" onclick="editDispatch('${r.id}')" title="Edit">${SVG_ICONS.edit}</button>
          <button class="btn btn-danger btn-icon" onclick="deleteDispatch('${r.id}')" title="Delete">${SVG_ICONS.delete}</button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Render Summary Row
    const sumPO = filtered.reduce((a, r) => a + r.poQty, 0);
    const sumDisp = filtered.reduce((a, r) => a + r.dispatchQty, 0);
    const sumPoVal = filtered.reduce((a, r) => a + r.poValue, 0);
    const sumInvVal = filtered.reduce((a, r) => a + r.invoiceValue, 0);
    const avgRate = sumPO > 0 ? round2((sumDisp / sumPO) * 100) : 0;

    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${filtered.length} Lines)</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td>${fmtInt(sumPO)}</td>
      <td>${fmtInt(sumDisp)}</td>
      <td>${fmtMoney(sumPoVal)}</td>
      <td>${fmtMoney(sumInvVal)}</td>
      <td>-</td>
      <td><span class="badge ${statusClass(avgRate >= 90 ? "ON TRACK" : avgRate >= 60 ? "PARTIAL" : "CRITICAL")}">${avgRate.toFixed(2)}%</span></td>
      <td class="table-actions"></td>`;
    tbody.appendChild(summaryTr);
  }

  // ---- Daily Order Status by Sales Channel (B2C scope) ----
  function slugify(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function orderStatusCounts(rows) {
    const map = {};
    rows.forEach(r => {
      if (!map[r.channel]) map[r.channel] = { newOrders: 0, dispatched: 0, pending: 0, cancelled: 0, po: 0, disp: 0 };
      map[r.channel].newOrders += 1;
      map[r.channel].po += Number(r.poQty) || 0;
      map[r.channel].disp += Number(r.dispatchQty) || 0;
      const d = Number(r.dispatchQty) || 0;
      const p = Number(r.poQty) || 0;
      if (d === 0) map[r.channel].cancelled += 1;
      else if (d >= p) map[r.channel].dispatched += 1;
      else map[r.channel].pending += 1;
    });
    return map;
  }

  function channelFulfillRate(c) {
    return c.po > 0 ? (c.disp / c.po) * 100 : 0;
  }

  function renderChannelSummaryGrid(rows) {
    const tbody = document.getElementById("logisticsTableBody");
    const filtered = filteredRows(rows);
    const map = orderStatusCounts(filtered);
    const channels = Object.keys(map).sort((a, b) => map[b].newOrders - map[a].newOrders);
    const totalChannels = new Set(rows.map(r => r.channel)).size;

    document.getElementById("recordCount").innerText = `${channels.length} of ${totalChannels} channels`;

    tbody.innerHTML = "";
    if (channels.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:32px;">${rows.length === 0 ? 'No dispatch records found. Click "Add Dispatch" to create one.' : "No transactions match the current filters."}</td></tr>`;
      return;
    }

    channels.forEach(ch => {
      const c = map[ch];
      const slug = slugify(ch);
      const rate = channelFulfillRate(c);
      const lines = filtered.filter(r => r.channel === ch);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(ch)}</strong></td>
        <td>${fmtInt(c.newOrders)}</td>
        <td class="fulfill-good">${fmtInt(c.dispatched)}</td>
        <td class="fulfill-warn">${fmtInt(c.pending)}</td>
        <td class="fulfill-bad">${fmtInt(c.cancelled)}</td>
        <td><span class="badge ${statusClass(fulfillStatusOf(rate))}" style="margin-right:4px;">${fulfillStatusOf(rate)}</span><span class="${fulfillClass(rate)}">${rate.toFixed(2)}%</span></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-icon" onclick="toggleChannelDetail('${slug}', this)" title="View lines" aria-expanded="false">${SVG_ICONS.view}</button>
        </td>`;
      tbody.appendChild(tr);

      const detailTr = document.createElement("tr");
      detailTr.id = `detail-${slug}`;
      detailTr.className = "channel-detail-row";
      detailTr.style.display = "none";
      detailTr.innerHTML = `<td colspan="7"><div class="channel-detail">
        <div class="channel-detail-header"><strong>${escapeHtml(ch)}</strong> — Dispatch Lines</div>
        <div class="table-responsive">
        <table class="data-table detail-table">
          <thead><tr>
            <th>Dispatch Date</th><th>Channel</th><th>Location</th><th>${PO_LABEL} Number</th>
            <th>${PO_LABEL} Qty</th><th>Dispatch Qty</th><th>PO Value</th><th>Invoice Value</th>
            <th>Delivery Date</th><th>Fulfill Rate in %</th><th class="table-actions-header">Actions</th>
          </tr></thead>
          <tbody>${lines.sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate)).map(r => `
            <tr>
              <td>${fmtDateDDMMMYY(r.dispatchDate)}</td>
              <td>${escapeHtml(r.channel)}</td>
              <td>${escapeHtml(r.location)}</td>
              <td>${escapeHtml(r.poNumber)}</td>
              <td>${fmtInt(r.poQty)}</td>
              <td>${fmtInt(r.dispatchQty)}</td>
              <td>${fmtMoney(r.poValue)}</td>
              <td>${fmtMoney(r.invoiceValue)}</td>
              <td>${fmtDateDDMMMYY(r.deliveryDate)}</td>
              <td><span class="badge ${statusClass(fulfillStatus(r))}" style="margin-right:4px;">${fulfillStatus(r)}</span><span class="${fulfillClass(r.fulfillRate)}">${r.fulfillRate.toFixed(2)}%</span></td>
              <td class="table-actions">
                <button class="btn btn-secondary btn-icon" onclick="editDispatch('${r.id}')" title="Edit">${SVG_ICONS.edit}</button>
                <button class="btn btn-danger btn-icon" onclick="deleteDispatch('${r.id}')" title="Delete">${SVG_ICONS.delete}</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
        </div>
      </div></td>`;
      tbody.appendChild(detailTr);
    });

    const totals = { newOrders: 0, dispatched: 0, pending: 0, cancelled: 0, po: 0, disp: 0 };
    channels.forEach(ch => {
      totals.newOrders += map[ch].newOrders;
      totals.dispatched += map[ch].dispatched;
      totals.pending += map[ch].pending;
      totals.cancelled += map[ch].cancelled;
      totals.po += map[ch].po;
      totals.disp += map[ch].disp;
    });
    const totalRate = totals.po > 0 ? (totals.disp / totals.po) * 100 : 0;

    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${channels.length} Channels)</td>
      <td><strong>${fmtInt(totals.newOrders)}</strong></td>
      <td><strong>${fmtInt(totals.dispatched)}</strong></td>
      <td><strong>${fmtInt(totals.pending)}</strong></td>
      <td><strong>${fmtInt(totals.cancelled)}</strong></td>
      <td><span class="badge ${statusClass(fulfillStatusOf(totalRate))}" style="margin-right:4px;">${fulfillStatusOf(totalRate)}</span><span class="${fulfillClass(totalRate)}">${totalRate.toFixed(2)}%</span></td>
      <td class="table-actions"></td>`;
    tbody.appendChild(summaryTr);
  }

  function fulfillStatusOf(rate) {
    return rate >= 90 ? "ON TRACK" : rate >= 60 ? "PARTIAL" : "CRITICAL";
  }

  window.toggleChannelDetail = function (slug, btn) {
    const row = document.getElementById(`detail-${slug}`);
    if (!row) return;
    const open = row.style.display !== "none";
    row.style.display = open ? "none" : "";
    if (btn) btn.setAttribute("aria-expanded", String(!open));
  };

  // ---- Edit / Delete callbacks ----
  window.editDispatch = function (id) {
    const row = state.rows.find(r => r.id === id);
    if (!row) return;

    state.editingId = id;
    document.getElementById("dialogTitle").innerText = "Edit Dispatch Record";
    document.getElementById("formRowId").value = row.id;
    document.getElementById("channel").value = row.channel;
    document.getElementById("location").value = row.location;
    document.getElementById("poNumber").value = row.poNumber || "";
    document.getElementById("dispatchDate").value = row.dispatchDate;
    document.getElementById("deliveryDate").value = row.deliveryDate || addDaysIso(row.dispatchDate, 1);
    document.getElementById("poQty").value = row.poQty;
    document.getElementById("dispatchQty").value = row.dispatchQty;
    document.getElementById("notes").value = row.notes === "-" ? "" : (row.notes || "");

    document.getElementById("dispatchDialog").showModal();
  };

  window.deleteDispatch = function (id) {
    if (confirm("Are you sure you want to delete this dispatch record?")) {
      state.rows = state.rows.filter(r => r.id !== id);
      saveState();
      renderDashboard();
    }
  };

  // ---- Short SKU grid ----
  function shortFilteredRows(rows) {
    return rows.filter(r =>
      (state.shortLocFilter === "all" || r.location === state.shortLocFilter) &&
      (state.shortChannelFilter === "all" || r.channel === state.shortChannelFilter)
    );
  }

  function renderShortGrid(rows) {
    const tbody = document.getElementById("shortSkuTableBody");
    const filtered = shortFilteredRows(rows);

    document.getElementById("shortRecordCount").innerText = `${filtered.length} of ${rows.length} records`;

    const sorted = [...filtered].sort((a, b) => {
      const av = getSortValue(a, state.shortSortKey);
      const bv = getSortValue(b, state.shortSortKey);
      if (typeof av === "number" && typeof bv === "number") {
        return state.shortSortDir === "asc" ? av - bv : bv - av;
      }
      return state.shortSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    tbody.innerHTML = "";
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding:32px;">${rows.length === 0 ? 'No short SKU records found. Click "Add Short SKU" to create one.' : "No short SKU records match the current filters."}</td></tr>`;
      return;
    }

    sorted.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateDDMMMYY(r.dispatchDate)}</td>
        <td>${escapeHtml(r.channel)}</td>
        <td>${escapeHtml(r.location)}</td>
        <td>${escapeHtml(r.poNumber)}</td>
        <td><span class="fulfill-bad">${fmtInt(r.shortQty)}</span></td>
        <td>${fmtMoney(r.invoiceValue)}</td>
        <td>${escapeHtml(r.notes)}</td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-icon" onclick="editShortSku('${r.id}')" title="Edit">${SVG_ICONS.edit}</button>
          <button class="btn btn-danger btn-icon" onclick="deleteShortSku('${r.id}')" title="Delete">${SVG_ICONS.delete}</button>
        </td>`;
      tbody.appendChild(tr);
    });

    const sumShort = filtered.reduce((a, r) => a + r.shortQty, 0);
    const sumInv = filtered.reduce((a, r) => a + r.invoiceValue, 0);
    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${filtered.length} Lines)</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td><strong>${fmtInt(sumShort)}</strong></td>
      <td><strong>${fmtMoney(sumInv)}</strong></td>
      <td>-</td>
      <td class="table-actions"></td>`;
    tbody.appendChild(summaryTr);
  }

  window.editShortSku = function (id) {
    const row = state.shortRows.find(r => r.id === id);
    if (!row) return;

    state.shortEditingId = id;
    document.getElementById("shortSkuDialogTitle").innerText = "Edit Short SKU Record";
    document.getElementById("shortSkuFormRowId").value = row.id;
    document.getElementById("shortChannel").value = row.channel;
    document.getElementById("shortLocation").value = row.location;
    document.getElementById("shortPoNumber").value = row.poNumber || "";
    document.getElementById("shortDispatchDate").value = row.dispatchDate;
    document.getElementById("shortSkuQty").value = row.shortQty;
    document.getElementById("shortInvoiceValue").value = row.invoiceValue;
    document.getElementById("shortNotes").value = row.notes === "-" ? "" : (row.notes || "");

    document.getElementById("shortSkuDialog").showModal();
  };

  window.deleteShortSku = function (id) {
    if (confirm("Are you sure you want to delete this short SKU record?")) {
      state.shortRows = state.shortRows.filter(r => r.id !== id);
      saveShortState();
      renderDashboard();
    }
  };

  function openAddShortSkuDialog() {
    state.shortEditingId = null;
    document.getElementById("shortSkuDialogTitle").innerText = "Add Short SKU Record";
    const form = document.getElementById("shortSkuForm");
    form.reset();
    document.getElementById("shortSkuFormRowId").value = "";
    document.getElementById("shortChannel").value = defaultChannel();
    document.getElementById("shortLocation").value = "Kundli";
    document.getElementById("shortDispatchDate").value = todayIso();
    document.getElementById("shortInvoiceValue").value = "";
    document.getElementById("shortSkuDialog").showModal();
  }

  function handleShortSkuFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("shortSkuFormRowId").value;
    const channel = document.getElementById("shortChannel").value;
    const location = document.getElementById("shortLocation").value;
    const dispatchDate = document.getElementById("shortDispatchDate").value;
    const shortQty = parseInt(document.getElementById("shortSkuQty").value, 10) || 0;
    const invoiceRaw = document.getElementById("shortInvoiceValue").value;
    const notes = document.getElementById("shortNotes").value || "-";
    let poNumber = document.getElementById("shortPoNumber").value.trim();

    if (!poNumber) poNumber = genShortPoNumber(dispatchDate, location);

    const row = normalizeShortRow({
      channel,
      location,
      dispatchDate,
      shortQty,
      invoiceValue: invoiceRaw === "" ? undefined : Number(invoiceRaw),
      notes,
      poNumber
    });

    if (id) {
      const idx = state.shortRows.findIndex(r => r.id === id);
      if (idx !== -1) state.shortRows[idx] = { ...state.shortRows[idx], ...row, id };
    } else {
      row.id = "short-" + Date.now();
      state.shortRows.push(row);
    }

    saveShortState();
    document.getElementById("shortSkuDialog").close();
    renderDashboard();
  }

  // ---- Export ----
  function exportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.rows, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `logistics_dispatch_report_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportRows(rows) {
    const filtered = filteredRows(rows);
    const stamp = new Date().toISOString().split("T")[0];
    let headers, data, sheet;

    if (SCOPE === "B2C") {
      headers = ["Sales Channel", "New Orders", "Dispatched Orders", "Pending Orders", "Cancelled Orders", "Fulfill Rate in %"];
      const map = orderStatusCounts(filtered);
      data = Object.keys(map).sort((a, b) => map[b].newOrders - map[a].newOrders).map(ch => [
        ch,
        map[ch].newOrders,
        map[ch].dispatched,
        map[ch].pending,
        map[ch].cancelled,
        `${channelFulfillRate(map[ch]).toFixed(2)}%`
      ]);
      const totals = data.reduce((acc, row) => {
        acc[1] += row[1];
        acc[2] += row[2];
        acc[3] += row[3];
        acc[4] += row[4];
        return acc;
      }, [0, 0, 0, 0, 0]);
      totals[0] = "Total Summary";
      const totalPo = filtered.reduce((a, r) => a + (Number(r.poQty) || 0), 0);
      const totalDisp = filtered.reduce((a, r) => a + (Number(r.dispatchQty) || 0), 0);
      totals[5] = totalPo > 0 ? `${((totalDisp / totalPo) * 100).toFixed(2)}%` : "0.00%";
      data.push(totals);
      sheet = "Order Status by Channel";
    } else {
      headers = ["Dispatch Date", "Channel", "Location", `${PO_LABEL} Number`, `${PO_LABEL} Qty`, "Dispatch Qty", "PO Value", "Invoice Value", "Delivery Date", "Fulfill Rate in %"];
      data = filtered.map(r => [
        fmtDateDDMMMYY(r.dispatchDate),
        r.channel,
        r.location,
        r.poNumber,
        r.poQty,
        r.dispatchQty,
        r.poValue,
        r.invoiceValue,
        fmtDateDDMMMYY(r.deliveryDate),
        `${r.fulfillRate.toFixed(2)}%`
      ]);
      sheet = "Dispatch";
    }

    if (typeof XLSX !== "undefined") {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheet);
      XLSX.writeFile(wb, `logistics_dispatch_${stamp}.xlsx`);
      return;
    }

    let csv = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n";
    data.forEach(row => {
      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `logistics_dispatch_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---- Analysis cards ----
  function buildAggregates(rows) {
    const locMap = {};
    const chanMap = {};
    rows.forEach(r => {
      if (!locMap[r.location]) locMap[r.location] = { po: 0, d: 0, poVal: 0, invVal: 0 };
      locMap[r.location].po += r.poQty;
      locMap[r.location].d += r.dispatchQty;
      locMap[r.location].poVal += r.poValue;
      locMap[r.location].invVal += r.invoiceValue;
      chanMap[r.channel] = chanMap[r.channel] || { po: 0, d: 0 };
      chanMap[r.channel].po += r.poQty;
      chanMap[r.channel].d += r.dispatchQty;
    });
    return { locMap, chanMap };
  }

  function locRate(agg) {
    return agg.po > 0 ? round2((agg.d / agg.po) * 100) : 0;
  }

  function renderRootCause(rows) {
    const container = document.getElementById("rootCauseList");
    container.innerHTML = "";

    if (rows.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted);">No analysis data available.</div>`;
      return;
    }

    const { locMap, chanMap } = buildAggregates(rows);

    // 1. Largest revenue gap location
    let maxGapLoc = null;
    let maxGap = 0;
    Object.keys(locMap).forEach(l => {
      const gap = locMap[l].poVal - locMap[l].invVal;
      if (gap > maxGap) { maxGap = gap; maxGapLoc = l; }
    });

    if (maxGapLoc && maxGap > 0) {
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(248,113,113,0.25);">REVENUE LEAKAGE</span>
        <div class="recommendation-text">
          <strong>${escapeHtml(maxGapLoc)}</strong> has the highest unfulfilled value of <strong>${fmtMoney(maxGap)}</strong> (${PO_LABEL} ${fmtMoney(locMap[maxGapLoc].poVal)} vs invoiced ${fmtMoney(locMap[maxGapLoc].invVal)}). ${locMap[maxGapLoc].po - locMap[maxGapLoc].d > 0 ? `A backlog of <strong>${fmtInt(locMap[maxGapLoc].po - locMap[maxGapLoc].d)} units</strong> remains undelivered.` : "Dispatch is on schedule for this zone."}
        </div>`;
      container.appendChild(row);
    }

    // 2. Critical channels (<60%)
    const criticalChans = Object.keys(chanMap).filter(ch => {
      const agg = chanMap[ch];
      const r = agg.po > 0 ? agg.d / agg.po * 100 : 0;
      return r < 60;
    });
    if (criticalChans.length > 0) {
      const text = criticalChans.map(ch => `${ch} (${round2(chanMap[ch].po > 0 ? chanMap[ch].d / chanMap[ch].po * 100 : 0).toFixed(1)}%)`).join(", ");
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">CRITICAL CHANNELS</span>
        <div class="recommendation-text">
          <strong>Fulfillment below 60%:</strong> ${escapeHtml(text)}. Carrier pickup gaps or inventory shortfalls are likely; escalate with the respective logistics partners.
        </div>`;
      container.appendChild(row);
    }

    // 3. On-track / partial breakdown
    const onTrack = rows.filter(r => r.fulfillRate >= 90).length;
    const partial = rows.filter(r => r.fulfillRate >= 60 && r.fulfillRate < 90).length;
    const critical = rows.filter(r => r.fulfillRate < 60).length;
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge">FULFILLMENT MIX</span>
      <div class="recommendation-text">
        <strong>Line-level breakdown:</strong> ${onTrack} on track (≥90%), ${partial} partial (60–89%), ${critical} critical (&lt;60%). Prioritize bin-level reconciliation for all critical locations.
      </div>`;
    container.appendChild(row);

    // 4. Verification
    const locCount = Object.keys(locMap).length;
    const rowV = document.createElement("div");
    rowV.className = "recommendation-row";
    rowV.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">VERIFICATION</span>
      <div class="recommendation-text">
        <strong>Coverage &amp; Audit:</strong> Dispatches across <strong>${locCount} warehouse zones</strong> and <strong>${Object.keys(chanMap).length} channels</strong> were reconciled against ${PO_LABEL} records for the selected period.
      </div>`;
    container.appendChild(rowV);
  }

  function renderRecommendations(rows) {
    const container = document.getElementById("recommendationsList");
    container.innerHTML = "";

    if (rows.length === 0) {
      container.innerHTML = `
        <div class="recommendation-row">
          <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">OPERATIONS OK</span>
          <div class="recommendation-text"><strong>No records:</strong> Add dispatch entries or adjust the date range.</div>
        </div>`;
      return;
    }

    const totalPO = rows.reduce((a, r) => a + r.poQty, 0);
    const totalDisp = rows.reduce((a, r) => a + r.dispatchQty, 0);
    const overallRate = totalPO > 0 ? (totalDisp / totalPO) * 100 : 0;

    if (rows.every(r => r.fulfillRate >= 90)) {
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">OPERATIONS OK</span>
        <div class="recommendation-text"><strong>Optimal Performance:</strong> All lines met the 90% fulfillment baseline. Maintain current dispatch controls.</div>`;
      container.appendChild(row);
      return;
    }

    const { locMap } = buildAggregates(rows);

    // 1. Immediate action — worst location
    let worstLoc = null;
    let worstRate = 100;
    Object.keys(locMap).forEach(l => {
      const r = locRate(locMap[l]);
      if (r < worstRate) { worstRate = r; worstLoc = l; }
    });
    if (worstLoc) {
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge">IMMEDIATE ACTION</span>
        <div class="recommendation-text">
          <strong>${escapeHtml(worstLoc)} dispatch review:</strong> Fulfillment is at <strong>${worstRate.toFixed(2)}%</strong>. Reconcile outstanding POs and expedite carrier pickup to recover ${fmtInt(locMap[worstLoc].po - locMap[worstLoc].d)} undelivered units.
        </div>`;
      container.appendChild(row);
    }

    // 2. Critical channels
    const { chanMap } = buildAggregates(rows);
    const criticalChans = Object.keys(chanMap).filter(ch => {
      const agg = chanMap[ch];
      return agg.po > 0 && (agg.d / agg.po * 100) < 60;
    });
    if (criticalChans.length > 0) {
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">PARTNER ESCALATION</span>
        <div class="recommendation-text">
          <strong>Channel follow-up:</strong> Engage <strong>${escapeHtml(criticalChans.join(", "))}</strong> for pickup slots and dispatch confirmation to clear the pending backlog.
        </div>`;
      container.appendChild(row);
    }

    // 3. Overall warning if below 95%
    if (overallRate < 95) {
      const row = document.createElement("div");
      row.className = "recommendation-row";
      row.innerHTML = `
        <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">FULFILLMENT WARNING</span>
        <div class="recommendation-text">
          <strong>Overall fulfillment is ${overallRate.toFixed(2)}%</strong> (below the 95% target). Review ${PO_LABEL} planning, stock allocation, and dispatch scheduling across zones.
        </div>`;
      container.appendChild(row);
    }
  }

  // ---- Main render ----
  function renderDashboard() {
    let rows = state.rows;
    let shortRows = state.shortRows;
    if (window.DateFilter) {
      const all = state.rows;
      rows = DateFilter.apply(all, r => r.dispatchDate);
      shortRows = DateFilter.apply(state.shortRows, r => r.dispatchDate);
      DateFilter.setCount(rows.length, all.length);
    }
    rows = viewRows(rows);

    renderKPIs(rows);
    renderCharts(rows);
    if (SCOPE === "B2C") {
      renderChannelSummaryGrid(rows);
    } else {
      renderGrid(rows);
    }
    renderShortGrid(scopeRows(shortRows));
    renderRootCause(rows);
    renderRecommendations(rows);
    syncSortIndicators();
    syncShortSortIndicators();
  }

  function syncSortIndicators() {
    document.querySelectorAll("#logisticsTable th.sortable").forEach(th => {
      th.classList.remove("is-asc", "is-desc");
      if (th.dataset.sort === state.sortKey) {
        th.classList.add(state.sortDir === "asc" ? "is-asc" : "is-desc");
      }
    });
  }

  function syncShortSortIndicators() {
    document.querySelectorAll("#shortSkuTable th.sortable").forEach(th => {
      th.classList.remove("is-asc", "is-desc");
      if (th.dataset.sort === state.shortSortKey) {
        th.classList.add(state.shortSortDir === "asc" ? "is-asc" : "is-desc");
      }
    });
  }

  function setView(view) {
    state.view = view;
    const all = document.getElementById("viewAll");
    const b2b = document.getElementById("viewB2B");
    const b2c = document.getElementById("viewB2C");
    if (all) all.classList.toggle("active", view === "all");
    if (b2b) b2b.classList.toggle("active", view === "B2B");
    if (b2c) b2c.classList.toggle("active", view === "B2C");
    renderDashboard();
  }

  // ---- Dialog ----
  function openAddDialog() {
    state.editingId = null;
    document.getElementById("dialogTitle").innerText = "Add Dispatch Record";
    const form = document.getElementById("dispatchForm");
    form.reset();
    document.getElementById("formRowId").value = "";
    document.getElementById("channel").value = defaultChannel();
    document.getElementById("location").value = "Kundli";
    document.getElementById("dispatchDate").value = todayIso();
    document.getElementById("deliveryDate").value = addDaysIso(todayIso(), 1);
    document.getElementById("dispatchDialog").showModal();
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("formRowId").value;
    const channel = document.getElementById("channel").value;
    const location = document.getElementById("location").value;
    const dispatchDate = document.getElementById("dispatchDate").value;
    const deliveryDate = document.getElementById("deliveryDate").value;
    const poQty = parseInt(document.getElementById("poQty").value, 10) || 0;
    const dispatchQty = parseInt(document.getElementById("dispatchQty").value, 10) || 0;
    const notes = document.getElementById("notes").value || "-";
    let poNumber = document.getElementById("poNumber").value.trim();

    if (!poNumber) poNumber = genPoNumber(dispatchDate, location);

    const row = normalizeRow({
      channel,
      location,
      dispatchDate,
      deliveryDate,
      poQty,
      dispatchQty,
      notes,
      poNumber
    });

    if (id) {
      const idx = state.rows.findIndex(r => r.id === id);
      if (idx !== -1) state.rows[idx] = { ...state.rows[idx], ...row, id };
    } else {
      row.id = "logi-" + Date.now();
      state.rows.push(row);
    }

    saveState();
    document.getElementById("dispatchDialog").close();
    renderDashboard();
  }

  // ---- Import ----
  function setupImport(importBtn, fileInput) {
    importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileInput.value = "";

      const ALIASES = {
        dispatchDate: ["Dispatch Date", "Date", "dispatchDate"],
        channel: ["Channel", "channel"],
        location: ["Location", "Warehouse", "Zone", "location"],
        poNumber: ["PO Number", "Order Number", "PO", "Order No", "Order #", "poNumber"],
        poQty: ["PO Qty", "PO Quantity", "Order Qty", "Ordered Qty", "poQty"],
        dispatchQty: ["Dispatch Qty", "Dispatch Quantity", "Dispatched Qty", "dispatchQty"],
        deliveryDate: ["Delivery Date", "deliveryDate"],
        notes: ["Notes", "Note", "notes"]
      };

      await BulkImport.openImport({
        file,
        fieldAliases: ALIASES,
        existingCount: state.rows.length,
        previewColumns: [
          { field: "dispatchDate", label: "Dispatch Date" },
          { field: "channel", label: "Channel" },
          { field: "location", label: "Location" },
          { field: "poNumber", label: `${PO_LABEL} Number` },
          { field: "poQty", label: `${PO_LABEL} Qty` },
          { field: "dispatchQty", label: "Dispatch Qty" },
          { field: "deliveryDate", label: "Delivery Date" },
          { field: "notes", label: "Notes" }
        ],
        transformRow: (row) => {
          const errors = [];

          const dispatchDate = BulkImport.parseDate(row.dispatchDate, errors);
          const channel = BulkImport.parseText(row.channel);
          if (!channel) errors.push("Channel is required");
          else if (!activeChannels().some(c => c.name === channel)) errors.push(`Unknown channel: ${channel}`);
          const location = BulkImport.parseText(row.location);
          if (!location) errors.push("Location is required");
          else if (!LOCATIONS.includes(location)) errors.push(`Unknown location: ${location}`);
          const poNumber = BulkImport.parseText(row.poNumber);
          const poQty = BulkImport.parseNumber(row.poQty, errors, `${PO_LABEL} Qty`);
          if (poQty !== null && poQty < 0) errors.push(`${PO_LABEL} Qty cannot be negative`);
          const dispatchQty = BulkImport.parseNumber(row.dispatchQty, errors, "Dispatch Qty");
          if (dispatchQty !== null && dispatchQty < 0) errors.push("Dispatch Qty cannot be negative");
          const deliveryDate = BulkImport.parseDate(row.deliveryDate, errors);
          const notes = BulkImport.parseText(row.notes) || "-";

          if (!dispatchDate) errors.push("Dispatch Date is required");

          return {
            errors,
            value: {
              dispatchDate,
              channel,
              location,
              poNumber,
              poQty: poQty ?? 0,
              dispatchQty: dispatchQty ?? 0,
              deliveryDate,
              notes
            }
          };
        },
        onImport: (records) => {
          const ts = Date.now();
          state.rows = records.map((r, i) => normalizeRow({ id: `logi-${ts}-${i}`, ...r }));
          saveState();
          renderDashboard();
          alert(`Successfully imported ${records.length} dispatch record${records.length !== 1 ? "s" : ""}.`);
        }
      });
    });
  }

  // ---- Init ----
  function populateFilterSelects() {
    const locSelect = document.getElementById("locFilter");
    const chanSelect = document.getElementById("channelFilter");
    const locs = [...new Set(state.rows.map(r => r.location))].sort();
    const chans = [...new Set(scopeRows(state.rows).map(r => r.channel))].sort();
    locSelect.innerHTML = `<option value="all">All Locations</option>` + locs.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    chanSelect.innerHTML = `<option value="all">All Channels</option>` + chans.map(ch => `<option value="${escapeHtml(ch)}">${escapeHtml(ch)}</option>`).join("");
    locSelect.value = state.locFilter;
    chanSelect.value = state.channelFilter;
  }

  function populateShortFilterSelects() {
    const locSelect = document.getElementById("shortLocFilter");
    const chanSelect = document.getElementById("shortChannelFilter");
    const locs = [...new Set(state.shortRows.map(r => r.location))].sort();
    const chans = [...new Set(scopeRows(state.shortRows).map(r => r.channel))].sort();
    locSelect.innerHTML = `<option value="all">All Locations</option>` + locs.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    chanSelect.innerHTML = `<option value="all">All Channels</option>` + chans.map(ch => `<option value="${escapeHtml(ch)}">${escapeHtml(ch)}</option>`).join("");
    locSelect.value = state.shortLocFilter;
    chanSelect.value = state.shortChannelFilter;
  }

  function populateChannelSelects() {
    const opts = activeChannels().map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    const chan = document.getElementById("channel");
    if (chan) chan.innerHTML = opts;
    const sch = document.getElementById("shortChannel");
    if (sch) sch.innerHTML = opts;
  }

  function populateLocationSelects() {
    const opts = LOCATIONS.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    const loc = document.getElementById("location");
    if (loc) loc.innerHTML = opts;
    const sloc = document.getElementById("shortLocation");
    if (sloc) sloc.innerHTML = opts;
  }

  // ---- Channel / Location config management (Add/Remove) ----
  function addChannel(name, rate) {
    name = String(name || "").trim();
    if (!name) return { ok: false, msg: "Channel name cannot be empty." };
    if (CHANNELS.some(c => c.name.toLowerCase() === name.toLowerCase())) return { ok: false, msg: `Channel "${name}" already exists.` };
    const type = SCOPE === "B2B" ? "B2B" : SCOPE === "B2C" ? "B2C" : "B2B";
    const avgRate = CHANNELS.length ? Math.round(CHANNELS.reduce((a, c) => a + (Number(c.rate) || 0), 0) / CHANNELS.length) : 100;
    const rateNum = rate === undefined || rate === null || rate === "" ? avgRate : Math.max(0, Number(rate) || 0);
    CHANNELS.push({ name, type, rate: rateNum });
    saveConfig();
    return { ok: true, msg: `Channel "${name}" added.` };
  }

  function removeChannel(name) {
    name = String(name || "").trim();
    if (!name || name === "all") return { ok: false, msg: "No channel selected to remove." };
    if (CHANNELS.length <= 1) return { ok: false, msg: "At least one channel must remain." };
    if (!CHANNELS.some(c => c.name === name)) return { ok: false, msg: `Channel "${name}" not found.` };
    CHANNELS = CHANNELS.filter(c => c.name !== name);
    saveConfig();
    return { ok: true, msg: `Channel "${name}" removed.` };
  }

  function addLocation(name) {
    name = String(name || "").trim();
    if (!name) return { ok: false, msg: "Location name cannot be empty." };
    if (LOCATIONS.some(l => l.toLowerCase() === name.toLowerCase())) return { ok: false, msg: `Location "${name}" already exists.` };
    LOCATIONS.push(name);
    LOC_CODE = buildLocCodes(LOCATIONS);
    saveConfig();
    return { ok: true, msg: `Location "${name}" added.` };
  }

  function removeLocation(name) {
    name = String(name || "").trim();
    if (!name || name === "all") return { ok: false, msg: "No location selected to remove." };
    if (LOCATIONS.length <= 1) return { ok: false, msg: "At least one location must remain." };
    if (!LOCATIONS.includes(name)) return { ok: false, msg: `Location "${name}" not found.` };
    LOCATIONS = LOCATIONS.filter(l => l !== name);
    LOC_CODE = buildLocCodes(LOCATIONS);
    saveConfig();
    return { ok: true, msg: `Location "${name}" removed.` };
  }

  function promptChannelName() {
    return window.prompt("Enter new channel name:");
  }

  function promptChannelRate(name) {
    const avgRate = CHANNELS.length ? Math.round(CHANNELS.reduce((a, c) => a + (Number(c.rate) || 0), 0) / CHANNELS.length) : 100;
    const raw = window.prompt(`Enter per-unit rate for "${name}" (₹):`, String(avgRate));
    if (raw === null) return null;
    return Math.max(0, Number(raw) || 0);
  }

  function setupConfigButtons() {
    document.getElementById("addChannelBtn").addEventListener("click", () => {
      const name = promptChannelName();
      if (name === null) return;
      const res = addChannel(name);
      if (!res.ok) { alert(res.msg); return; }
      const rate = promptChannelRate(name);
      if (rate === null) { removeChannel(name); return; }
      const c = CHANNELS.find(x => x.name === name);
      if (c) c.rate = rate;
      saveConfig();
      refreshConfigUI(name);
      alert(res.msg);
    });

    document.getElementById("removeChannelBtn").addEventListener("click", () => {
      const sel = document.getElementById("channel").value;
      const removed = CHANNELS.find(c => c.name === sel);
      if (!removed) return;
      const res = removeChannel(sel);
      if (!res.ok) { alert(res.msg); return; }
      if (confirm(`Remove channel "${sel}" from the available list?`)) {
        refreshConfigUI();
        alert(res.msg);
      } else {
        CHANNELS.push({ ...removed });
        saveConfig();
        refreshConfigUI(sel);
      }
    });

    document.getElementById("addLocationBtn").addEventListener("click", () => {
      const name = window.prompt("Enter new location name:");
      if (name === null) return;
      const res = addLocation(name);
      if (!res.ok) { alert(res.msg); return; }
      refreshConfigUI(name);
      alert(res.msg);
    });

    document.getElementById("removeLocationBtn").addEventListener("click", () => {
      const sel = document.getElementById("location").value;
      const res = removeLocation(sel);
      if (!res.ok) { alert(res.msg); return; }
      if (confirm(`Remove location "${sel}" from the available list?`)) {
        refreshConfigUI();
        alert(res.msg);
      } else {
        LOCATIONS.push(sel);
        LOC_CODE = buildLocCodes(LOCATIONS);
        saveConfig();
        refreshConfigUI();
      }
    });
  }

  function refreshConfigUI(preferred) {
    const curChan = document.getElementById("channel").value;
    const curLoc = document.getElementById("location").value;
    populateChannelSelects();
    populateLocationSelects();
    const chan = document.getElementById("channel");
    if (chan) {
      if (preferred && [...chan.options].some(o => o.value === preferred)) chan.value = preferred;
      else if ([...chan.options].some(o => o.value === curChan)) chan.value = curChan;
      else chan.value = defaultChannel();
    }
    const loc = document.getElementById("location");
    if (loc) {
      if ([...loc.options].some(o => o.value === curLoc)) loc.value = curLoc;
      else loc.value = LOCATIONS[0] || "";
    }
  }

  function init() {
    ["logistics_dispatch_v1", "logistics_dispatch_v2", "logistics_short_sku_v1", "logistics_short_sku_v2"].forEach(k => localStorage.removeItem(k));

    if (typeof ChartDataLabels !== "undefined") {
      Chart.register(ChartDataLabels);
    }

    state.rows = loadRows();
    state.shortRows = loadShortRows();
    if (SCOPE === "B2C") state.view = "B2C";
    if (SCOPE === "B2B") state.view = "B2B";
    document.documentElement.setAttribute("data-theme", state.theme);
    updateThemeIcon();

    populateFilterSelects();
    populateShortFilterSelects();
    populateChannelSelects();
    populateLocationSelects();
    setupConfigButtons();

    document.getElementById("themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("warehouse_dashboard_theme", state.theme);
      document.documentElement.setAttribute("data-theme", state.theme);
      updateThemeIcon();
      renderDashboard();
    });

    // View toggle
    const viewAll = document.getElementById("viewAll");
    const viewB2B = document.getElementById("viewB2B");
    const viewB2C = document.getElementById("viewB2C");
    if (viewAll) viewAll.addEventListener("click", () => setView("all"));
    if (viewB2B) viewB2B.addEventListener("click", () => setView("B2B"));
    if (viewB2C) viewB2C.addEventListener("click", () => setView("B2C"));

    // Chart type & metric
    document.getElementById("chartType").addEventListener("change", () => {
      state.chartType = document.getElementById("chartType").value;
      renderDashboard();
    });
    document.getElementById("chartMetric").addEventListener("change", () => {
      state.chartMetric = document.getElementById("chartMetric").value;
      renderDashboard();
    });

    // Grid filters
    document.getElementById("locFilter").addEventListener("change", () => {
      state.locFilter = document.getElementById("locFilter").value;
      renderDashboard();
    });
    document.getElementById("channelFilter").addEventListener("change", () => {
      state.channelFilter = document.getElementById("channelFilter").value;
      renderDashboard();
    });
    const filterStatusEl = document.getElementById("filterStatus");
    if (filterStatusEl) {
      filterStatusEl.addEventListener("change", () => {
        state.filterStatus = filterStatusEl.value;
        renderDashboard();
      });
    }

    // Add/Edit dialog
    document.getElementById("addEntryBtn").addEventListener("click", openAddDialog);
    document.getElementById("closeDialogBtn").addEventListener("click", () => document.getElementById("dispatchDialog").close());
    document.getElementById("cancelDialogBtn").addEventListener("click", () => document.getElementById("dispatchDialog").close());
    document.getElementById("dispatchForm").addEventListener("submit", handleFormSubmit);

    // Short SKU grid filters & dialog
    document.getElementById("shortLocFilter").addEventListener("change", () => {
      state.shortLocFilter = document.getElementById("shortLocFilter").value;
      renderDashboard();
    });
    document.getElementById("shortChannelFilter").addEventListener("change", () => {
      state.shortChannelFilter = document.getElementById("shortChannelFilter").value;
      renderDashboard();
    });
    document.getElementById("addShortSkuBtn").addEventListener("click", openAddShortSkuDialog);
    document.getElementById("closeShortSkuDialogBtn").addEventListener("click", () => document.getElementById("shortSkuDialog").close());
    document.getElementById("cancelShortSkuDialogBtn").addEventListener("click", () => document.getElementById("shortSkuDialog").close());
    document.getElementById("shortSkuForm").addEventListener("submit", handleShortSkuFormSubmit);

    // Import / Export / Print / Reset
    setupImport(document.getElementById("importBtn"), document.getElementById("fileInput"));
    document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
    document.getElementById("exportCsvBtn").addEventListener("click", () => exportRows(state.rows));
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    document.getElementById("resetBtn").addEventListener("click", () => {
      return; // Reset disabled until re-enabled by owner
      if (confirm("Erase all logistics dispatch data? This cannot be undone.")) {
        state.rows = [];
        saveState();
        renderDashboard();
      }
    });

    // Sortable table headers
    document.querySelectorAll("#logisticsTable th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        renderDashboard();
      });
    });

    document.querySelectorAll("#shortSkuTable th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.shortSortKey === key) {
          state.shortSortDir = state.shortSortDir === "asc" ? "desc" : "asc";
        } else {
          state.shortSortKey = key;
          state.shortSortDir = "asc";
        }
        renderDashboard();
      });
    });

    if (window.DateFilter) {
      DateFilter.init({ onApply: () => renderDashboard() });
    }

    renderDashboard();
    syncFromCloud();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
