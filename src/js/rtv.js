// Default Return to Vendor/Origin Dataset
const DEFAULT_ENTRIES = [
  { id: "rtv-1", warehouseLocation: "Amazon FC - Bhiwandi", channelName: "Amazon", receiveDate: "2026-07-30", receivedQty: 150, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-2", warehouseLocation: "Amazon FC - Bhiwandi", channelName: "Amazon", receiveDate: "2026-07-31", receivedQty: 85, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-3", warehouseLocation: "Flipkart WH - Bhiwandi", channelName: "Flipkart", receiveDate: "2026-07-31", receivedQty: 120, unboxingStatus: "IN PROGRESS", videoUploadStatus: "UPLOADED", booking: "IN PROGRESS", notes: "Mixed SKU batch" },
  { id: "rtv-4", warehouseLocation: "Flipkart WH - Bhiwandi", channelName: "Flipkart", receiveDate: "2026-08-01", receivedQty: 60, unboxingStatus: "PENDING", videoUploadStatus: "NOT UPLOADED", booking: "NOT BOOKED", notes: "Awaiting unboxing" },
  { id: "rtv-5", warehouseLocation: "Meesho Hub - Mumbai", channelName: "Meesho", receiveDate: "2026-08-01", receivedQty: 200, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-6", warehouseLocation: "Meesho Hub - Mumbai", channelName: "Meesho", receiveDate: "2026-08-02", receivedQty: 45, unboxingStatus: "DONE", videoUploadStatus: "NOT UPLOADED", booking: "IN PROGRESS", notes: "Video pending review" },
  { id: "rtv-7", warehouseLocation: "Myntra WH - Bhiwandi", channelName: "Myntra", receiveDate: "2026-08-01", receivedQty: 90, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-8", warehouseLocation: "Myntra WH - Bhiwandi", channelName: "Myntra", receiveDate: "2026-08-02", receivedQty: 30, unboxingStatus: "PENDING", videoUploadStatus: "NOT UPLOADED", booking: "NOT BOOKED", notes: "Damaged carton" },
  { id: "rtv-9", warehouseLocation: "Ugaoo B2B - Pune", channelName: "Direct B2B", receiveDate: "2026-08-01", receivedQty: 55, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-10", warehouseLocation: "Ugaoo B2B - Pune", channelName: "Direct B2B", receiveDate: "2026-08-02", receivedQty: 35, unboxingStatus: "IN PROGRESS", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "Partial return" },
  { id: "rtv-11", warehouseLocation: "Amazon FC - Bhiwandi", channelName: "Amazon", receiveDate: "2026-08-02", receivedQty: 70, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "BOOKED", notes: "-" },
  { id: "rtv-12", warehouseLocation: "Flipkart WH - Bhiwandi", channelName: "Flipkart", receiveDate: "2026-08-02", receivedQty: 95, unboxingStatus: "DONE", videoUploadStatus: "UPLOADED", booking: "IN PROGRESS", notes: "Booking in queue" }
];

// State Manager
let state = {
  entries: [],
  theme: "dark",
  editingId: null,
  chartType: "doughnut",
  sortKey: "receiveDate",
  sortDir: "desc"
};

// SVG Icon Helpers
const SVG_ICONS = {
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`
};

// Date Format Utility: YYYY-MM-DD -> DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Completion helper: entry fully processed when unboxed, video uploaded and booked
function isCompleted(entry) {
  return entry.unboxingStatus === "DONE" && entry.videoUploadStatus === "UPLOADED" && entry.booking === "BOOKED";
}

function getUnboxingClass(status) {
  return status === "DONE" ? "badge-green" : (status === "IN PROGRESS" ? "badge-orange" : "badge-red");
}

function getVideoClass(status) {
  return status === "UPLOADED" ? "badge-green" : "badge-orange";
}

function getBookingClass(status) {
  return status === "BOOKED" ? "badge-green" : (status === "IN PROGRESS" ? "badge-orange" : "badge-red");
}

// Load and Initialize App State
function initApp() {
  const savedEntries = localStorage.getItem("rtv_entries_v1");
  if (savedEntries) {
    try {
      state.entries = JSON.parse(savedEntries);
    } catch (e) {
      console.error("Error parsing saved RTV data, falling back to default.", e);
      state.entries = [...DEFAULT_ENTRIES];
    }
  } else {
    state.entries = [...DEFAULT_ENTRIES];
    saveState();
  }

  const savedTheme = localStorage.getItem("warehouse_dashboard_theme");
  if (savedTheme) {
    state.theme = savedTheme;
  }
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();

  setupEventListeners();

  // Date range filter (defaults to latest day; rest stays saved in cloud)
  if (window.DateFilter) {
    DateFilter.init({ onApply: () => renderDashboard() });
  }

  renderDashboard();

  // Pull cloud data into LocalStorage (falls back silently when offline)
  syncFromCloud();
}

function saveState() {
  localStorage.setItem("rtv_entries_v1", JSON.stringify(state.entries));
  if (window.DataService) DataService.push("RTV", state.entries);
}

async function syncFromCloud() {
  if (!window.DataService || !DataService.ready) return;
  const merged = await DataService.syncTable("RTV", state.entries);
  if (merged) {
    state.entries = merged;
    saveState();
    renderDashboard();
  }
}

// Set up UI Interaction Event Listeners
function setupEventListeners() {
  const dialog = document.getElementById("entryDialog");
  const addEntryBtn = document.getElementById("addEntryBtn");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelDialogBtn = document.getElementById("cancelDialogBtn");
  const entryForm = document.getElementById("entryForm");
  const themeToggle = document.getElementById("themeToggle");
  const importBtn = document.getElementById("importBtn");
  const fileInput = document.getElementById("fileInput");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Dialog Opening
  addEntryBtn.addEventListener("click", () => {
    state.editingId = null;
    document.getElementById("dialogTitle").innerText = "Add Return Entry";
    entryForm.reset();
    document.getElementById("formEntryId").value = "";

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("receiveDate").value = today;
    document.getElementById("unboxingStatus").value = "PENDING";
    document.getElementById("videoUploadStatus").value = "NOT UPLOADED";
    document.getElementById("booking").value = "NOT BOOKED";

    dialog.showModal();
  });

  // Dialog Closing
  const closeDialog = () => {
    dialog.close();
  };
  closeDialogBtn.addEventListener("click", closeDialog);
  cancelDialogBtn.addEventListener("click", closeDialog);

  // Fallback for click outside dialog (backdrop dismiss)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        dialog.close();
      }
    });
  }

  // Form Submission (Add / Edit)
  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("formEntryId").value;
    const warehouseLocation = document.getElementById("warehouseLocation").value;
    const channelName = document.getElementById("channelName").value;
    const receiveDate = document.getElementById("receiveDate").value;
    const receivedQty = parseInt(document.getElementById("receivedQty").value) || 0;
    const unboxingStatus = document.getElementById("unboxingStatus").value;
    const videoUploadStatus = document.getElementById("videoUploadStatus").value;
    const booking = document.getElementById("booking").value;
    const notes = document.getElementById("notes").value || "-";

    if (id) {
      const index = state.entries.findIndex(s => s.id === id);
      if (index !== -1) {
        state.entries[index] = {
          id, warehouseLocation, channelName, receiveDate, receivedQty, unboxingStatus, videoUploadStatus, booking, notes
        };
      }
    } else {
      const newEntry = {
        id: "rtv-" + Date.now(),
        warehouseLocation, channelName, receiveDate, receivedQty, unboxingStatus, videoUploadStatus, booking, notes
      };
      state.entries.push(newEntry);
    }

    saveState();
    dialog.close();
    renderDashboard();
  });

  // Theme Toggle
  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    localStorage.setItem("warehouse_dashboard_theme", state.theme);
    updateThemeIcon();
    renderDashboard();
  });

  // Import JSON Trigger
  importBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileInput.value = "";

    const ALIASES = {
      warehouseLocation: ["Customer Warehouse Location", "Warehouse Location", "Location", "warehouseLocation"],
      channelName: ["Channel Name", "Channel", "channelName"],
      receiveDate: ["Receive Date", "Received Date", "receiveDate"],
      receivedQty: ["Received Qty", "Received Quantity", "Qty Received", "receivedQty"],
      unboxingStatus: ["Unboxing Status", "unboxingStatus"],
      videoUploadStatus: ["Video Upload Status", "videoUploadStatus"],
      booking: ["Booking", "booking"],
      notes: ["Notes", "Note", "notes"]
    };
    const UNBOXING_STATUSES = ["PENDING", "IN PROGRESS", "DONE"];
    const VIDEO_STATUSES = ["UPLOADED", "NOT UPLOADED"];
    const BOOKING_STATUSES = ["BOOKED", "NOT BOOKED", "IN PROGRESS"];

    await BulkImport.openImport({
      file,
      fieldAliases: ALIASES,
      existingCount: state.entries.length,
      previewColumns: [
        { field: "warehouseLocation", label: "Customer Warehouse Location" },
        { field: "channelName", label: "Channel Name" },
        { field: "receiveDate", label: "Receive Date" },
        { field: "receivedQty", label: "Received Qty" },
        { field: "unboxingStatus", label: "Unboxing Status" },
        { field: "videoUploadStatus", label: "Video Upload Status" },
        { field: "booking", label: "Booking" }
      ],
      transformRow: (row) => {
        const errors = [];
        const warehouseLocation = BulkImport.parseText(row.warehouseLocation);
        if (!warehouseLocation) errors.push("Customer Warehouse Location is required");

        const channelName = BulkImport.parseText(row.channelName);
        if (!channelName) errors.push("Channel Name is required");

        const receiveDate = BulkImport.parseDate(row.receiveDate, errors);

        const receivedQty = BulkImport.parseNumber(row.receivedQty, errors, "Received Qty");
        if (receivedQty !== null && receivedQty < 0) errors.push("Received Qty cannot be negative");

        const unboxingRes = BulkImport.parseEnum(row.unboxingStatus, UNBOXING_STATUSES, "Unboxing Status");
        if (unboxingRes.error) errors.push(unboxingRes.error);

        const videoRes = BulkImport.parseEnum(row.videoUploadStatus, VIDEO_STATUSES, "Video Upload Status");
        if (videoRes.error) errors.push(videoRes.error);

        const bookingRes = BulkImport.parseEnum(row.booking, BOOKING_STATUSES, "Booking");
        if (bookingRes.error) errors.push(bookingRes.error);

        const notes = BulkImport.parseText(row.notes) || "-";

        return {
          errors,
          value: {
            warehouseLocation,
            channelName,
            receiveDate,
            receivedQty: receivedQty ?? 0,
            unboxingStatus: unboxingRes.value,
            videoUploadStatus: videoRes.value,
            booking: bookingRes.value,
            notes
          }
        };
      },
      onImport: (records) => {
        const ts = Date.now();
        state.entries = records.map((r, i) => ({ id: `rtv-${ts}-${i}`, ...r }));
        saveState();
        renderDashboard();
        alert(`Successfully imported ${records.length} return entry${records.length !== 1 ? "s" : ""}.`);
      }
    });
  });

  // Export JSON
  exportJsonBtn.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.entries, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `return_to_vendor_report_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Export CSV
  exportCsvBtn.addEventListener("click", () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Customer Warehouse Location,Channel Name,Receive Date,Received Qty,Unboxing Status,Video Upload Status,Booking,Notes\n";

    state.entries.forEach(s => {
      const row = [
        `"${s.warehouseLocation}"`,
        `"${s.channelName}"`,
        `"${formatDate(s.receiveDate)}"`,
        s.receivedQty,
        `"${s.unboxingStatus}"`,
        `"${s.videoUploadStatus}"`,
        `"${s.booking}"`,
        `"${s.notes || '-'}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `return_to_vendor_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Print PDF View
  printBtn.addEventListener("click", () => {
    window.print();
  });

  // Reset All Data
  resetBtn.addEventListener("click", () => {
    if (confirm("Erase all return entry data? This cannot be undone.")) {
      state.entries = [];
      saveState();
      renderDashboard();
    }
  });

  // Sortable Table Headers
  document.querySelectorAll("#rtvTable th.sortable").forEach(th => {
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

  // Chart Type Select
  const chartTypeSelect = document.getElementById("chartType");
  chartTypeSelect.addEventListener("change", () => {
    state.chartType = chartTypeSelect.value;
    renderWarehouseChart();
  });
}

function updateThemeIcon() {
  const themeIcon = document.getElementById("themeIcon");
  if (state.theme === "dark") {
    themeIcon.innerHTML = SVG_ICONS.sun;
    themeIcon.setAttribute("stroke", "#f59e0b");
  } else {
    themeIcon.innerHTML = SVG_ICONS.moon;
    themeIcon.setAttribute("stroke", "#1e293b");
  }
}

// Global reference for Chart.js instances
const chartInstances = {};

if (typeof ChartDataLabels !== "undefined") {
  Chart.register(ChartDataLabels);
}

function buildChart(canvasId, type, labels, datasets, isDark, tooltipLabel, legendPosition, dataLabelFormatter) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const textColor = isDark ? "#9ca3af" : "#475569";
  const singleSeries = ["pie", "doughnut", "polarArea"].includes(type);
  const isHorizontal = type === "horizontalBar";
  const isCartesian = ["bar", "line", "horizontalBar"].includes(type);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isHorizontal ? "y" : "x",
    cutout: type === "doughnut" ? "55%" : undefined,
    plugins: {
      legend: {
        position: legendPosition || (singleSeries ? "right" : "top"),
        labels: {
          color: textColor,
          font: { family: "Inter" },
          boxWidth: 12,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        titleColor: isDark ? "#ffffff" : "#0f172a",
        bodyColor: isDark ? "#9ca3af" : "#475569",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        borderWidth: 1
      },
      datalabels: {
        color: singleSeries ? "#ffffff" : (isDark ? "#e5e7eb" : "#0f172a"),
        font: { family: "Inter", weight: "bold", size: 11 },
        anchor: singleSeries ? "center" : "end",
        align: singleSeries ? "center" : "end",
        formatter: dataLabelFormatter || ((value) => (typeof value === "number" ? value.toLocaleString() : String(value ?? "")))
      }
    },
    scales: isCartesian ? {
      x: {
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { family: "Inter" },
          maxRotation: isHorizontal ? 0 : 40,
          minRotation: isHorizontal ? 0 : 20,
          autoSkip: true,
          maxTicksLimit: 20
        }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: "Inter" } }
      }
    } : undefined
  };

  if (tooltipLabel) {
    options.plugins.tooltip.callbacks = { label: tooltipLabel };
  }

  if (type === "line") {
    datasets.forEach(d => {
      d.tension = 0.35;
      d.borderWidth = 2;
      d.pointRadius = 3;
    });
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: isHorizontal ? "bar" : type,
    data: { labels, datasets },
    options
  });
}

// Palette used for single-series segment charts
const PALETTE = [
  "#22c55e", "#16a34a", "#2dd4bf", "#a3e635", "#fbbf24", "#f87171",
  "#60a5fa", "#c084fc", "#fb923c", "#34d399", "#4ade80", "#facc15",
  "#38bdf8", "#f472b6", "#a78bfa", "#fb7185"
];

function groupBy(entries, keyFn) {
  const map = {};
  entries.forEach(e => {
    const key = keyFn(e);
    if (!map[key]) map[key] = 0;
    map[key] += e.receivedQty;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function renderWarehouseChart() {
  const isDark = state.theme === "dark";
  const groups = groupBy(state.entries, e => e.warehouseLocation);
  const total = groups.reduce((acc, g) => acc + g[1], 0);

  const labels = groups.map(g => g[0]);
  const pcts = groups.map(g => total > 0 ? (g[1] / total) * 100 : 0);
  const qtyByLabel = {};
  groups.forEach(g => { qtyByLabel[g[0]] = g[1]; });

  const singleSeries = ["pie", "doughnut", "polarArea"].includes(state.chartType);

  buildChart("warehouseChart", state.chartType, labels, [{
    label: "% of Total Volume",
    data: singleSeries ? pcts.map(p => Math.round(p * 100) / 100) : pcts,
    backgroundColor: singleSeries ? labels.map((_, i) => PALETTE[i % PALETTE.length]) : (isDark ? "rgba(45, 212, 191, 0.8)" : "rgba(13, 148, 136, 0.85)"),
    borderColor: isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(255,255,255,0.5)",
    borderWidth: singleSeries ? 1 : 1
  }], isDark, (ctx) => {
    const idx = ctx.dataIndex;
    const label = labels[idx];
    const qty = qtyByLabel[label];
    const pct = pcts[idx];
    return `${label}: ${pct.toFixed(2)}% (${qty.toLocaleString()} units)`;
  }, null, (value) => `${value.toFixed(1)}%`);
}

function renderChannelChart() {
  const isDark = state.theme === "dark";
  const groups = groupBy(state.entries, e => e.channelName);

  buildChart("channelChart", "bar", groups.map(g => g[0]), [{
    label: "Received Qty",
    data: groups.map(g => g[1]),
    backgroundColor: isDark ? "rgba(34, 197, 94, 0.8)" : "rgba(5, 150, 105, 0.85)",
    borderColor: "var(--accent-green)",
    borderWidth: 1,
    borderRadius: 4
  }], isDark);
}

function renderStatusCharts() {
  const isDark = state.theme === "dark";

  const countBy = (keyFn) => {
    const map = {};
    state.entries.forEach(e => {
      const key = keyFn(e);
      if (!map[key]) map[key] = 0;
      map[key]++;
    });
    return map;
  };

  const unboxMap = countBy(e => e.unboxingStatus);
  const unboxLabels = ["DONE", "IN PROGRESS", "PENDING"].filter(k => unboxMap[k]);
  buildChart("unboxingChart", "doughnut", unboxLabels, [{
    label: "Entries",
    data: unboxLabels.map(k => unboxMap[k]),
    backgroundColor: unboxLabels.map(k => k === "DONE" ? "#22c55e" : k === "IN PROGRESS" ? "#fbbf24" : "#f87171"),
    borderColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1
  }], isDark, null, "bottom");

  const videoMap = countBy(e => e.videoUploadStatus);
  const videoLabels = ["UPLOADED", "NOT UPLOADED"].filter(k => videoMap[k]);
  buildChart("videoChart", "doughnut", videoLabels, [{
    label: "Entries",
    data: videoLabels.map(k => videoMap[k]),
    backgroundColor: videoLabels.map(k => k === "UPLOADED" ? "#22c55e" : "#fb923c"),
    borderColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1
  }], isDark, null, "bottom");

  const bookingMap = countBy(e => e.booking);
  const bookingLabels = ["BOOKED", "IN PROGRESS", "NOT BOOKED"].filter(k => bookingMap[k]);
  buildChart("bookingChart", "doughnut", bookingLabels, [{
    label: "Entries",
    data: bookingLabels.map(k => bookingMap[k]),
    backgroundColor: bookingLabels.map(k => k === "BOOKED" ? "#22c55e" : k === "IN PROGRESS" ? "#fbbf24" : "#f87171"),
    borderColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1
  }], isDark, null, "bottom");
}

// Math calculation helper
function calculateKPIs() {
  let totalQtyReturned = 0;
  let completedCount = 0;

  state.entries.forEach(e => {
    totalQtyReturned += e.receivedQty;
    if (isCompleted(e)) {
      completedCount++;
    }
  });

  const totalEntries = state.entries.length;
  const completionScore = totalEntries > 0 ? (completedCount / totalEntries) * 100 : 0;

  // Top location by volume
  let topLocation = null;
  let topQty = 0;
  const locMap = {};
  state.entries.forEach(e => {
    locMap[e.warehouseLocation] = (locMap[e.warehouseLocation] || 0) + e.receivedQty;
  });
  Object.entries(locMap).forEach(([loc, qty]) => {
    if (qty > topQty) {
      topQty = qty;
      topLocation = loc;
    }
  });
  const topPct = totalQtyReturned > 0 ? (topQty / totalQtyReturned) * 100 : 0;

  return {
    totalQtyReturned,
    totalEntries,
    completedCount,
    completionScore,
    topLocation,
    topQty,
    topPct
  };
}

// Edit Return Entry callback
window.editEntry = function(id) {
  const entry = state.entries.find(s => s.id === id);
  if (!entry) return;

  state.editingId = id;
  document.getElementById("dialogTitle").innerText = "Edit Return Entry";
  document.getElementById("formEntryId").value = entry.id;
  document.getElementById("warehouseLocation").value = entry.warehouseLocation;
  document.getElementById("channelName").value = entry.channelName;
  document.getElementById("receiveDate").value = entry.receiveDate;
  document.getElementById("receivedQty").value = entry.receivedQty;
  document.getElementById("unboxingStatus").value = entry.unboxingStatus;
  document.getElementById("videoUploadStatus").value = entry.videoUploadStatus;
  document.getElementById("booking").value = entry.booking;
  document.getElementById("notes").value = entry.notes === "-" ? "" : entry.notes;

  document.getElementById("entryDialog").showModal();
};

// Delete Return Entry callback
window.deleteEntry = function(id) {
  if (confirm("Are you sure you want to delete this return entry?")) {
    state.entries = state.entries.filter(s => s.id !== id);
    saveState();
    renderDashboard();
  }
};

function getEntrySortValue(entry, key) {
  switch (key) {
    case "receivedQty": return entry.receivedQty || 0;
    case "receiveDate": return entry.receiveDate || "";
    default: return String(entry[key] || "").toLowerCase();
  }
}

function renderDashboard() {
  const allEntries = state.entries;
  if (window.DateFilter) {
    state.entries = DateFilter.apply(allEntries, s => s.receiveDate);
    DateFilter.setCount(state.entries.length, allEntries.length);
  }
  try {
  const kpi = calculateKPIs();

  // 1. Update KPI UI values
  document.getElementById("valTotalQtyReturned").innerText = kpi.totalQtyReturned.toLocaleString();
  document.getElementById("subTotalQtyReturned").innerText = `${kpi.totalEntries.toLocaleString()} Return Entries`;

  document.getElementById("valTopLocation").innerText = kpi.topLocation || "-";
  document.getElementById("subTopLocation").innerText = `${kpi.topPct.toFixed(1)}% of Total Volume`;

  document.getElementById("valCompletionScore").innerText = `${kpi.completionScore.toFixed(2)}%`;
  document.getElementById("subCompletionScore").innerText = `${kpi.completedCount} of ${kpi.totalEntries} Entries Completed`;

  document.getElementById("valEntriesProcessed").innerText = kpi.totalEntries.toLocaleString();
  document.getElementById("subEntriesProcessed").innerText = `${new Set(state.entries.map(s => s.channelName)).size.toLocaleString()} Channel Returns Logged`;

  // 2. Render Header metadata based on overall dataset
  const sortedDates = state.entries.map(s => s.receiveDate).filter(Boolean).sort();
  let receiveWindow = "-";
  if (sortedDates.length > 0) {
    receiveWindow = `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  }

  document.getElementById("headerReceiveWindow").innerText = receiveWindow;
  document.getElementById("footerText").innerText = `Supply Chain & Warehouse Management | Return to Vendor/Origin Report (${receiveWindow})`;

  // 3. Render Table
  const tableBody = document.getElementById("rtvTableBody");
  tableBody.innerHTML = "";

  // Update sort indicators on headers
  document.querySelectorAll("#rtvTable th.sortable").forEach(th => {
    th.classList.remove("is-asc", "is-desc");
    if (th.dataset.sort === state.sortKey) {
      th.classList.add(state.sortDir === "asc" ? "is-asc" : "is-desc");
    }
  });

  const sortedEntries = [...state.entries].sort((a, b) => {
    const av = getEntrySortValue(a, state.sortKey);
    const bv = getEntrySortValue(b, state.sortKey);
    if (typeof av === "number" && typeof bv === "number") {
      return state.sortDir === "asc" ? av - bv : bv - av;
    }
    return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  sortedEntries.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${s.warehouseLocation}</td>
      <td>${s.channelName}</td>
      <td>${formatDate(s.receiveDate)}</td>
      <td>${s.receivedQty.toLocaleString()}</td>
      <td><span class="badge ${getUnboxingClass(s.unboxingStatus)}">${s.unboxingStatus}</span></td>
      <td><span class="badge ${getVideoClass(s.videoUploadStatus)}">${s.videoUploadStatus}</span></td>
      <td><span class="badge ${getBookingClass(s.booking)}">${s.booking}</span></td>
      <td style="font-style: italic; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.notes}">${s.notes}</td>
      <td class="table-actions">
        <button class="btn btn-secondary btn-icon" onclick="editEntry('${s.id}')" title="Edit">${SVG_ICONS.edit}</button>
        <button class="btn btn-danger btn-icon" onclick="deleteEntry('${s.id}')" title="Delete">${SVG_ICONS.delete}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Render Summary Row in Table if there are entries
  if (state.entries.length > 0) {
    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${kpi.totalEntries} Entr${kpi.totalEntries !== 1 ? 'ies' : 'y'})</td>
      <td>-</td>
      <td>-</td>
      <td><span style="color: var(--accent-blue); font-weight: 600;">${kpi.totalQtyReturned.toLocaleString()}</span></td>
      <td><span class="badge badge-green">DONE</span></td>
      <td><span class="badge badge-green">UPLOADED</span></td>
      <td><span class="badge badge-green">BOOKED</span></td>
      <td>-</td>
      <td class="table-actions"></td>
    `;
    tableBody.appendChild(summaryTr);
  } else {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">No return entries found. Click "Add Return Entry" to create one.</td></tr>`;
  }

  // 4. Render Dynamic Return Processing & Root Cause Analysis
  renderRootCauseAnalysis(kpi);

  // 5. Render Dynamic Action Items & Strategic Recommendations
  renderRecommendations(kpi);

  // 6. Draw Charts
  renderWarehouseChart();
  renderChannelChart();
  renderStatusCharts();
  } finally {
    state.entries = allEntries;
  }
}

function renderRootCauseAnalysis(kpi) {
  const container = document.getElementById("rootCauseList");
  container.innerHTML = "";

  if (state.entries.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No analysis data available.</div>`;
    return;
  }

  const pendingProcessing = state.entries.filter(e => !isCompleted(e));
  const pendingUnboxing = state.entries.filter(e => e.unboxingStatus !== "DONE");
  const pendingVideo = state.entries.filter(e => e.videoUploadStatus !== "UPLOADED");
  const pendingBooking = state.entries.filter(e => e.booking !== "BOOKED");

  // 1. Pending Processing Highlight
  if (pendingProcessing.length > 0) {
    const pendingQty = pendingProcessing.reduce((acc, e) => acc + e.receivedQty, 0);

    const item = document.createElement("div");
    item.className = "recommendation-row";
    item.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(248,113,113,0.25);">PENDING PROCESSING</span>
      <div class="recommendation-text">
        <strong>${pendingProcessing.length} of ${state.entries.length} entries</strong> (${pendingQty.toLocaleString()} units) have not completed the full return cycle. Complete unboxing, video upload and booking before disposition back to vendor/origin.
      </div>
    `;
    container.appendChild(item);
  }

  // 2. Unboxing Pending
  if (pendingUnboxing.length > 0) {
    const item = document.createElement("div");
    item.className = "recommendation-row";
    item.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">UNBOXING PENDING</span>
      <div class="recommendation-text">
        <strong>Unboxing Status:</strong> ${pendingUnboxing.length} entry${pendingUnboxing.length !== 1 ? 's' : ''} are awaiting or mid-way through unboxing. Prioritize ${pendingUnboxing.map(e => e.warehouseLocation).join(", ")} batches.
      </div>
    `;
    container.appendChild(item);
  }

  // 3. Video Upload Pending
  if (pendingVideo.length > 0) {
    const item = document.createElement("div");
    item.className = "recommendation-row";
    item.innerHTML = `
      <span class="tag-badge">VIDEO UPLOAD</span>
      <div class="recommendation-text">
        <strong>Video Upload Status:</strong> ${pendingVideo.length} entry${pendingVideo.length !== 1 ? 's' : ''} have not had their unboxing video uploaded. Upload to complete the visual verification record.
      </div>
    `;
    container.appendChild(item);
  }

  // 4. Booking Pending
  if (pendingBooking.length > 0) {
    const item = document.createElement("div");
    item.className = "recommendation-row";
    item.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">BOOKING PENDING</span>
      <div class="recommendation-text">
        <strong>Booking Status:</strong> ${pendingBooking.length} entry${pendingBooking.length !== 1 ? 's' : ''} are not yet booked for return dispatch to the vendor/origin.
      </div>
    `;
    container.appendChild(item);
  }

  // 5. Verification & Audit details
  const item = document.createElement("div");
  item.className = "recommendation-row";
  item.innerHTML = `
    <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">VERIFICATION</span>
    <div class="recommendation-text">
      <strong>Verification & Audit:</strong> Return receipts were received and logged by <strong>Pushpendra</strong> across the window <strong>${document.getElementById("headerReceiveWindow").innerText}</strong>.
    </div>
  `;
  container.appendChild(item);
}

function renderRecommendations(kpi) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  if (state.entries.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No recommendations available.</div>`;
    return;
  }

  const pendingProcessing = state.entries.filter(e => !isCompleted(e));
  const pendingBooking = state.entries.filter(e => e.booking !== "BOOKED");

  // 1. Processing focus if completion below 90%
  if (kpi.completionScore < 90 && pendingProcessing.length > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">PROCESSING FOCUS</span>
      <div class="recommendation-text">
        <strong>Completion Score Warning:</strong> Current completion is <strong>${kpi.completionScore.toFixed(2)}%</strong> (below the 90% baseline). Clear the backlog of ${pendingProcessing.length} incomplete entries by end of cycle.
      </div>
    `;
    container.appendChild(row);
  }

  // 2. Booking escalation
  if (pendingBooking.length > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">BOOKING ESCALATION</span>
      <div class="recommendation-text">
        <strong>Booking Acceleration:</strong> Raise return bookings for the <strong>${pendingBooking.length} unbooked entries</strong> to keep disposition timelines with the carrier/vendor on track.
      </div>
    `;
    container.appendChild(row);
  }

  // 3. Volume consolidation for top location
  if (kpi.topLocation && kpi.topPct > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge">VOLUME CONSOLIDATION</span>
      <div class="recommendation-text">
        <strong>${kpi.topLocation}</strong> accounts for <strong>${kpi.topPct.toFixed(1)}%</strong> of total return volume (<strong>${kpi.topQty.toLocaleString()} units</strong>). Batch & consolidate pickups from this location for efficient return logistics.
      </div>
    `;
    container.appendChild(row);
  }

  // 4. Optimal state
  if (kpi.completionScore === 100) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">OPERATIONS OK</span>
      <div class="recommendation-text">
        <strong>Optimal Performance:</strong> All return entries are fully processed (unboxed, video uploaded, booked). Maintain current return handling SOPs.
      </div>
    `;
    container.appendChild(row);
  }
}

// Start the Application
window.addEventListener("DOMContentLoaded", initApp);
