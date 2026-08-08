// Inventory Cycle Count data starts empty; users create their own records.

// State Manager
let state = {
  items: [],
  theme: "dark",
  editingId: null,
  chartMode: "item",
  chartType: "bar",
  chartMetric: "all",
  topCount: 10,
  sortKey: "sku",
  sortDir: "asc",
  filterStatus: "all",
  filterCategory: "all"
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

function deriveSku(itemName) {
  const base = String(itemName || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "-";
}

function getSortValue(item, key) {
  switch (key) {
    case "variance": return getVariance(item);
    case "variancePct": return getVariancePct(item);
    case "systemQty": return item.systemQty || 0;
    case "physicalQty": return item.physicalQty || 0;
    case "sku": return (item.sku || deriveSku(item.itemName)).toLowerCase();
    case "binLocation": return (item.binLocation || "").toLowerCase();
    case "status": return getStatus(item);
    case "notes": return (item.notes || "").toLowerCase();
    default: return String(item[key] || "").toLowerCase();
  }
}

// Variance helpers
function getVariance(item) {
  return item.physicalQty - item.systemQty;
}

function getAbsVariance(item) {
  return Math.abs(getVariance(item));
}

function getVariancePct(item) {
  if (!item.systemQty) return item.physicalQty > 0 ? 100 : 0;
  return (getAbsVariance(item) / item.systemQty) * 100;
}

function getStatus(item) {
  if (item.physicalQty === 0 && item.systemQty > 0) return "MISSING";
  const variance = getVariance(item);
  if (variance === 0) return "MATCHED";
  return variance > 0 ? "OVER" : "SHORT";
}

// Load and Initialize App State
function initApp() {
  [
    "inventory_cycle_count_stores_v3",
    "inventory_cycle_count_stores_v4"
  ].forEach(k => localStorage.removeItem(k));

  const savedItems = localStorage.getItem("inventory_cycle_count_stores_v5");
  if (savedItems) {
    try {
      state.items = JSON.parse(savedItems);
    } catch (e) {
      console.error("Error parsing saved cycle count data, starting with an empty set.", e);
      state.items = [];
    }
  } else {
    state.items = [];
    saveState();
  }

  let skuBackfilled = false;
  state.items.forEach(s => {
    if (!s.sku) {
      s.sku = deriveSku(s.itemName);
      skuBackfilled = true;
    }
  });
  if (skuBackfilled) saveState();

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
  localStorage.setItem("inventory_cycle_count_stores_v5", JSON.stringify(state.items));
  if (window.DataService) DataService.push("INVENTORY", state.items);
}

async function syncFromCloud() {
  if (!window.DataService || !DataService.ready) return;
  const merged = await DataService.syncTable("INVENTORY", state.items);
  if (merged) {
    state.items = merged;
    saveState();
    renderDashboard();
  }
}

// Set up UI Interaction Event Listeners
function setupEventListeners() {
  const dialog = document.getElementById("itemDialog");
  const addItemBtn = document.getElementById("addItemBtn");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelDialogBtn = document.getElementById("cancelDialogBtn");
  const itemForm = document.getElementById("itemForm");
  const themeToggle = document.getElementById("themeToggle");
  const importBtn = document.getElementById("importBtn");
  const fileInput = document.getElementById("fileInput");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Dialog Opening
  addItemBtn.addEventListener("click", () => {
    state.editingId = null;
    document.getElementById("dialogTitle").innerText = "Add Cycle Count Record";
    itemForm.reset();
    document.getElementById("formItemId").value = "";

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("countDate").value = today;
    document.getElementById("countedBy").value = "Pushpendra";
    document.getElementById("category").value = "SEEDS";

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
  itemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("formItemId").value;
    const itemName = document.getElementById("itemName").value;
    const sku = document.getElementById("sku").value.trim() || deriveSku(itemName);
    const category = document.getElementById("category").value;
    const binLocation = document.getElementById("binLocation").value;
    const systemQty = parseInt(document.getElementById("systemQty").value) || 0;
    const physicalQty = parseInt(document.getElementById("physicalQty").value) || 0;
    const countedBy = document.getElementById("countedBy").value;
    const countDate = document.getElementById("countDate").value;
    const notes = document.getElementById("notes").value || "-";

    if (id) {
      const index = state.items.findIndex(s => s.id === id);
      if (index !== -1) {
        state.items[index] = {
          id, itemName, sku, category, binLocation, systemQty, physicalQty, countedBy, countDate, notes
        };
      }
    } else {
      const newItem = {
        id: "item-" + Date.now(),
        itemName, sku, category, binLocation, systemQty, physicalQty, countedBy, countDate, notes
      };
      state.items.push(newItem);
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
      itemName: ["Item Name", "Item", "itemName"],
      sku: ["SKU", "SKU Code", "Sku", "sku"],
      category: ["Category", "category"],
      binLocation: ["Bin Location", "Bin", "Shelf Code", "Shelf", "binLocation"],
      systemQty: ["System Qty", "System Quantity", "Available", "Available (ATP)", "systemQty"],
      physicalQty: ["Physical Qty", "Physical Quantity", "Phy", "physicalQty"],
      countedBy: ["Counted By", "countedBy"],
      countDate: ["Count Date", "Counted Date", "countDate"],
      notes: ["Notes", "Note", "notes"]
    };

    await BulkImport.openImport({
      file,
      fieldAliases: ALIASES,
      existingCount: state.items.length,
      previewColumns: [
        { field: "sku", label: "SKU Code" },
        { field: "itemName", label: "Item Name" },
        { field: "category", label: "Category" },
        { field: "binLocation", label: "Shelf Code" },
        { field: "systemQty", label: "System Qty" },
        { field: "physicalQty", label: "Physical Qty" },
        { field: "countedBy", label: "Counted By" },
        { field: "countDate", label: "Count Date" }
      ],
      transformRow: (row) => {
        const errors = [];
        const itemName = BulkImport.parseText(row.itemName);
        if (!itemName) errors.push("Item Name is required");

        const sku = BulkImport.parseText(row.sku) || deriveSku(itemName);
        if (!sku) errors.push("SKU Code is required");

        const category = BulkImport.parseText(row.category) || "SEEDS";
        const binLocation = BulkImport.parseText(row.binLocation);
        if (!binLocation) errors.push("Shelf Code is required");

        const systemQty = BulkImport.parseNumber(row.systemQty, errors, "System Qty");
        if (systemQty !== null && systemQty < 0) errors.push("System Qty cannot be negative");

        const physicalQty = BulkImport.parseNumber(row.physicalQty, errors, "Physical Qty");
        if (physicalQty !== null && physicalQty < 0) errors.push("Physical Qty cannot be negative");

        const countedBy = BulkImport.parseText(row.countedBy) || "Pushpendra";

        const countDate = BulkImport.parseDate(row.countDate, errors);

        const notes = BulkImport.parseText(row.notes) || "-";

        return {
          errors,
          value: {
            itemName,
            sku,
            category,
            binLocation,
            systemQty: systemQty ?? 0,
            physicalQty: physicalQty ?? 0,
            countedBy,
            countDate,
            notes
          }
        };
      },
      onImport: (records) => {
        const ts = Date.now();
        state.items = records.map((r, i) => ({ id: `item-${ts}-${i}`, ...r }));
        saveState();
        renderDashboard();
        alert(`Successfully imported ${records.length} cycle count record${records.length !== 1 ? "s" : ""}.`);
      }
    });
  });

  // Export JSON
  exportJsonBtn.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `inventory_cycle_count_report_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Export CSV
  exportCsvBtn.addEventListener("click", () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU Code,Item Name,Shelf Code,System Qty,Physical Qty,Variance,Variance %,Status,Counted By,Count Date,Notes\n";

    state.items.forEach(s => {
      const variance = getVariance(s);
      const row = [
        `"${s.sku || deriveSku(s.itemName)}"`,
        `"${s.itemName}"`,
        `"${s.binLocation}"`,
        s.systemQty,
        s.physicalQty,
        variance,
        getVariancePct(s).toFixed(2),
        `"${getStatus(s)}"`,
        `"${s.countedBy}"`,
        `"${formatDate(s.countDate)}"`,
        `"${s.notes || '-'}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `inventory_cycle_count_report_${new Date().toISOString().split("T")[0]}.csv`);
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
    return; // Reset disabled until re-enabled by owner
    if (confirm("Erase all inventory cycle count data? This cannot be undone.")) {
      state.items = [];
      saveState();
      renderDashboard();
    }
  });

  // Sortable Table Headers
  document.querySelectorAll("#inventoryTable th.sortable").forEach(th => {
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

  // Filter By Dropdowns
  const filterStatus = document.getElementById("filterStatus");
  const filterCategory = document.getElementById("filterCategory");

  filterStatus.addEventListener("change", () => {
    state.filterStatus = filterStatus.value;
    renderDashboard();
  });

  filterCategory.addEventListener("change", () => {
    state.filterCategory = filterCategory.value;
    renderDashboard();
  });

  // Chart Filter Buttons
  const filterByItem = document.getElementById("filterByItem");
  const filterByCategory = document.getElementById("filterByCategory");

  const setChartMode = (mode) => {
    state.chartMode = mode;
    filterByItem.classList.toggle("active", mode === "item");
    filterByCategory.classList.toggle("active", mode === "category");
    document.getElementById("chartTitle").innerText = mode === "item" ? "Top 10 Short & Over SKUs" : "Variance by Category";
    const isItem = mode === "item";
    document.getElementById("topNCount").disabled = !isItem;
    renderChart();
  };

  filterByItem.addEventListener("click", () => setChartMode("item"));
  filterByCategory.addEventListener("click", () => setChartMode("category"));

  // Chart Type & Metric Selects
  const chartTypeSelect = document.getElementById("chartType");
  const chartMetricSelect = document.getElementById("chartMetric");

  chartTypeSelect.addEventListener("change", () => {
    state.chartType = chartTypeSelect.value;
    const singleSeries = ["pie", "doughnut", "polarArea"].includes(state.chartType);
    if (singleSeries && state.chartMetric === "all") {
      state.chartMetric = "variance";
      chartMetricSelect.value = "variance";
    }
    renderChart();
  });

  chartMetricSelect.addEventListener("change", () => {
    state.chartMetric = chartMetricSelect.value;
    renderChart();
  });

  // Top-N variance SKU count input (item mode only)
  const topNInput = document.getElementById("topNCount");

  topNInput.addEventListener("change", () => {
    state.topCount = Math.max(0, Math.min(parseInt(topNInput.value, 10) || 0, 100));
    topNInput.value = state.topCount;
    renderChart();
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
let varianceChartInstance = null;

if (typeof ChartDataLabels !== "undefined") {
  Chart.register(ChartDataLabels);
}

function renderChart() {
  const ctx = document.getElementById("varianceChart").getContext("2d");

  if (varianceChartInstance) {
    varianceChartInstance.destroy();
  }

  const isDark = state.theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const textColor = isDark ? "#9ca3af" : "#475569";

  let labels;
  let systemData;
  let physicalData;
  let varianceData;

  if (state.chartMode === "category") {
    const catMap = {};
    state.items.forEach(s => {
      const cat = s.category || "UNCATEGORIZED";
      if (!catMap[cat]) {
        catMap[cat] = { system: 0, physical: 0, absVar: 0 };
      }
      catMap[cat].system += s.systemQty;
      catMap[cat].physical += s.physicalQty;
      catMap[cat].absVar += getAbsVariance(s);
    });
    const cats = Object.keys(catMap).sort((a, b) => catMap[b].absVar - catMap[a].absVar);
    labels = cats;
    systemData = cats.map(c => catMap[c].system);
    physicalData = cats.map(c => catMap[c].physical);
    varianceData = cats.map(c => catMap[c].absVar);
  } else {
    const over = state.items.filter(s => getVariance(s) > 0).sort((a, b) => getVariance(b) - getVariance(a));
    const short = state.items.filter(s => getVariance(s) < 0).sort((a, b) => getVariance(a) - getVariance(b));
    const top = [...over.slice(0, state.topCount), ...short.slice(0, state.topCount)];
    const items = state.topCount > 0 && top.length === 0 ? state.items : top;
    labels = items.map(s => s.itemName);
    systemData = items.map(s => s.systemQty);
    physicalData = items.map(s => s.physicalQty);
    varianceData = items.map(s => getAbsVariance(s));
  }

  const chartType = state.chartType || "bar";
  const chartMetric = state.chartMetric || "all";

  const singleSeries = ["pie", "doughnut", "polarArea"].includes(chartType);
  const effectiveMetric = chartMetric === "all" && singleSeries ? "variance" : chartMetric;

  const colorMap = {
    system: { dark: "rgba(59, 130, 246, 0.85)", light: "rgba(37, 99, 235, 0.85)", border: "#3b82f6" },
    physical: { dark: "rgba(249, 115, 22, 0.8)", light: "rgba(234, 88, 12, 0.85)", border: "#f97316" },
    variance: { dark: "rgba(248, 113, 113, 0.8)", light: "rgba(220, 38, 38, 0.85)", border: "#ef4444" }
  };

  const palette = [
    "#3b82f6", "#f97316", "#2dd4bf", "#ef4444", "#a855f7", "#eab308",
    "#22c55e", "#ec4899", "#06b6d4", "#fb923c", "#8b5cf6", "#f43f5e",
    "#10b981", "#f472b6", "#0ea5e9", "#facc15"
  ];

  const metricData = {
    system: systemData,
    physical: physicalData,
    variance: varianceData
  };

  const metricLabel = m => m === "system" ? "System Qty" : m === "physical" ? "Physical Qty" : "Variance (Abs)";

  let datasets;
  if (singleSeries) {
    datasets = [{
      label: metricLabel(effectiveMetric),
      data: metricData[effectiveMetric],
      backgroundColor: labels.map((_, i) => palette[i % palette.length]),
      borderColor: "rgba(15, 23, 42, 0.35)",
      borderWidth: 1
    }];
  } else if (chartMetric === "all") {
    datasets = [
      { label: "System Qty", data: systemData, backgroundColor: isDark ? colorMap.system.dark : colorMap.system.light, borderColor: colorMap.system.border, borderWidth: 1, borderRadius: 4 },
      { label: "Physical Qty", data: physicalData, backgroundColor: isDark ? colorMap.physical.dark : colorMap.physical.light, borderColor: colorMap.physical.border, borderWidth: 1, borderRadius: 4 },
      { label: "Variance (Abs)", data: varianceData, backgroundColor: isDark ? colorMap.variance.dark : colorMap.variance.light, borderColor: colorMap.variance.border, borderWidth: 1, borderRadius: 4 }
    ];
  } else {
    const c = colorMap[chartMetric];
    datasets = [{
      label: metricLabel(chartMetric),
      data: metricData[chartMetric],
      backgroundColor: isDark ? c.dark : c.light,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 4
    }];
  }

  const isHorizontal = chartType === "horizontalBar";
  const isLine = chartType === "line";
  const isCartesian = ["bar", "line", "horizontalBar"].includes(chartType);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
      },
      datalabels: {
        color: singleSeries ? "#ffffff" : (isDark ? "#e5e7eb" : "#0f172a"),
        font: { family: "Inter", weight: "bold", size: 11 },
        anchor: singleSeries ? "center" : "end",
        align: singleSeries ? "center" : (isLine ? "top" : "end"),
        formatter: (value) => (typeof value === "number" ? value.toLocaleString() : String(value ?? ""))
      }
    },
    scales: isCartesian ? {
      x: {
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
    });
  }

  varianceChartInstance = new Chart(ctx, {
    type: isHorizontal ? "bar" : chartType,
    data: {
      labels: labels,
      datasets: datasets
    },
    options: options
  });
}

function updateChartTheme() {
  if (varianceChartInstance) {
    renderChart();
  }
}

// Math calculation helper
function calculateKPIs() {
  let totalItems = state.items.length;
  let systemQty = 0;
  let physicalQty = 0;
  let totalVariance = 0;
  let varianceSkuCount = 0;
  let matchedCount = 0;

  state.items.forEach(s => {
    systemQty += s.systemQty;
    physicalQty += s.physicalQty;
    totalVariance += getAbsVariance(s);
    if (getVariance(s) !== 0) {
      varianceSkuCount++;
    }
    if (getVariance(s) === 0) {
      matchedCount++;
    }
  });

  const variancePct = totalItems > 0 ? (varianceSkuCount / totalItems) * 100 : 0;
  const matchRate = totalItems > 0 ? (matchedCount / totalItems) * 100 : 0;
  const accuracy = systemQty > 0 ? Math.max(0, (1 - totalVariance / systemQty) * 100) : 100;

  return {
    totalItems,
    systemQty,
    physicalQty,
    totalVariance,
    varianceSkuCount,
    variancePct,
    matchedCount,
    matchRate,
    accuracy
  };
}

// Edit Item callback
window.editItem = function(id) {
  const item = state.items.find(s => s.id === id);
  if (!item) return;

  state.editingId = id;
  document.getElementById("dialogTitle").innerText = "Edit Cycle Count Record";
  document.getElementById("formItemId").value = item.id;
  document.getElementById("itemName").value = item.itemName;
  document.getElementById("sku").value = item.sku === "-" || item.sku === deriveSku(item.itemName) ? "" : item.sku;
  document.getElementById("category").value = item.category || "SEEDS";
  document.getElementById("binLocation").value = item.binLocation;
  document.getElementById("systemQty").value = item.systemQty;
  document.getElementById("physicalQty").value = item.physicalQty;
  document.getElementById("countedBy").value = item.countedBy;
  document.getElementById("countDate").value = item.countDate;
  document.getElementById("notes").value = item.notes === "-" ? "" : item.notes;

  document.getElementById("itemDialog").showModal();
};

// Delete Item callback
window.deleteItem = function(id) {
  if (confirm("Are you sure you want to delete this cycle count record?")) {
    state.items = state.items.filter(s => s.id !== id);
    saveState();
    renderDashboard();
  }
};

function renderDashboard() {
  const allItems = state.items;
  if (window.DateFilter) {
    state.items = DateFilter.apply(allItems, s => s.countDate);
    DateFilter.setCount(state.items.length, allItems.length);
  }
  try {
  const kpi = calculateKPIs();

  // 1. Update KPI UI values
  document.getElementById("valTotalItems").innerText = kpi.totalItems.toLocaleString();
  document.getElementById("subTotalItems").innerText = `${kpi.totalItems.toLocaleString()} SKU Codes Verified`;

  document.getElementById("valSystemQty").innerText = kpi.systemQty.toLocaleString();
  document.getElementById("subSystemQty").innerText = `${kpi.systemQty.toLocaleString()} Units in WMS`;

  document.getElementById("valPhysicalQty").innerText = kpi.physicalQty.toLocaleString();
  document.getElementById("subPhysicalQty").innerText = `${kpi.physicalQty.toLocaleString()} Units on Floor`;

  document.getElementById("valVarianceQty").innerText = kpi.varianceSkuCount.toLocaleString();
  document.getElementById("subVarianceQty").innerText = `${kpi.variancePct.toFixed(2)}% of SKUs`;

  document.getElementById("valMatchRate").innerText = `${kpi.accuracy.toFixed(2)}%`;
  document.getElementById("subMatchRate").innerText = `${kpi.matchRate.toFixed(0)}% Items Matched`;

  // 2. Render Header metadata based on overall dataset
  const uniqueDates = [...new Set(state.items.map(s => formatDate(s.countDate)))].filter(Boolean);
  const uniquePeople = [...new Set(state.items.map(s => s.countedBy))].filter(Boolean);

  const mainDate = uniqueDates.length > 0 ? uniqueDates.join(" | ") : formatDate(new Date().toISOString().split("T")[0]);
  const mainPeople = uniquePeople.length > 0 ? uniquePeople.join(" & ") : "N/A";

  document.getElementById("headerCountDate").innerText = mainDate.replace(/\|/g, " / ");
  document.getElementById("headerCountedBy").innerText = mainPeople;
  document.getElementById("footerText").innerText = `Supply Chain & Warehouse Management | Inventory Cycle Count Report (${mainDate})`;

  // 3. Render Table
  const tableBody = document.getElementById("inventoryTableBody");
  tableBody.innerHTML = "";

  // Populate Category filter options (preserve current selection)
  const categorySelect = document.getElementById("filterCategory");
  const categories = [...new Set(state.items.map(s => s.category).filter(Boolean))].sort();
  const currentCategory = state.filterCategory;
  categorySelect.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join("");
  if (currentCategory && categories.includes(currentCategory)) {
    categorySelect.value = currentCategory;
  } else {
    categorySelect.value = "all";
    state.filterCategory = "all";
  }

  // Update sort indicators on headers
  document.querySelectorAll("#inventoryTable th.sortable").forEach(th => {
    th.classList.remove("is-asc", "is-desc");
    if (th.dataset.sort === state.sortKey) {
      th.classList.add(state.sortDir === "asc" ? "is-asc" : "is-desc");
    }
  });

  const filteredItems = state.items.filter(s => {
    if (state.filterStatus !== "all" && getStatus(s) !== state.filterStatus) return false;
    if (state.filterCategory !== "all" && s.category !== state.filterCategory) return false;
    return true;
  });

  document.getElementById("filterCount").innerText =
    `${filteredItems.length} of ${state.items.length} item${state.items.length !== 1 ? "s" : ""}`;

  const sortedItems = [...filteredItems].sort((a, b) => {
    const av = getSortValue(a, state.sortKey);
    const bv = getSortValue(b, state.sortKey);
    if (typeof av === "number" && typeof bv === "number") {
      return state.sortDir === "asc" ? av - bv : bv - av;
    }
    return state.sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  sortedItems.forEach(s => {
    const tr = document.createElement("tr");
    const variance = getVariance(s);
    const absVariance = getAbsVariance(s);
    const variancePct = getVariancePct(s);
    const status = getStatus(s);

    let varianceClass = "";
    if (variance > 0) {
      varianceClass = "has-shortage";
    } else if (variance < 0) {
      varianceClass = "has-major-shortage";
    }

    const statusBadgeClass = status === "MATCHED" ? "badge-green" : (status === "MISSING" ? "badge-red" : (status === "SHORT" ? "badge-red" : "badge-orange"));

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 12px;">${s.sku || deriveSku(s.itemName)}</td>
      <td style="font-weight: 600;">${s.itemName}</td>
      <td>${s.binLocation}</td>
      <td>${s.systemQty.toLocaleString()}</td>
      <td>${s.physicalQty.toLocaleString()}</td>
      <td><span class="cell-shortage-qty ${varianceClass}">${variance > 0 ? "+" : ""}${variance.toLocaleString()}</span></td>
      <td>${variancePct.toFixed(2)}%</td>
      <td><span class="badge ${statusBadgeClass}">${status}</span></td>
      <td style="font-style: italic; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.notes}">${s.notes}</td>
      <td class="table-actions">
        <button class="btn btn-secondary btn-icon" onclick="editItem('${s.id}')" title="Edit">${SVG_ICONS.edit}</button>
        <button class="btn btn-danger btn-icon" onclick="deleteItem('${s.id}')" title="Delete">${SVG_ICONS.delete}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Render Summary Row in Table if there are filtered items
  if (filteredItems.length > 0) {
    let subSystemQty = 0;
    let subPhysicalQty = 0;
    let subVarianceSkuCount = 0;
    filteredItems.forEach(s => {
      subSystemQty += s.systemQty;
      subPhysicalQty += s.physicalQty;
      if (getVariance(s) !== 0) subVarianceSkuCount++;
    });
    const subVariancePct = filteredItems.length > 0 ? (subVarianceSkuCount / filteredItems.length) * 100 : 0;

    const summaryTr = document.createElement("tr");
    summaryTr.className = "summary-row";
    summaryTr.innerHTML = `
      <td>Total Summary (${filteredItems.length} Item${filteredItems.length !== 1 ? 's' : ''})</td>
      <td>-</td>
      <td>-</td>
      <td>${subSystemQty.toLocaleString()}</td>
      <td>${subPhysicalQty.toLocaleString()}</td>
      <td><span style="color: var(--accent-red);">${subVarianceSkuCount.toLocaleString()}</span></td>
      <td>${subVariancePct.toFixed(2)}%</td>
      <td><span class="badge badge-green">MATCHED</span></td>
      <td>-</td>
      <td class="table-actions"></td>
    `;
    tableBody.appendChild(summaryTr);
  } else {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px;">${state.items.length === 0 ? 'No cycle count records found. Click "Add Cycle Count" to create one.' : "No items match the current filter. Adjust the Filter by / Category selection."}</td></tr>`;
  }

  // 4. Render Dynamic Operational Variance & Root Cause Analysis
  renderRootCauseAnalysis(kpi);

  // 5. Render Dynamic Action Items & Strategic Recommendations
  renderRecommendations(kpi);

  // 6. Draw Chart
  renderChart();
  } finally {
    state.items = allItems;
  }
}

function renderRootCauseAnalysis(kpi) {
  const container = document.getElementById("rootCauseList");
  container.innerHTML = "";

  if (state.items.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No analysis data available.</div>`;
    return;
  }

  // Find the item with the largest absolute variance
  let maxVarItem = null;
  let maxAbsVar = 0;

  state.items.forEach(s => {
    const av = getAbsVariance(s);
    if (av > maxAbsVar) {
      maxAbsVar = av;
      maxVarItem = s;
    }
  });

  // 1. Major Variance Highlight
  if (maxVarItem && maxAbsVar > 0) {
    const pctOfTotalVariance = kpi.totalVariance > 0 ? (maxAbsVar / kpi.totalVariance) * 100 : 0;

    const majorItem = document.createElement("div");
    majorItem.className = "recommendation-row";
    majorItem.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(248,113,113,0.25);">MAJOR VARIANCE</span>
      <div class="recommendation-text">
        <strong>${maxVarItem.itemName}:</strong> <strong>${maxAbsVar.toLocaleString()} units (${pctOfTotalVariance.toFixed(1)}% of total variance)</strong> recorded at shelf <strong>${maxVarItem.binLocation}</strong>. System shows ${maxVarItem.systemQty.toLocaleString()} vs physical ${maxVarItem.physicalQty.toLocaleString()}.
        ${maxVarItem.notes && maxVarItem.notes !== "-" ? `Note: <span style="font-style: italic;">"${maxVarItem.notes}"</span>` : ""}
      </div>
    `;
    container.appendChild(majorItem);
  }

  // 2. Missing Items Highlight
  const missingItems = state.items.filter(s => s.physicalQty === 0 && s.systemQty > 0);

  if (missingItems.length > 0) {
    const missingText = missingItems.map(s => `${s.itemName} (${s.binLocation})`).join(", ");

    const missingItem = document.createElement("div");
    missingItem.className = "recommendation-row";
    missingItem.innerHTML = `
      <span class="tag-badge" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-orange); border-color: rgba(245, 158, 11, 0.25);">MISSING STOCK</span>
      <div class="recommendation-text">
        <strong>Missing / Zero-Stock On Floor:</strong> ${missingText} had zero physical stock despite system quantity on record. Flag for immediate location audit.
      </div>
    `;
    container.appendChild(missingItem);
  }

  // 3. Over / Short breakdown
  const overItems = state.items.filter(s => getVariance(s) > 0);
  const shortItems = state.items.filter(s => getVariance(s) < 0);

  if (overItems.length > 0 || shortItems.length > 0) {
    const breakdownText = [];
    if (overItems.length > 0) {
      breakdownText.push(`${overItems.length} item${overItems.length !== 1 ? 's' : ''} over-counted (excess physical stock)`);
    }
    if (shortItems.length > 0) {
      breakdownText.push(`${shortItems.length} item${shortItems.length !== 1 ? 's' : ''} under-counted (stock shortfall)`);
    }

    const breakdownItem = document.createElement("div");
    breakdownItem.className = "recommendation-row";
    breakdownItem.innerHTML = `
      <span class="tag-badge">COUNT BREAKDOWN</span>
      <div class="recommendation-text">
        <strong>Over / Under Counts:</strong> ${breakdownText.join("; ")}. Recommend bin-level reconciliation for all flagged locations.
      </div>
    `;
    container.appendChild(breakdownItem);
  }

  // 4. Audit & Verification details
  const uniquePeople = [...new Set(state.items.map(s => s.countedBy))].filter(Boolean);
  const peopleText = uniquePeople.length > 0 ? uniquePeople.join(" & ") : "authorized personnel";

  const auditItem = document.createElement("div");
  auditItem.className = "recommendation-row";
  auditItem.innerHTML = `
    <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">VERIFICATION</span>
    <div class="recommendation-text">
      <strong>Verification & Audit:</strong> All counts were physically verified and recorded by <strong>${peopleText}</strong>.
    </div>
  `;
  container.appendChild(auditItem);
}

function renderRecommendations(kpi) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  if (state.items.length === 0 || kpi.varianceSkuCount === 0) {
    container.innerHTML = `
      <div class="recommendation-row">
        <span class="tag-badge" style="background-color: var(--badge-green); color: var(--accent-green); border-color: rgba(16,185,129,0.25);">OPERATIONS OK</span>
        <div class="recommendation-text">
          <strong>Optimal Performance:</strong> Zero inventory variance recorded. Maintain current stock control processes.
        </div>
      </div>
    `;
    return;
  }

  // Find the item with the largest absolute variance
  let maxVarItem = null;
  let maxAbsVar = 0;

  state.items.forEach(s => {
    const av = getAbsVariance(s);
    if (av > maxAbsVar) {
      maxAbsVar = av;
      maxVarItem = s;
    }
  });

  // 1. Recommendation for Major Variance
  if (maxVarItem && maxAbsVar > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge">IMMEDIATE RECOUNT</span>
      <div class="recommendation-text">
        <strong>Recount Priority for ${maxVarItem.itemName}:</strong> Schedule an immediate re-verification of shelf <strong>${maxVarItem.binLocation}</strong> to reconcile the <strong>${maxAbsVar.toLocaleString()} unit</strong> variance.
      </div>
    `;
    container.appendChild(row);
  }

  // 2. Recommendation for Missing items
  const missingItems = state.items.filter(s => s.physicalQty === 0 && s.systemQty > 0);

  if (missingItems.length > 0) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">STOCK INVESTIGATION</span>
      <div class="recommendation-text">
        <strong>Missing Stock Audit:</strong> Investigate missing inventory for <strong>${missingItems.map(s => s.itemName).join(", ")}</strong> — check unregistered locations, transit, and pending putaway.
      </div>
    `;
    container.appendChild(row);
  }

  // 3. General accuracy optimization if accuracy below 95%
  if (kpi.accuracy < 95) {
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(239,68,68,0.25);">CYCLE FREQUENCY</span>
      <div class="recommendation-text">
        <strong>Inventory Accuracy Warning:</strong> Current accuracy is <strong>${kpi.accuracy.toFixed(2)}%</strong> (below the 95% baseline). Increase cycle count frequency and review putaway/pick discipline.
      </div>
    `;
    container.appendChild(row);
  }
}

// Start the Application
window.addEventListener("DOMContentLoaded", initApp);
