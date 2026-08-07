// B2B & B2C Daily Logistics & Order Dispatch Report
(function () {
  const STORAGE_KEY = "logistics_dispatch_v1";

  // ---- Configuration ----
  const LOCATIONS = ["Kundli", "Farukh Nagar SR", "Dasna D3", "Noida N1", "Lucknow L5", "Sanpka", "Rajpura R2"];
  const LOC_CODE = { "Kundli": "KND", "Farukh Nagar SR": "FNS", "Dasna D3": "DSN", "Noida N1": "NDA", "Lucknow L5": "LKO", "Sanpka": "SNP", "Rajpura R2": "RPR" };

  const CHANNELS = [
    { name: "Blinkit", type: "B2B" },
    { name: "FK Consignment", type: "B2B" },
    { name: "Zomato Instant", type: "B2B" },
    { name: "Delhivery B2C", type: "B2C" },
    { name: "DTDC B2C", type: "B2C" },
    { name: "Blue Dart B2C", type: "B2C" },
    { name: "Ekart B2C", type: "B2C" }
  ];

  const UNIT_RATE = { "Blinkit": 65, "FK Consignment": 75, "Zomato Instant": 55, "Delhivery B2C": 145, "DTDC B2C": 155, "Blue Dart B2C": 175, "Ekart B2C": 135 };

  const PALETTE = [
    "#3b82f6", "#f97316", "#2dd4bf", "#ef4444", "#a855f7", "#eab308",
    "#22c55e", "#ec4899", "#06b6d4", "#fb923c", "#8b5cf6", "#f43f5e"
  ];

  const state = {
    rows: [],
    theme: localStorage.getItem("warehouse_dashboard_theme") || "dark",
    view: "all",
    sortKey: "dispatchDate",
    sortDir: "desc",
    locFilter: "all",
    channelFilter: "all"
  };

  const chartInstances = {};

  // ---- SVG icons ----
  const SVG_ICONS = {
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

  // ---- Sample data baseline ----
  // [dispatchDate, location, channel, poQty, dispatchQty, deliveryOffsetDays]
  const SAMPLE = [
    ["2026-08-08", "Kundli", "Blinkit", 500, 500, 0],
    ["2026-08-08", "Kundli", "FK Consignment", 780, 780, 0],
    ["2026-08-08", "Kundli", "Delhivery B2C", 320, 280, 2],
    ["2026-08-08", "Kundli", "DTDC B2C", 174, 70, 1],
    ["2026-08-08", "Farukh Nagar SR", "Blinkit", 450, 320, 0],
    ["2026-08-08", "Farukh Nagar SR", "FK Consignment", 960, 960, 0],
    ["2026-08-08", "Farukh Nagar SR", "Blue Dart B2C", 210, 210, 2],
    ["2026-08-08", "Farukh Nagar SR", "Ekart B2C", 150, 95, 2],
    ["2026-08-08", "Dasna D3", "FK Consignment", 1200, 1180, 0],
    ["2026-08-08", "Dasna D3", "Zomato Instant", 380, 380, 1],
    ["2026-08-08", "Dasna D3", "DTDC B2C", 260, 140, 2],
    ["2026-08-08", "Dasna D3", "Delhivery B2C", 190, 170, 2],
    ["2026-08-08", "Noida N1", "Blinkit", 640, 640, 0],
    ["2026-08-08", "Noida N1", "FK Consignment", 850, 610, 1],
    ["2026-08-08", "Noida N1", "Ekart B2C", 300, 300, 0],
    ["2026-08-08", "Noida N1", "Blue Dart B2C", 180, 100, 2],
    ["2026-08-08", "Lucknow L5", "FK Consignment", 700, 700, 0],
    ["2026-08-08", "Lucknow L5", "Blinkit", 420, 250, 1],
    ["2026-08-08", "Lucknow L5", "Delhivery B2C", 230, 200, 2],
    ["2026-08-08", "Lucknow L5", "DTDC B2C", 120, 120, 0],
    ["2026-08-08", "Sanpka", "Blinkit", 510, 510, 0],
    ["2026-08-08", "Sanpka", "FK Consignment", 660, 660, 0],
    ["2026-08-08", "Sanpka", "Ekart B2C", 240, 180, 2],
    ["2026-08-08", "Sanpka", "Zomato Instant", 350, 300, 1],
    ["2026-08-08", "Rajpura R2", "FK Consignment", 900, 540, 0],
    ["2026-08-08", "Rajpura R2", "Blinkit", 470, 470, 0],
    ["2026-08-08", "Rajpura R2", "Blue Dart B2C", 160, 90, 2],
    ["2026-08-08", "Rajpura R2", "Delhivery B2C", 205, 185, 2],
    ["2026-08-05", "Kundli", "FK Consignment", 720, 720, 1],
    ["2026-08-05", "Farukh Nagar SR", "Blinkit", 390, 390, 1],
    ["2026-08-05", "Noida N1", "Delhivery B2C", 280, 210, 2],
    ["2026-08-06", "Dasna D3", "FK Consignment", 1100, 880, 1],
    ["2026-08-06", "Lucknow L5", "Blinkit", 460, 460, 1],
    ["2026-08-06", "Sanpka", "DTDC B2C", 200, 130, 2],
    ["2026-08-07", "Rajpura R2", "FK Consignment", 830, 830, 1],
    ["2026-08-07", "Kundli", "Blinkit", 520, 390, 1],
    ["2026-08-07", "Farukh Nagar SR", "Ekart B2C", 170, 170, 1],
    ["2026-08-07", "Noida N1", "FK Consignment", 910, 910, 1]
  ];

  function buildSampleRows() {
    const seq = {};
    return SAMPLE.map(([dispatchDate, location, channel, poQty, dispatchQty, offset], i) => {
      const key = dispatchDate + "|" + location;
      seq[key] = (seq[key] || 0) + 1;
      const rate = poQty > 0 ? round2((dispatchQty / poQty) * 100) : 0;
      const poValue = Math.round(poQty * UNIT_RATE[channel]);
      const invoiceValue = Math.round(poValue * (rate / 100));
      return {
        id: `logi-${i}`,
        dispatchDate,
        channel,
        location,
        poNumber: `PO-${LOC_CODE[location]}-${String(seq[key]).padStart(4, "0")}`,
        poQty,
        dispatchQty,
        poValue,
        invoiceValue,
        deliveryDate: addDaysIso(dispatchDate, offset),
        fulfillRate: rate
      };
    });
  }

  function loadRows() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    const rows = buildSampleRows();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) { /* ignore */ }
    return rows;
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
  function viewRows(rows) {
    if (state.view === "all") return rows;
    const types = new Set(CHANNELS.filter(c => c.type === state.view).map(c => c.name));
    return rows.filter(r => types.has(r.channel));
  }

  function filteredRows(rows) {
    return rows.filter(r =>
      (state.locFilter === "all" || r.location === state.locFilter) &&
      (state.channelFilter === "all" || r.channel === state.channelFilter)
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
    el("subTotalPO").innerText = `${fmtInt(rows.length)} PO Lines`;
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
      kpi.classList.add(rate >= 90 ? "variant-green" : rate >= 60 ? "variant-green" : "variant-red");
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
    const locs = Object.keys(locMap).sort((a, b) => {
      const ra = locMap[a].po > 0 ? locMap[a].d / locMap[a].po * 100 : 0;
      const rb = locMap[b].po > 0 ? locMap[b].d / locMap[b].po * 100 : 0;
      return ra - rb;
    });
    const locRate = locs.map(l => round2(locMap[l].po > 0 ? locMap[l].d / locMap[l].po * 100 : 0));

    // 1. Performance by Location (Fulfill Rate %)
    const barColors = locRate.map(r => r >= 90 ? "#22c55e" : r >= 60 ? "#fbbf24" : "#f87171");
    buildChart("locationChart", "bar", {
      labels: locs,
      datasets: [{
        label: "Fulfill Rate %",
        data: locRate,
        backgroundColor: barColors,
        borderColor: "#0f172a",
        borderWidth: 1,
        borderRadius: 4
      }]
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(2)}% fulfill` } },
        datalabels: { color: c.value, font: { family: "Inter", weight: "bold", size: 10 }, anchor: "end", align: "end", formatter: v => `${v.toFixed(1)}%` }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, font: { family: "Inter" } } },
        y: { grid: { color: c.grid }, ticks: { color: c.text, font: { family: "Inter" }, callback: v => `${v}%` }, max: 100 }
      }
    });

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
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--text-muted); padding:32px;">No dispatch transactions match the current filters.</td></tr>`;
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
        <td class="${fulfillClass(r.fulfillRate)}">${r.fulfillRate.toFixed(2)}%</td>`;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // ---- Export ----
  function exportRows(rows) {
    const filtered = filteredRows(rows);
    const headers = ["Dispatch Date", "Channel", "Location", "PO Number", "PO Qty", "Dispatch Qty", "PO Value", "Invoice Value", "Delivery Date", "Fulfill Rate in %"];
    const data = filtered.map(r => [
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

    const stamp = new Date().toISOString().split("T")[0];

    if (typeof XLSX !== "undefined") {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dispatch");
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

  // ---- Main render ----
  function renderDashboard() {
    let rows = state.rows;
    if (window.DateFilter) {
      const all = state.rows;
      rows = DateFilter.apply(all, r => r.dispatchDate);
      DateFilter.setCount(rows.length, all.length);
    }
    rows = viewRows(rows);

    renderKPIs(rows);
    renderCharts(rows);
    renderGrid(rows);
    syncSortIndicators();
  }

  function syncSortIndicators() {
    document.querySelectorAll("#logisticsTable th.sortable").forEach(th => {
      th.classList.remove("is-asc", "is-desc");
      if (th.dataset.sort === state.sortKey) {
        th.classList.add(state.sortDir === "asc" ? "is-asc" : "is-desc");
      }
    });
  }

  function setView(view) {
    state.view = view;
    document.getElementById("viewAll").classList.toggle("active", view === "all");
    document.getElementById("viewB2B").classList.toggle("active", view === "B2B");
    document.getElementById("viewB2C").classList.toggle("active", view === "B2C");
    renderDashboard();
  }

  // ---- Init ----
  function populateFilterSelects() {
    const locSelect = document.getElementById("locFilter");
    const chanSelect = document.getElementById("channelFilter");
    const locs = [...new Set(state.rows.map(r => r.location))].sort();
    const chans = [...new Set(state.rows.map(r => r.channel))].sort();
    locSelect.innerHTML = `<option value="all">All Locations</option>` + locs.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    chanSelect.innerHTML = `<option value="all">All Channels</option>` + chans.map(ch => `<option value="${escapeHtml(ch)}">${escapeHtml(ch)}</option>`).join("");
    locSelect.value = state.locFilter;
    chanSelect.value = state.channelFilter;
  }

  function init() {
    if (typeof ChartDataLabels !== "undefined") {
      Chart.register(ChartDataLabels);
    }

    state.rows = loadRows();
    document.documentElement.setAttribute("data-theme", state.theme);
    updateThemeIcon();

    populateFilterSelects();

    document.getElementById("themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("warehouse_dashboard_theme", state.theme);
      document.documentElement.setAttribute("data-theme", state.theme);
      updateThemeIcon();
      renderDashboard();
    });

    document.getElementById("viewAll").addEventListener("click", () => setView("all"));
    document.getElementById("viewB2B").addEventListener("click", () => setView("B2B"));
    document.getElementById("viewB2C").addEventListener("click", () => setView("B2C"));

    document.getElementById("locFilter").addEventListener("change", () => {
      state.locFilter = document.getElementById("locFilter").value;
      renderGrid(state.rows);
    });
    document.getElementById("channelFilter").addEventListener("change", () => {
      state.channelFilter = document.getElementById("channelFilter").value;
      renderGrid(state.rows);
    });

    document.getElementById("exportCsvBtn").addEventListener("click", () => exportRows(state.rows));

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

    if (window.DateFilter) {
      DateFilter.init({ onApply: () => renderDashboard() });
    }

    renderDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
