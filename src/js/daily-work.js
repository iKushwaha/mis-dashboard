// Daily Work Report — aggregates work from Store Dispatch, Inventory Cycle Count,
// RTV, and manual work entries into a single dynamic daily operations dashboard.
const DAILY_WORK_STORAGE_KEY = "daily_work_entries_v1";

const WORK_STATUSES = ["COMPLETED", "IN PROGRESS", "PENDING"];
const WORK_REPORTS = ["STORE DISPATCH", "INVENTORY", "RTV", "MANUAL"];

const REPORT_SOURCES = {
  STORE_DISPATCH: "warehouse_dashboard_stores_v2",
  INVENTORY: "inventory_cycle_count_stores_v3",
  RTV: "rtv_entries_v1"
};

// State Manager
let state = {
  manual: [],
  theme: "dark",
  editingId: null,
  chartMode: "report",
  chartType: "bar",
  chartMetric: "count",
  reportFilter: "all",
  statusFilter: "all",
  assigneeFilter: "all",
  search: "",
  sortKey: "date",
  sortDir: "desc"
};

// SVG Icon Helpers
const SVG_ICONS = {
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`
};

// ---- Utilities ----
function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtInt(n) {
  return (n || 0).toLocaleString("en-IN");
}

// ---- Status derivation from source reports ----
function mapStoreStatus(status) {
  if (status === "DELIVERED") return "COMPLETED";
  if (status === "IN TRANSIT") return "IN PROGRESS";
  return "PENDING";
}

function mapInventoryStatus(item) {
  if ((item.physicalQty || 0) === 0 && (item.systemQty || 0) > 0) return "PENDING";
  const variance = (item.physicalQty || 0) - (item.systemQty || 0);
  if (variance === 0) return "COMPLETED";
  return "IN PROGRESS";
}

function mapRtvStatus(entry) {
  if (entry.unboxingStatus === "DONE" && entry.videoUploadStatus === "UPLOADED" && entry.booking === "BOOKED") return "COMPLETED";
  if (entry.unboxingStatus === "IN PROGRESS" || entry.booking === "IN PROGRESS") return "IN PROGRESS";
  return "PENDING";
}

// ---- Auto-derive work items from other reports ----
function storeToWork(s) {
  return {
    id: "auto-sd-" + (s.id || Math.random().toString(36).slice(2)),
    report: "STORE DISPATCH",
    workType: "Dispatch",
    task: `Dispatch to ${s.storeName}`,
    assignee: s.verifiedPerson || "Unassigned",
    date: s.dispatchDate || s.poDate,
    qty: s.sentQty || 0,
    status: mapStoreStatus(s.status),
    source: "auto",
    notes: [s.status, s.reasonOfShortage && s.reasonOfShortage !== "-" ? s.reasonOfShortage : ""].filter(Boolean).join(" · ") || "-"
  };
}

function inventoryToWork(item) {
  const variance = (item.physicalQty || 0) - (item.systemQty || 0);
  return {
    id: "auto-inv-" + (item.id || Math.random().toString(36).slice(2)),
    report: "INVENTORY",
    workType: "Cycle Count",
    task: `Cycle count - ${item.itemName}${item.binLocation ? ` (${item.binLocation})` : ""}`,
    assignee: item.countedBy || "Unassigned",
    date: item.countDate,
    qty: item.physicalQty || 0,
    status: mapInventoryStatus(item),
    source: "auto",
    notes: `${item.category || "-"} · variance ${variance >= 0 ? "+" : ""}${variance}`.slice(0, 120)
  };
}

function rtvToWork(entry) {
  return {
    id: "auto-rtv-" + (entry.id || Math.random().toString(36).slice(2)),
    report: "RTV",
    workType: "Return Processing",
    task: `Return processing - ${entry.warehouseLocation}`,
    assignee: "Ops Team",
    date: entry.receiveDate,
    qty: entry.receivedQty || 0,
    status: mapRtvStatus(entry),
    source: "auto",
    notes: `${entry.channelName || "-"} · ${entry.unboxingStatus}/${entry.videoUploadStatus}/${entry.booking}`
  };
}

function collectWorkItems() {
  const stores = read(REPORT_SOURCES.STORE_DISPATCH).map(storeToWork);
  const items = read(REPORT_SOURCES.INVENTORY).map(inventoryToWork);
  const entries = read(REPORT_SOURCES.RTV).map(rtvToWork);
  const manual = state.manual.map(m => ({ ...m, source: "manual" }));
  return [...stores, ...items, ...entries, ...manual];
}

// ---- KPIs ----
function computeKPIs(items) {
  const total = items.length;
  const completed = items.filter(i => i.status === "COMPLETED").length;
  const inProgress = items.filter(i => i.status === "IN PROGRESS").length;
  const pending = items.filter(i => i.status === "PENDING").length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const byReport = items.reduce((acc, i) => {
    acc[i.report] = (acc[i.report] || 0) + 1;
    return acc;
  }, {});
  return { total, completed, inProgress, pending, completionRate, byReport };
}

function renderKPIs(kpi) {
  document.getElementById("valTotalWork").innerText = kpi.total.toLocaleString();
  document.getElementById("subTotalWork").innerText = [
    `${kpi.byReport["STORE DISPATCH"] || 0} dispatch`,
    `${kpi.byReport["INVENTORY"] || 0} count`,
    `${kpi.byReport["RTV"] || 0} return`,
    `${kpi.byReport["MANUAL"] || 0} manual`
  ].join(" · ");

  document.getElementById("valCompleted").innerText = kpi.completed.toLocaleString();
  document.getElementById("subCompleted").innerText = `Tasks done (${((kpi.completed / (kpi.total || 1)) * 100).toFixed(1)}%)`;

  document.getElementById("valInProgress").innerText = kpi.inProgress.toLocaleString();
  document.getElementById("subInProgress").innerText = "Being worked on";

  document.getElementById("valPending").innerText = kpi.pending.toLocaleString();
  document.getElementById("subPending").innerText = "Awaiting action";

  document.getElementById("valCompletionRate").innerText = `${kpi.completionRate.toFixed(2)}%`;
  document.getElementById("subCompletionRate").innerText = `Closed / Total work`;
}

// ---- Chart ----
let workChartInstance = null;

function chartMetricLabel(metric) {
  return metric === "qty" ? "Units Handled" : "Work Count";
}

function buildChartData(items) {
  const mode = state.chartMode;
  const groups = {};
  items.forEach(i => {
    const key = mode === "status"
      ? (i.status || "UNKNOWN")
      : (mode === "assignee"
        ? (i.assignee || "Unassigned")
        : (i.report || "OTHER"));
    if (!groups[key]) groups[key] = { count: 0, qty: 0 };
    groups[key].count += 1;
    groups[key].qty += i.qty || 0;
  });
  let labels = Object.keys(groups);
  if (mode === "status") {
    labels = labels.sort((a, b) => WORK_STATUSES.indexOf(a) - WORK_STATUSES.indexOf(b));
  } else {
    labels.sort();
  }
  return { labels, count: labels.map(l => groups[l].count), qty: labels.map(l => groups[l].qty) };
}

function renderChart() {
  const ctx = document.getElementById("workChart");
  if (!ctx) return;
  if (workChartInstance) workChartInstance.destroy();

  const isDark = state.theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const textColor = isDark ? "#9ca3af" : "#475569";

  const chartType = state.chartType || "bar";
  const chartMetric = state.chartMetric || "count";
  const data = buildChartData(collectWorkItems());

  const singleSeries = ["pie", "doughnut", "polarArea"].includes(chartType);
  const palette = [
    "#2dd4bf", "#22c55e", "#f87171", "#a3e635", "#fbbf24", "#60a5fa",
    "#c084fc", "#fb923c", "#34d399", "#4ade80", "#facc15", "#38bdf8",
    "#f472b6", "#a78bfa", "#fb7185"
  ];
  const metricData = { count: data.count, qty: data.qty };
  const metric = chartMetric === "qty" ? "qty" : "count";
  const color = chartMetric === "qty"
    ? { dark: "rgba(45, 212, 191, 0.8)", light: "rgba(13, 148, 136, 0.85)", border: "var(--accent-blue)" }
    : { dark: "rgba(163, 230, 53, 0.85)", light: "rgba(77, 124, 15, 0.85)", border: "var(--accent-indigo)" };

  let datasets;
  if (singleSeries) {
    datasets = [{
      label: chartMetricLabel(metric),
      data: metricData[metric],
      backgroundColor: data.labels.map((_, i) => palette[i % palette.length]),
      borderColor: "rgba(15, 23, 42, 0.35)",
      borderWidth: 1
    }];
  } else {
    datasets = [{
      label: chartMetricLabel(metric),
      data: metricData[metric],
      backgroundColor: isDark ? color.dark : color.light,
      borderColor: color.border,
      borderWidth: 1,
      borderRadius: 4
    }];
  }

  const isHorizontal = chartType === "horizontalBar";
  const isStacked = chartType === "stackedBar";
  const isLine = chartType === "line";
  const isCartesian = ["bar", "horizontalBar", "stackedBar", "line"].includes(chartType);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    indexAxis: isHorizontal ? "y" : "x",
    cutout: chartType === "doughnut" ? "55%" : undefined,
    plugins: {
      legend: {
        position: singleSeries ? "right" : "top",
        labels: { color: textColor, font: { family: "Inter" }, boxWidth: 12, padding: 16 }
      },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        titleColor: isDark ? "#ffffff" : "#0f172a",
        bodyColor: isDark ? "#9ca3af" : "#475569",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        borderWidth: 1
      }
    },
    scales: isCartesian ? {
      x: {
        stacked: isStacked,
        grid: { display: false },
        ticks: { color: textColor, font: { family: "Inter" }, maxRotation: isHorizontal ? 0 : 60, minRotation: isHorizontal ? 0 : 30, autoSkip: true, maxTicksLimit: 20 }
      },
      y: { stacked: isStacked, grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Inter" } } }
    } : undefined
  };

  if (isLine) {
    datasets[0].fill = false;
    datasets[0].tension = 0.3;
  }

  workChartInstance = new Chart(ctx, {
    type: isLine ? "line" : (isStacked ? "bar" : chartType),
    data: { labels: data.labels, datasets },
    options
  });
}

function syncChartControls() {
  document.getElementById("filterByReport").classList.toggle("active", state.chartMode === "report");
  document.getElementById("filterByStatus").classList.toggle("active", state.chartMode === "status");
  document.getElementById("filterByAssignee").classList.toggle("active", state.chartMode === "assignee");

  const modeLabel = state.chartMode === "status" ? "Status" : (state.chartMode === "assignee" ? "Assignee" : "Report");
  document.getElementById("chartTitle").innerText = `${chartMetricLabel(state.chartMetric)} by ${modeLabel}`;
}

function updateChartTheme() {
  renderChart();
}

// ---- Table ----
function getFilteredItems(items) {
  return items.filter(i => {
    if (state.reportFilter !== "all" && i.report !== state.reportFilter) return false;
    if (state.statusFilter !== "all" && i.status !== state.statusFilter) return false;
    if (state.assigneeFilter !== "all" && i.assignee !== state.assigneeFilter) return false;
    if (state.search && !String(i.task + " " + i.notes).toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });
}

function statusBadgeClass(status) {
  if (status === "COMPLETED") return "badge-green";
  if (status === "IN PROGRESS") return "badge-orange";
  return "badge-red";
}

function reportBadgeClass(report) {
  if (report === "STORE DISPATCH") return "badge-blue";
  if (report === "INVENTORY") return "badge-green";
  if (report === "RTV") return "badge-orange";
  return "badge-blue";
}

function renderTable() {
  const tableBody = document.getElementById("workTableBody");
  const countLabel = document.getElementById("workCountLabel");
  const assigneeFilter = document.getElementById("workAssigneeFilter");

  const all = collectWorkItems();
  const filtered = getFilteredItems(all);

  countLabel.innerText = `${filtered.length} of ${all.length} items`;

  // Rebuild assignee filter options (preserve selection)
  const assignees = [...new Set(all.map(i => i.assignee).filter(Boolean))].sort();
  assigneeFilter.innerHTML = `<option value="all" selected>All Assignees</option>` +
    assignees.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
  assigneeFilter.value = state.assigneeFilter;

  tableBody.innerHTML = "";
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px;">No work items match the current filters. Submit work in any report, or click "Add Work Entry".</td></tr>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    let av = a[state.sortKey];
    let bv = b[state.sortKey];
    if (state.sortKey === "date") {
      av = a.date || "";
      bv = b.date || "";
      return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    }
    if (typeof av === "number" && typeof bv === "number") {
      return state.sortDir === "asc" ? av - bv : bv - av;
    }
    return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  sorted.forEach(item => {
    const tr = document.createElement("tr");
    const isManual = item.source === "manual";
    const notes = (item.notes || "-").slice(0, 90);
    tr.innerHTML = `
      <td><span class="badge ${reportBadgeClass(item.report)}">${escapeHtml(item.report)}</span></td>
      <td>${escapeHtml(item.workType || "-")}</td>
      <td style="font-weight: 600;">${escapeHtml(item.task || "-")}</td>
      <td>${escapeHtml(item.assignee || "-")}</td>
      <td>${formatDate(item.date)}</td>
      <td>${fmtInt(item.qty)}</td>
      <td><span class="badge ${statusBadgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${isManual
        ? '<span class="tag-badge" style="background-color: rgba(96, 165, 250, 0.12); color: #60a5fa; border-color: rgba(96, 165, 250, 0.3);">MANUAL</span>'
        : '<span class="tag-badge" style="background-color: rgba(45, 212, 191, 0.12); color: var(--accent-blue); border-color: rgba(45, 212, 191, 0.3);">SYNCED</span>'}</td>
      <td title="${escapeHtml(item.notes || "")}">${escapeHtml(notes)}</td>
      <td class="table-actions">${isManual
        ? `<button class="btn btn-secondary btn-icon" title="Edit work entry" onclick="openWorkDialog('${item.id}')">${SVG_ICONS.edit}</button>
           <button class="btn btn-danger btn-icon" title="Delete work entry" onclick="deleteWork('${item.id}')">${SVG_ICONS.delete}</button>`
        : `<span style="color: var(--text-muted); font-size: 0.75rem;">auto</span>`}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ---- Productivity & Recommendations ----
function renderProductivity(items) {
  const list = document.getElementById("productivityList");
  list.innerHTML = "";

  const byAssignee = {};
  items.forEach(i => {
    const a = i.assignee || "Unassigned";
    if (!byAssignee[a]) byAssignee[a] = { total: 0, completed: 0, qty: 0 };
    byAssignee[a].total += 1;
    if (i.status === "COMPLETED") byAssignee[a].completed += 1;
    byAssignee[a].qty += i.qty || 0;
  });

  const rows = Object.entries(byAssignee)
    .map(([name, v]) => ({ name, ...v, rate: v.total > 0 ? (v.completed / v.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    list.innerHTML = `<div class="info-item"><span class="info-item-label">No work</span><span class="info-item-value">No assignees recorded yet.</span></div>`;
    return;
  }

  rows.forEach(r => {
    const div = document.createElement("div");
    div.className = "info-item";
    div.style.alignItems = "center";
    div.innerHTML = `
      <span class="info-item-label" style="min-width: 150px;">${escapeHtml(r.name)}</span>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary);">
          <span>${r.completed} / ${r.total} done</span>
          <span>${fmtInt(r.qty)} units</span>
        </div>
        <div style="height: 6px; border-radius: 99px; background: rgba(148, 163, 184, 0.15); overflow: hidden;">
          <div style="width: ${r.rate}%; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent-blue), var(--accent-green));"></div>
        </div>
      </div>
      <span class="info-item-value" style="min-width: 70px; text-align: right;">${r.rate.toFixed(0)}%</span>
    `;
    list.appendChild(div);
  });
}

function renderRecommendations(items) {
  const list = document.getElementById("recommendationsList");
  list.innerHTML = "";

  const kpi = computeKPIs(items);
  const recs = [];

  const pendingDispatch = items.filter(i => i.report === "STORE DISPATCH" && i.status !== "COMPLETED").length;
  const pendingInventory = items.filter(i => i.report === "INVENTORY" && i.status !== "COMPLETED").length;
  const pendingRtv = items.filter(i => i.report === "RTV" && i.status !== "COMPLETED").length;
  const pendingManual = items.filter(i => i.report === "MANUAL" && i.status !== "COMPLETED").length;

  if (kpi.total > 0) {
    recs.push({
      tag: "COMPLETION",
      tagColor: kpi.completionRate >= 80 ? "rgba(34, 197, 94, 0.15)" : (kpi.completionRate >= 50 ? "rgba(251, 191, 36, 0.15)" : "rgba(248, 113, 113, 0.15)"),
      tagTextColor: kpi.completionRate >= 80 ? "var(--accent-green)" : (kpi.completionRate >= 50 ? "var(--accent-orange)" : "var(--accent-red)"),
      text: kpi.completionRate >= 80
        ? `<strong>${kpi.completionRate.toFixed(1)}% completion</strong> &mdash; team is on track. Maintain current dispatch and counting velocity.`
        : kpi.completionRate >= 50
          ? `<strong>${kpi.completionRate.toFixed(1)}% completion</strong> &mdash; healthy progress, but ${fmtInt(kpi.pending)} items still need action before shift end.`
          : `<strong>${kpi.completionRate.toFixed(1)}% completion</strong> &mdash; low close-out rate. Prioritise ${fmtInt(kpi.pending)} pending items to avoid backlog.`
    });
  }

  if (pendingDispatch > 0) {
    recs.push({
      tag: "DISPATCH",
      tagColor: "rgba(45, 212, 191, 0.15)",
      tagTextColor: "var(--accent-blue)",
      text: `<strong>${fmtInt(pendingDispatch)} dispatch task${pendingDispatch !== 1 ? "s" : ""} not yet completed.</strong> Cross-check PO vs dispatched qty and update store statuses in the Store Dispatch report to sync this dashboard.`
    });
  }

  if (pendingInventory > 0) {
    recs.push({
      tag: "CYCLE COUNT",
      tagColor: "rgba(34, 197, 94, 0.15)",
      tagTextColor: "var(--accent-green)",
      text: `<strong>${fmtInt(pendingInventory)} SKU${pendingInventory !== 1 ? "s" : ""} with variance</strong> flagged for recount or reconciliation. Update physical counts in the Inventory Cycle Count report to close them out here.`
    });
  }

  if (pendingRtv > 0) {
    recs.push({
      tag: "RETURNS",
      tagColor: "rgba(251, 191, 36, 0.15)",
      tagTextColor: "var(--accent-orange)",
      text: `<strong>${fmtInt(pendingRtv)} return batch${pendingRtv !== 1 ? "es" : ""} awaiting processing.</strong> Finish unboxing, video upload, and courier booking in the RTV report to complete them.`
    });
  }

  if (pendingManual > 0) {
    recs.push({
      tag: "MANUAL",
      tagColor: "rgba(96, 165, 250, 0.15)",
      tagTextColor: "#60a5fa",
      text: `<strong>${fmtInt(pendingManual)} manual work item${pendingManual !== 1 ? "s" : ""} still open.</strong> Update their status in the Daily Work Log so today's report reflects actual effort.`
    });
  }

  if (recs.length === 0) {
    recs.push({
      tag: "NO DATA",
      tagColor: "rgba(148, 163, 184, 0.12)",
      tagTextColor: "var(--text-secondary)",
      text: `Submit work in any report (Store Dispatch, Inventory, RTV) or add a manual entry to generate insights.`
    });
  }

  recs.forEach(r => {
    const div = document.createElement("div");
    div.className = "recommendation-row";
    div.innerHTML = `
      <span class="tag-badge" style="background-color: ${r.tagColor}; color: ${r.tagTextColor}; border-color: ${r.tagColor};">${r.tag}</span>
      <span class="recommendation-text">${r.text}</span>
    `;
    list.appendChild(div);
  });
}

// ---- Render ----
function renderDashboard() {
  const items = collectWorkItems();

  renderKPIs(computeKPIs(items));
  renderChart();
  syncChartControls();
  renderTable();
  renderProductivity(items);
  renderRecommendations(items);

  document.getElementById("headerWorkDate").innerText = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const footerText = document.getElementById("footerText");
  if (footerText) footerText.innerText = `Supply Chain & Warehouse Management | Daily Work Report (${todayISO()})`;
}

// ---- Manual entry storage ----
function loadManual() {
  state.manual = read(DAILY_WORK_STORAGE_KEY);
}

function saveManual() {
  try {
    localStorage.setItem(DAILY_WORK_STORAGE_KEY, JSON.stringify(state.manual));
  } catch (e) {
    console.error("Could not persist manual work entries.", e);
    alert("Work entry could not be saved because browser storage is full.");
    state.manual.pop();
    renderDashboard();
  }
}

// ---- Manual entry CRUD ----
function openWorkDialog(id) {
  const dialog = document.getElementById("workDialog");
  const form = document.getElementById("workForm");
  state.editingId = id || null;
  form.reset();

  const today = todayISO();
  document.getElementById("workDate").value = today;
  document.getElementById("workStatus").value = "PENDING";
  document.getElementById("workAssignee").value = "Pushpendra";

  document.getElementById("workDialogTitle").innerText = id ? "Edit Work Entry" : "Add Work Entry";
  document.getElementById("formWorkId").value = id || "";

  if (id) {
    const item = state.manual.find(m => m.id === id);
    if (item) {
      document.getElementById("workType").value = item.workType || "Other";
      document.getElementById("workTask").value = item.task || "";
      document.getElementById("workAssignee").value = item.assignee || "";
      document.getElementById("workDate").value = item.date || today;
      document.getElementById("workQty").value = item.qty || "";
      document.getElementById("workStatus").value = item.status || "PENDING";
      document.getElementById("workNotes").value = item.notes || "";
    }
  }

  dialog.showModal();
}

function deleteWork(id) {
  if (!confirm("Delete this manual work entry? Synced items from other reports cannot be deleted here.")) return;
  state.manual = state.manual.filter(m => m.id !== id);
  saveManual();
  renderDashboard();
}

function exportCsv() {
  let csv = "data:text/csv;charset=utf-8,";
  csv += "Work Type,Task,Assignee,Date,Qty,Status,Notes\n";
  state.manual.forEach(m => {
    csv += [`"${m.workType || ""}"`, `"${m.task || ""}"`, `"${m.assignee || ""}"`, `"${m.date || ""}"`, m.qty || 0, `"${m.status || ""}"`, `"${m.notes || ""}"`].join(",") + "\n";
  });
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(csv));
  a.setAttribute("download", `daily_work_report_${todayISO()}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---- Import (manual entries only) ----
async function handleImport(file) {
  const ALIASES = {
    workType: ["Work Type", "Type", "workType"],
    task: ["Task", "Task / Activity", "Activity", "task"],
    assignee: ["Assignee", "Assigned To", "assignee"],
    date: ["Date", "Work Date", "date"],
    qty: ["Qty", "Qty / Units Handled", "Units Handled", "qty"],
    status: ["Status", "status"],
    notes: ["Notes", "notes"]
  };

  await BulkImport.openImport({
    file,
    fieldAliases: ALIASES,
    existingCount: state.manual.length,
    previewColumns: [
      { field: "workType", label: "Work Type" },
      { field: "task", label: "Task / Activity" },
      { field: "assignee", label: "Assignee" },
      { field: "date", label: "Date" },
      { field: "qty", label: "Qty" },
      { field: "status", label: "Status" },
      { field: "notes", label: "Notes" }
    ],
    transformRow: (row) => {
      const errors = [];
      const workType = BulkImport.parseText(row.workType) || "Other";
      const task = BulkImport.parseText(row.task);
      if (!task) errors.push("Task / Activity is required");
      const assignee = BulkImport.parseText(row.assignee);
      if (!assignee) errors.push("Assignee is required");
      const date = BulkImport.parseDate(row.date, errors) || new Date().toISOString().split("T")[0];
      const qty = BulkImport.parseNumber(row.qty, errors, "Qty");
      if (qty !== null && qty < 0) errors.push("Qty cannot be negative");
      const statusRes = BulkImport.parseEnum(row.status, WORK_STATUSES, "Status");
      if (statusRes.error) errors.push(statusRes.error);
      const notes = BulkImport.parseText(row.notes) || "-";
      return {
        errors,
        value: {
          workType, task, assignee, date,
          qty: qty ?? 0,
          status: statusRes.value || "PENDING",
          notes
        }
      };
    },
    onImport: (records) => {
      const ts = Date.now();
      state.manual = records.map((r, i) => ({ id: `work-${ts}-${i}`, source: "manual", ...r }));
      saveManual();
      renderDashboard();
      alert(`Successfully imported ${records.length} work entr${records.length !== 1 ? "ies" : "y"}.`);
    }
  });
}

// ---- Setup ----
function updateThemeIcon() {
  const icon = document.getElementById("themeIcon");
  icon.innerHTML = state.theme === "dark" ? SVG_ICONS.sun : SVG_ICONS.moon;
  icon.setAttribute("stroke", state.theme === "dark" ? "#f59e0b" : "#1e293b");
}

function setupEventListeners() {
  const dialog = document.getElementById("workDialog");
  const form = document.getElementById("workForm");

  document.getElementById("themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    localStorage.setItem("warehouse_dashboard_theme", state.theme);
    updateThemeIcon();
    renderChart();
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadManual();
    renderDashboard();
  });

  document.getElementById("addWorkBtn").addEventListener("click", () => openWorkDialog(null));
  document.getElementById("closeWorkDialogBtn").addEventListener("click", () => dialog.close());
  document.getElementById("cancelWorkDialogBtn").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("formWorkId").value;
    const entry = {
      id: id || "work-" + Date.now(),
      workType: document.getElementById("workType").value,
      task: document.getElementById("workTask").value.trim(),
      assignee: document.getElementById("workAssignee").value.trim(),
      date: document.getElementById("workDate").value,
      qty: parseInt(document.getElementById("workQty").value) || 0,
      status: document.getElementById("workStatus").value,
      notes: document.getElementById("workNotes").value.trim() || "-"
    };
    if (id) {
      const idx = state.manual.findIndex(m => m.id === id);
      if (idx !== -1) state.manual[idx] = entry;
    } else {
      state.manual.unshift(entry);
    }
    saveManual();
    dialog.close();
    renderDashboard();
  });

  const importBtn = document.getElementById("importBtn");
  const fileInput = document.getElementById("fileInput");
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileInput.value = "";
    await handleImport(file);
  });

  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Erase all manual work entries? Synced items from other reports are not affected.")) {
      state.manual = [];
      localStorage.removeItem(DAILY_WORK_STORAGE_KEY);
      renderDashboard();
    }
  });

  // Chart controls
  const chartType = document.getElementById("chartType");
  const chartMetric = document.getElementById("chartMetric");
  chartType.addEventListener("change", () => { state.chartType = chartType.value; renderChart(); syncChartControls(); });
  chartMetric.addEventListener("change", () => { state.chartMetric = chartMetric.value; renderChart(); syncChartControls(); });

  const modes = [
    ["filterByReport", "report"],
    ["filterByStatus", "status"],
    ["filterByAssignee", "assignee"]
  ];
  modes.forEach(([id, mode]) => {
    document.getElementById(id).addEventListener("click", () => {
      state.chartMode = mode;
      renderChart();
      syncChartControls();
    });
  });

  // Work log filters
  document.getElementById("workReportFilter").addEventListener("change", (e) => {
    state.reportFilter = e.target.value;
    renderTable();
  });
  document.getElementById("workStatusFilter").addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    renderTable();
  });
  document.getElementById("workAssigneeFilter").addEventListener("change", (e) => {
    state.assigneeFilter = e.target.value;
    renderTable();
  });
  document.getElementById("workSearch").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderTable();
  });

  // Sortable columns
  document.querySelectorAll("#workTable th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      renderTable();
    });
  });

  // Live re-sync when any report updates (cross-tab / same-tab)
  window.addEventListener("storage", (e) => {
    if (Object.values(REPORT_SOURCES).includes(e.key) || e.key === DAILY_WORK_STORAGE_KEY || e.key === "warehouse_dashboard_theme") {
      loadManual();
      if (e.key === "warehouse_dashboard_theme") {
        state.theme = localStorage.getItem("warehouse_dashboard_theme") || "dark";
        document.documentElement.setAttribute("data-theme", state.theme);
        updateThemeIcon();
      }
      renderDashboard();
    }
  });
}

// Load and Initialize App State
function initApp() {
  state.theme = localStorage.getItem("warehouse_dashboard_theme") || "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();
  loadManual();
  setupEventListeners();
  renderDashboard();
}

window.addEventListener("DOMContentLoaded", initApp);
