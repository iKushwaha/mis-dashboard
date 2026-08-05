// Default Store Dispatch Dataset (5 dummy stores for testing)
const DEFAULT_STORES = [
  {
    id: "store-1",
    storeName: "DLF Phase 1",
    poDate: "2026-07-29",
    dispatchDate: "2026-07-30",
    poQty: 473,
    sentQty: 473,
    itemsInPo: 115,
    verifiedPerson: "Pushpendra",
    status: "DELIVERED",
    reasonOfShortage: "-"
  },
  {
    id: "store-2",
    storeName: "Pacific Mall",
    poDate: "2026-07-29",
    dispatchDate: "2026-07-30",
    poQty: 609,
    sentQty: 598,
    itemsInPo: 71,
    verifiedPerson: "Pushpendra",
    status: "DELIVERED",
    reasonOfShortage: "some Of The Item Block For Future Order"
  },
  {
    id: "store-3",
    storeName: "Select Citywalk",
    poDate: "2026-07-28",
    dispatchDate: "2026-07-30",
    poQty: 1250,
    sentQty: 890,
    itemsInPo: 210,
    verifiedPerson: "Pushpendra",
    status: "SHORTAGE",
    reasonOfShortage: "material not arranged as per Requested"
  },
  {
    id: "store-4",
    storeName: "Ambience Mall",
    poDate: "2026-07-29",
    dispatchDate: "2026-07-30",
    poQty: 840,
    sentQty: 0,
    itemsInPo: 95,
    verifiedPerson: "Pushpendra",
    status: "READY TO DISPATCH",
    reasonOfShortage: "pending clearance before dispatch"
  },
  {
    id: "store-5",
    storeName: "V3S Mall",
    poDate: "2026-07-27",
    dispatchDate: "2026-07-30",
    poQty: 320,
    sentQty: 320,
    itemsInPo: 40,
    verifiedPerson: "Pushpendra",
    status: "IN TRANSIT",
    reasonOfShortage: "-"
  }
];

// State Manager
let state = {
  stores: [],
  theme: "dark",
  editingId: null,
  sortKey: "storeName",
  sortDir: "asc",
  chartMode: "store",
  chartType: "bar",
  chartMetric: "all"
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

// Load and Initialize App State
function initApp() {
  const savedStores = localStorage.getItem("warehouse_dashboard_stores_v2");
  if (savedStores) {
    try {
      state.stores = JSON.parse(savedStores);
    } catch (e) {
      console.error("Error parsing saved stores, falling back to default.", e);
      state.stores = [...DEFAULT_STORES];
    }
  } else {
    state.stores = [...DEFAULT_STORES];
    saveState();
  }

  const savedTheme = localStorage.getItem("warehouse_dashboard_theme");
  if (savedTheme) {
    state.theme = savedTheme;
  }
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();

  // Setup Event Listeners
  setupEventListeners();

  // Render Everything
  renderDashboard();
}

function saveState() {
  localStorage.setItem("warehouse_dashboard_stores_v2", JSON.stringify(state.stores));
}

// Set up UI Interaction Event Listeners
function setupEventListeners() {
  const dialog = document.getElementById("storeDialog");
  const addStoreBtn = document.getElementById("addStoreBtn");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelDialogBtn = document.getElementById("cancelDialogBtn");
  const storeForm = document.getElementById("storeForm");
  const themeToggle = document.getElementById("themeToggle");
  const importBtn = document.getElementById("importBtn");
  const fileInput = document.getElementById("fileInput");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Dialog Opening
  addStoreBtn.addEventListener("click", () => {
    state.editingId = null;
    document.getElementById("dialogTitle").innerText = "Add Store Dispatch";
    storeForm.reset();
    document.getElementById("formStoreId").value = "";
    
    // Set default dates to today for convenience
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("poDate").value = today;
    document.getElementById("dispatchDate").value = today;
    document.getElementById("verifiedPerson").value = "Pushpendra";
    document.getElementById("status").value = "DELIVERED";
    
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
  storeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("formStoreId").value;
    const storeName = document.getElementById("storeName").value;
    const poDate = document.getElementById("poDate").value;
    const dispatchDate = document.getElementById("dispatchDate").value;
    const poQty = parseInt(document.getElementById("poQty").value) || 0;
    const sentQty = parseInt(document.getElementById("sentQty").value) || 0;
    const itemsInPo = parseInt(document.getElementById("itemsInPo").value) || 0;
    const verifiedPerson = document.getElementById("verifiedPerson").value;
    const status = document.getElementById("status").value;
    const reasonOfShortage = document.getElementById("reasonOfShortage").value || "-";

    if (id) {
      // Edit mode
      const index = state.stores.findIndex(s => s.id === id);
      if (index !== -1) {
        state.stores[index] = {
          id, storeName, poDate, dispatchDate, poQty, sentQty, itemsInPo, verifiedPerson, status, reasonOfShortage
        };
      }
    } else {
      // Add mode
      const newStore = {
        id: "store-" + Date.now(),
        storeName, poDate, dispatchDate, poQty, sentQty, itemsInPo, verifiedPerson, status, reasonOfShortage
      };
      state.stores.push(newStore);
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
    updateChartTheme();
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
      storeName: ["Store Name", "Store", "storeName"],
      poDate: ["PO Raised Date", "PO Date", "poDate"],
      dispatchDate: ["Dispatched Date", "Dispatch Date", "dispatchDate"],
      itemsInPo: ["No. of Item in PO", "No. of Items in PO", "Number of Item in PO", "Items in PO", "itemsInPo"],
      poQty: ["PO Qty", "PO Quantity", "poQty"],
      sentQty: ["Sent Qty", "Sent Quantity", "Dispatch Qty", "sentQty"],
      verifiedPerson: ["Verified By", "verifiedPerson"],
      status: ["Status", "status"],
      reasonOfShortage: ["Reason of Shortage", "Shortage Reason", "reasonOfShortage"]
    };
    const STORE_STATUSES = ["DELIVERED", "READY TO DISPATCH", "SHORTAGE", "IN TRANSIT"];

    await BulkImport.openImport({
      file,
      fieldAliases: ALIASES,
      existingCount: state.stores.length,
      previewColumns: [
        { field: "storeName", label: "Store Name" },
        { field: "poDate", label: "PO Raised Date" },
        { field: "dispatchDate", label: "Dispatched Date" },
        { field: "itemsInPo", label: "No. of Item in PO" },
        { field: "poQty", label: "PO Qty" },
        { field: "sentQty", label: "Sent Qty" },
        { field: "verifiedPerson", label: "Verified By" },
        { field: "status", label: "Status" }
      ],
      transformRow: (row) => {
        const errors = [];
        const storeName = BulkImport.parseText(row.storeName);
        if (!storeName) errors.push("Store Name is required");

        const poDate = BulkImport.parseDate(row.poDate, errors);
        const dispatchDate = BulkImport.parseDate(row.dispatchDate, errors);

        const itemsInPo = BulkImport.parseNumber(row.itemsInPo, errors, "No. of Item in PO");
        if (itemsInPo !== null && itemsInPo < 0) errors.push("No. of Item in PO cannot be negative");

        const poQty = BulkImport.parseNumber(row.poQty, errors, "PO Qty");
        if (poQty !== null && poQty < 0) errors.push("PO Qty cannot be negative");

        const sentQty = BulkImport.parseNumber(row.sentQty, errors, "Sent Qty");
        if (sentQty !== null && sentQty < 0) errors.push("Sent Qty cannot be negative");

        const verifiedPerson = BulkImport.parseText(row.verifiedPerson);
        if (!verifiedPerson) errors.push("Verified By is required");

        const statusRes = BulkImport.parseEnum(row.status, STORE_STATUSES, "Status");
        if (statusRes.error) errors.push(statusRes.error);

        const reasonOfShortage = BulkImport.parseText(row.reasonOfShortage) || "-";

        return {
          errors,
          value: {
            storeName,
            poDate,
            dispatchDate,
            itemsInPo: itemsInPo ?? 0,
            poQty: poQty ?? 0,
            sentQty: sentQty ?? 0,
            verifiedPerson,
            status: statusRes.value,
            reasonOfShortage
          }
        };
      },
      onImport: (records) => {
        const ts = Date.now();
        state.stores = records.map((r, i) => ({ id: `store-${ts}-${i}`, ...r }));
        saveState();
        renderDashboard();
        alert(`Successfully imported ${records.length} store dispatch record${records.length !== 1 ? "s" : ""}.`);
      }
    });
  });

  // Export JSON
  exportJsonBtn.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.stores, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `store_dispatch_report_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Export CSV
  exportCsvBtn.addEventListener("click", () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Store Name,PO Raised Date,Dispatched Date,No. of Item in PO,PO Qty,Sent Qty,Shortage Qty,Verified By,Status,Reason of Shortage\n";
    
    state.stores.forEach(s => {
      const shortage = Math.max(0, s.poQty - s.sentQty);
      const row = [
        `"${s.storeName}"`,
        `"${formatDate(s.poDate)}"`,
        `"${formatDate(s.dispatchDate)}"`,
        s.itemsInPo,
        s.poQty,
        s.sentQty,
        shortage,
        `"${s.verifiedPerson}"`,
        `"${s.status}"`,
        `"${s.reasonOfShortage || '-'}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `store_dispatch_report_${new Date().toISOString().split("T")[0]}.csv`);
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
    if (confirm("Erase all store dispatch data? This cannot be undone.")) {
      state.stores = [];
      saveState();
      renderDashboard();
    }
  });

  // Sortable Table Headers
  document.querySelectorAll("#storeTable th.sortable").forEach(th => {
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

  // Interactive Visual Analytics Controls
  const chartTypeSelect = document.getElementById("chartType");
  const chartMetricSelect = document.getElementById("chartMetric");
  const filterByStoreBtn = document.getElementById("filterByStore");
  const filterByStatusBtn = document.getElementById("filterByStatus");

  chartTypeSelect.addEventListener("change", () => {
    state.chartType = chartTypeSelect.value;
    renderChart();
    syncChartControls();
  });

  chartMetricSelect.addEventListener("change", () => {
    state.chartMetric = chartMetricSelect.value;
    renderChart();
    syncChartControls();
  });

  filterByStoreBtn.addEventListener("click", () => {
    state.chartMode = "store";
    renderChart();
    syncChartControls();
  });

  filterByStatusBtn.addEventListener("click", () => {
    state.chartMode = "status";
    renderChart();
    syncChartControls();
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

// Global reference for Chart.js instance
let dispatchChartInstance = null;

const STATUS_ORDER = ["DELIVERED", "READY TO DISPATCH", "IN TRANSIT", "SHORTAGE"];

function getShortage(store) {
  return Math.max(0, (store.poQty || 0) - (store.sentQty || 0));
}

function chartMetricLabel(metric) {
  switch (metric) {
    case "po": return "PO Qty";
    case "sent": return "Sent Qty";
    case "shortage": return "Shortage Qty";
    case "count": return "Store Count";
    default: return "Quantity Allocation";
  }
}

function buildChartData() {
  const mode = state.chartMode === "status" ? "status" : "store";
  if (mode === "status") {
    const map = {};
    state.stores.forEach(s => {
      const st = s.status || "UNKNOWN";
      if (!map[st]) map[st] = { count: 0, po: 0, sent: 0 };
      map[st].count += 1;
      map[st].po += s.poQty || 0;
      map[st].sent += s.sentQty || 0;
    });
    const labels = Object.keys(map).sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));
    return {
      labels,
      count: labels.map(l => map[l].count),
      po: labels.map(l => map[l].po),
      sent: labels.map(l => map[l].sent),
      shortage: labels.map(l => Math.max(0, map[l].po - map[l].sent))
    };
  }
  return {
    labels: state.stores.map(s => s.storeName),
    count: state.stores.map(() => 1),
    po: state.stores.map(s => s.poQty || 0),
    sent: state.stores.map(s => s.sentQty || 0),
    shortage: state.stores.map(s => getShortage(s))
  };
}

function renderChart() {
  const ctx = document.getElementById("dispatchChart").getContext("2d");

  if (dispatchChartInstance) {
    dispatchChartInstance.destroy();
  }

  const isDark = state.theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const textColor = isDark ? "#9ca3af" : "#475569";

  const chartType = state.chartType || "bar";
  const chartMetric = state.chartMetric || "all";
  const data = buildChartData();

  const singleSeries = ["pie", "doughnut", "polarArea"].includes(chartType);
  const effectiveMetric = chartMetric === "all" ? "sent" : chartMetric;

  const colorMap = {
    count: { dark: "rgba(163, 230, 53, 0.85)", light: "rgba(77, 124, 15, 0.85)", border: "var(--accent-indigo)" },
    po: { dark: "rgba(45, 212, 191, 0.8)", light: "rgba(13, 148, 136, 0.85)", border: "var(--accent-blue)" },
    sent: { dark: "rgba(34, 197, 94, 0.8)", light: "rgba(5, 150, 105, 0.85)", border: "var(--accent-green)" },
    shortage: { dark: "rgba(248, 113, 113, 0.8)", light: "rgba(220, 38, 38, 0.85)", border: "var(--accent-red)" }
  };

  const palette = [
    "#2dd4bf", "#22c55e", "#f87171", "#a3e635", "#fbbf24", "#60a5fa",
    "#c084fc", "#fb923c", "#34d399", "#4ade80", "#facc15", "#38bdf8",
    "#f472b6", "#a78bfa", "#fb7185"
  ];

  const metricData = { count: data.count, po: data.po, sent: data.sent, shortage: data.shortage };

  let datasets;
  if (singleSeries) {
    datasets = [{
      label: chartMetricLabel(effectiveMetric),
      data: metricData[effectiveMetric],
      backgroundColor: data.labels.map((_, i) => palette[i % palette.length]),
      borderColor: "rgba(15, 23, 42, 0.35)",
      borderWidth: 1
    }];
  } else if (chartMetric === "all") {
    datasets = ["po", "sent", "shortage"].map((key) => {
      const c = colorMap[key];
      return {
        label: chartMetricLabel(key),
        data: metricData[key],
        backgroundColor: isDark ? c.dark : c.light,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 4
      };
    });
    if (state.chartMode === "status") {
      datasets.unshift({
        label: chartMetricLabel("count"),
        data: metricData.count,
        backgroundColor: isDark ? colorMap.count.dark : colorMap.count.light,
        borderColor: colorMap.count.border,
        borderWidth: 1,
        borderRadius: 4
      });
    }
  } else {
    const c = colorMap[chartMetric];
    datasets = [{
      label: chartMetricLabel(chartMetric),
      data: metricData[chartMetric],
      backgroundColor: isDark ? c.dark : c.light,
      borderColor: c.border,
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
    animation: {
      duration: 600,
      easing: "easeOutQuart"
    },
    indexAxis: isHorizontal ? "y" : "x",
    cutout: chartType === "doughnut" ? "55%" : undefined,
    plugins: {
      legend: {
        position: singleSeries ? "right" : "top",
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
      }
    },
    scales: isCartesian ? {
      x: {
        stacked: isStacked,
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { family: "Inter" },
          maxRotation: isHorizontal ? 0 : 60,
          minRotation: isHorizontal ? 0 : 30,
          autoSkip: true,
          maxTicksLimit: 20
        }
      },
      y: {
        stacked: isStacked,
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: "Inter" } }
      }
    } : undefined
  };

  if (isLine) {
    datasets.forEach(d => {
      d.tension = 0.35;
      d.borderWidth = 2;
      d.pointRadius = 3;
      d.fill = true;
      d.backgroundColor = isDark ? "rgba(45, 212, 191, 0.12)" : "rgba(13, 148, 136, 0.12)";
    });
  }

  dispatchChartInstance = new Chart(ctx, {
    type: isHorizontal ? "bar" : (isStacked ? "bar" : chartType),
    data: {
      labels: data.labels,
      datasets: datasets
    },
    options: options
  });
}

function syncChartControls() {
  const typeSelect = document.getElementById("chartType");
  const metricSelect = document.getElementById("chartMetric");
  const storeBtn = document.getElementById("filterByStore");
  const statusBtn = document.getElementById("filterByStatus");
  if (typeSelect) typeSelect.value = state.chartType;
  if (metricSelect) metricSelect.value = state.chartMetric;
  if (storeBtn) storeBtn.classList.toggle("active", state.chartMode !== "status");
  if (statusBtn) statusBtn.classList.toggle("active", state.chartMode === "status");

  const title = document.getElementById("chartTitle");
  if (title) {
    const metricPart = chartMetricLabel(state.chartMetric);
    const viewPart = state.chartMode === "status" ? "by Status" : "by Store";
    title.textContent = `${metricPart} ${viewPart}`;
  }
}

function updateChartTheme() {
  if (dispatchChartInstance) {
    renderChart();
  }
}

// Math calculation helper
function calculateKPIs() {
  let totalPO = 0;
  let totalSent = 0;
  let totalShortage = 0;
  let totalItemsRequested = 0;
  let storesDelivered = 0;

  state.stores.forEach(s => {
    totalPO += s.poQty;
    totalSent += s.sentQty;
    totalShortage += Math.max(0, s.poQty - s.sentQty);
    totalItemsRequested += s.itemsInPo;
    if (s.status === "DELIVERED") {
      storesDelivered++;
    }
  });

  const efficiency = totalPO > 0 ? (totalSent / totalPO) * 100 : 0;
  const shortageVariance = totalPO > 0 ? (totalShortage / totalPO) * 100 : 0;
  const locationRate = state.stores.length > 0 ? (storesDelivered / state.stores.length) * 100 : 0;

  return {
    totalPO,
    totalSent,
    totalShortage,
    totalItemsRequested,
    efficiency,
    shortageVariance,
    storesDelivered,
    locationRate
  };
}

// Edit Store item callback
window.editStore = function(id) {
  const store = state.stores.find(s => s.id === id);
  if (!store) return;

  state.editingId = id;
  document.getElementById("dialogTitle").innerText = "Edit Store Dispatch";
  document.getElementById("formStoreId").value = store.id;
  document.getElementById("storeName").value = store.storeName;
  document.getElementById("poDate").value = store.poDate;
  document.getElementById("dispatchDate").value = store.dispatchDate;
  document.getElementById("poQty").value = store.poQty;
  document.getElementById("sentQty").value = store.sentQty;
  document.getElementById("itemsInPo").value = store.itemsInPo;
  document.getElementById("verifiedPerson").value = store.verifiedPerson;
  document.getElementById("status").value = store.status;
  document.getElementById("reasonOfShortage").value = store.reasonOfShortage === "-" ? "" : store.reasonOfShortage;

  document.getElementById("storeDialog").showModal();
};

// Delete Store item callback
window.deleteStore = function(id) {
  if (confirm("Are you sure you want to delete this dispatch record?")) {
    state.stores = state.stores.filter(s => s.id !== id);
    saveState();
    renderDashboard();
  }
};

function getStoreSortValue(store, key) {
  switch (key) {
    case "shortage": return Math.max(0, store.poQty - store.sentQty);
    case "poQty": return store.poQty || 0;
    case "sentQty": return store.sentQty || 0;
    case "itemsInPo": return store.itemsInPo || 0;
    case "status": return store.status || "";
    default: return String(store[key] || "").toLowerCase();
  }
}

function renderDashboard() {
  const kpi = calculateKPIs();

  // 1. Update KPI UI values
  document.getElementById("valTotalPO").innerText = kpi.totalPO.toLocaleString();
  document.getElementById("subTotalPO").innerText = `${kpi.totalItemsRequested.toLocaleString()} Total Items Requested`;

  document.getElementById("valTotalSent").innerText = kpi.totalSent.toLocaleString();

  document.getElementById("valTotalShortage").innerText = kpi.totalShortage.toLocaleString();
  document.getElementById("subTotalShortage").innerText = `${kpi.shortageVariance.toFixed(2)}% Shortage Variance`;

  document.getElementById("valEfficiency").innerText = `${kpi.efficiency.toFixed(2)}%`;
  
  document.getElementById("valDeliveryStatus").innerText = `${kpi.storesDelivered} Store${kpi.storesDelivered !== 1 ? 's' : ''} Delivered`;
  document.getElementById("subDeliveryStatus").innerText = `${kpi.locationRate.toFixed(0)}% Locations Serviced`;

  // 2. Render Header metadata based on overall dataset
  // Select the latest dispatch date and unique verified persons
  const uniqueDates = [...new Set(state.stores.map(s => formatDate(s.dispatchDate)))].filter(Boolean);
  const uniquePeople = [...new Set(state.stores.map(s => s.verifiedPerson))].filter(Boolean);

  const mainDate = uniqueDates.length > 0 ? uniqueDates.join(" | ") : formatDate(new Date().toISOString().split("T")[0]);
  const mainPeople = uniquePeople.length > 0 ? uniquePeople.join(" & ") : "N/A";

  document.getElementById("reportTitle").innerText = `STORE DISPATCH REPORT`;
  document.getElementById("headerDispatchedDate").innerText = mainDate.replace(/\|/g, " / ");
  document.getElementById("headerVerifiedPerson").innerText = mainPeople;
  document.getElementById("footerText").innerText = `Supply Chain & Warehouse Management | Store Dispatch Report (${mainDate})`;

  // 3. Render Table
  const tableBody = document.getElementById("storeTableBody");
  tableBody.innerHTML = "";

  // Update sort indicators on headers
  document.querySelectorAll("#storeTable th.sortable").forEach(th => {
    th.classList.remove("is-asc", "is-desc");
    if (th.dataset.sort === state.sortKey) {
      th.classList.add(state.sortDir === "asc" ? "is-asc" : "is-desc");
    }
  });

  const sortedStores = [...state.stores].sort((a, b) => {
    const av = getStoreSortValue(a, state.sortKey);
    const bv = getStoreSortValue(b, state.sortKey);
    if (typeof av === "number" && typeof bv === "number") {
      return state.sortDir === "asc" ? av - bv : bv - av;
    }
    return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  sortedStores.forEach(s => {
    const tr = document.createElement("tr");
    const shortage = Math.max(0, s.poQty - s.sentQty);
    
    let shortageClass = "";
    if (shortage > 500) {
      shortageClass = "has-major-shortage";
    } else if (shortage > 0) {
      shortageClass = "has-shortage";
    }

    const statusBadgeClass = s.status === "DELIVERED" ? "badge-green" : (s.status === "READY TO DISPATCH" ? "badge-blue" : (s.status === "SHORTAGE" ? "badge-red" : "badge-orange"));

    tr.innerHTML = `
      <td style="font-weight: 600;">${s.storeName}</td>
      <td>${formatDate(s.poDate)}</td>
      <td>${formatDate(s.dispatchDate)}</td>
      <td>${s.itemsInPo.toLocaleString()}</td>
      <td>${s.poQty.toLocaleString()}</td>
      <td>${s.sentQty.toLocaleString()}</td>
      <td><span class="cell-shortage-qty ${shortageClass}">${shortage.toLocaleString()}</span></td>
      <td>${s.verifiedPerson}</td>
      <td><span class="badge ${statusBadgeClass}">${s.status}</span></td>
      <td style="font-style: italic; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.reasonOfShortage}">${s.reasonOfShortage}</td>
      <td class="table-actions">
        <button class="btn btn-secondary btn-icon" onclick="editStore('${s.id}')" title="Edit">${SVG_ICONS.edit}</button>
        <button class="btn btn-danger btn-icon" onclick="deleteStore('${s.id}')" title="Delete">${SVG_ICONS.delete}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Render Summary Row in Table if there are stores
  if (state.stores.length > 0) {
    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${state.stores.length} Store${state.stores.length !== 1 ? 's' : ''})</td>
      <td>-</td>
      <td>-</td>
      <td>${kpi.totalItemsRequested.toLocaleString()}</td>
      <td>${kpi.totalPO.toLocaleString()}</td>
      <td>${kpi.totalSent.toLocaleString()}</td>
      <td><span style="color: var(--accent-red);">${kpi.totalShortage.toLocaleString()}</span></td>
      <td>-</td>
      <td><span class="badge badge-green">DELIVERED</span></td>
      <td>-</td>
      <td class="table-actions"></td>
    `;
    tableBody.appendChild(summaryTr);
  } else {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 32px;">No dispatch records found. Click "Add Store Dispatch" to create one.</td></tr>`;
  }

  // 4. Render Dynamic Operational Shortage & Root Cause Analysis
  renderRootCauseAnalysis(kpi);

  // 5. Render Dynamic Action Items & Strategic Recommendations
  renderRecommendations(kpi);

  // 6. Draw Chart
  renderChart();
  syncChartControls();
}

function renderRootCauseAnalysis(kpi) {
  const container = document.getElementById("rootCauseList");
  container.innerHTML = "";

  if (state.stores.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No analysis data available.</div>`;
    return;
  }

  // Find the store with the largest shortage
  let maxShortageStore = null;
  let maxShortage = 0;

  state.stores.forEach(s => {
    const sh = Math.max(0, s.poQty - s.sentQty);
    if (sh > maxShortage) {
      maxShortage = sh;
      maxShortageStore = s;
    }
  });

  // 1. Major Shortage Highlight
  if (maxShortageStore && maxShortage > 0) {
    const pctOfTotalShortage = kpi.totalShortage > 0 ? (maxShortage / kpi.totalShortage) * 100 : 0;
    
    const majorItem = document.createElement("div");
    majorItem.className = "recommendation-row";
    majorItem.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(248,113,113,0.25);">MAJOR SHORTAGE</span>
      <div class="recommendation-text">
        <strong>${maxShortageStore.storeName}:</strong> <strong>${maxShortage.toLocaleString()} units (${pctOfTotalShortage.toFixed(1)}% of total report shortage)</strong> were not dispatched because <span style="font-style: italic;">"${maxShortageStore.reasonOfShortage}"</span>. This major order (PO raised ${formatDate(maxShortageStore.poDate)}) required ${maxShortageStore.itemsInPo} items (${maxShortageStore.poQty.toLocaleString()} total qty).
      </div>
    `;
    container.appendChild(majorItem);
  }

  // 2. Blocked / Hold Inventory Highlight
  const blockedStores = state.stores.filter(s => {
    const sh = Math.max(0, s.poQty - s.sentQty);
    const reason = (s.reasonOfShortage || "").toLowerCase();
    return sh > 0 && s !== maxShortageStore && (reason.includes("block") || reason.includes("future") || reason.includes("reserve") || reason.includes("hold"));
  });

  if (blockedStores.length > 0) {
    const blockText = blockedStores.map(s => {
      const sh = Math.max(0, s.poQty - s.sentQty);
      return `${s.storeName} (${sh} units short out of ${s.poQty})`;
    }).join(" and ");

    const blockItem = document.createElement("div");
    blockItem.className = "recommendation-row";
    blockItem.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">INVENTORY HOLD</span>
      <div class="recommendation-text">
        <strong>Inventory Hold / Block:</strong> ${blockText} experienced minor shortages due to stock being intentionally blocked/reserved for future orders.
      </div>
    `;
    container.appendChild(blockItem);
  }

  // 3. Other minor shortages
  const otherShortageStores = state.stores.filter(s => {
    const sh = Math.max(0, s.poQty - s.sentQty);
    const isBlocked = blockedStores.includes(s);
    return sh > 0 && s !== maxShortageStore && !isBlocked;
  });

  if (otherShortageStores.length > 0) {
    const otherText = otherShortageStores.map(s => {
      const sh = Math.max(0, s.poQty - s.sentQty);
      return `${s.storeName} (${sh} units short due to: "${s.reasonOfShortage}")`;
    }).join(", ");

    const otherItem = document.createElement("div");
    otherItem.className = "recommendation-row";
    otherItem.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(148, 163, 184, 0.15); color: var(--text-muted); border-color: rgba(148, 163, 184, 0.25);">MINOR SHORTAGES</span>
      <div class="recommendation-text">
        <strong>Miscellaneous Shortages:</strong> ${otherText}.
      </div>
    `;
    container.appendChild(otherItem);
  }

  // 4. Audit & Verification details
  const uniquePeople = [...new Set(state.stores.map(s => s.verifiedPerson))].filter(Boolean);
  const peopleText = uniquePeople.length > 0 ? uniquePeople.join(" & ") : "authorized personnel";

  const auditItem = document.createElement("div");
  auditItem.className = "recommendation-row";
  auditItem.innerHTML = `
    <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">VERIFICATION & AUDIT</span>
    <div class="recommendation-text">
      <strong>Verification & Audit:</strong> All shipments were fully verified and authorized prior to outward dispatch by <strong style="color: var(--text-primary);">${peopleText}</strong>.
    </div>
  `;
  container.appendChild(auditItem);
}

function renderRecommendations(kpi) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  if (state.stores.length === 0 || kpi.totalShortage === 0) {
    container.innerHTML = `
      <div class="recommendation-row">
        <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">OPERATIONS OK</span>
        <div class="recommendation-text">
          <strong>Optimal Performance:</strong> Zero dispatch shortages recorded. Maintain current supply chain allocation pipelines.
        </div>
      </div>
    `;
    return;
  }

  // Find the store with the largest shortage
  let maxShortageStore = null;
  let maxShortage = 0;

  state.stores.forEach(s => {
    const sh = Math.max(0, s.poQty - s.sentQty);
    if (sh > maxShortage) {
      maxShortage = sh;
      maxShortageStore = s;
    }
  });

  // 1. Recommendation for Major Shortage
  if (maxShortageStore && maxShortage > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge">MATERIAL ARRANGEMENT</span>
      <div class="recommendation-text">
        <strong>Procurement Acceleration for ${maxShortageStore.storeName}:</strong> Urgently arrange the unfulfilled <strong>${maxShortage.toLocaleString()} units</strong> across requested line items to clear the balance for the PO raised on ${formatDate(maxShortageStore.poDate)}.
      </div>
    `;
    container.appendChild(row);
  }

  // 2. Recommendation for Blocked inventory
  const blockedStores = state.stores.filter(s => {
    const sh = Math.max(0, s.poQty - s.sentQty);
    const reason = (s.reasonOfShortage || "").toLowerCase();
    return sh > 0 && (reason.includes("block") || reason.includes("future") || reason.includes("reserve") || reason.includes("hold"));
  });

  if (blockedStores.length > 0) {
    const combinedShortage = blockedStores.reduce((acc, s) => acc + Math.max(0, s.poQty - s.sentQty), 0);
    const storeNamesText = blockedStores.map(s => s.storeName).join(" and ");

    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">STOCK UNBLOCK</span>
      <div class="recommendation-text">
        <strong>Stock Allocation Review:</strong> Evaluate blocked inventory for <strong>${storeNamesText}</strong> (<strong>${combinedShortage.toLocaleString()} units combined</strong>) and schedule release upon future order confirmation.
      </div>
    `;
    container.appendChild(row);
  }

  // 3. General warehouse optimization recommendation if overall efficiency is below 90%
  if (kpi.efficiency < 90) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">SUPPLY OPTIMIZATION</span>
      <div class="recommendation-text">
        <strong>Fulfillment Warning:</strong> Dispatch efficiency is currently at <strong>${kpi.efficiency.toFixed(2)}%</strong> (below the 90% performance baseline). Initiate weekly audit reviews on PO lead-times and safety stock.
      </div>
    `;
    container.appendChild(row);
  }
}

// Start the Application
window.addEventListener("DOMContentLoaded", initApp);
