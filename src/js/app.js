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
    reasonOfShortage: "Some Of The Item Block For Future Order",
    shortageDetails: [
      { sku: "SEED-BLSM-200", itemDescription: "Balsam Mix (200 Seeds)", category: "FLOWER SEED", poQty: 100, sentQty: 89, status: "PARTIAL", shortageReason: "Some Of The Item Block For Future Order", notes: "Blocked for future order" }
    ]
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
    reasonOfShortage: "Material Not Arranged As Per Requested",
    shortageDetails: [
      { sku: "SEED-AGER-100", itemDescription: "Ageratum Flower Seeds", category: "FLOWER SEED", poQty: 500, sentQty: 300, status: "SHORTAGE", shortageReason: "Material Not Arranged As Per Requested", notes: "Awaiting vendor stock" },
      { sku: "SEED-COR-250", itemDescription: "Coriander Seeds - 250 g", category: "SEEDS", poQty: 450, sentQty: 400, status: "PARTIAL", shortageReason: "Vendor Supply Delay", notes: "-" },
      { sku: "SEED-ALY-200", itemDescription: "Alyssum (200 Seeds)", category: "FLOWER SEED", poQty: 300, sentQty: 190, status: "SHORTAGE", shortageReason: "Material Not Arranged As Per Requested", notes: "-" }
    ]
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
  chartMetric: "all",
  skuStoreFilter: "all",
  skuEditingId: null,
  skuSortKey: "sku",
  skuSortDir: "asc",
  photos: [],
  lightboxIndex: 0,
  selectedPhotoIds: []
};

// Photo gallery storage key (separate from store data)
const PHOTO_STORAGE_KEY = "warehouse_dashboard_photos_v1";
const PHOTO_EXTENSIONS = ["png", "jpeg", "jpg"];
const PHOTO_MAX_DIMENSION = 1280;
const PHOTO_JPEG_QUALITY = 0.85;

// Shortage configuration
const SHORTAGE_REASONS = [
  "Some Of The Item Block For Future Order",
  "Material Not Arranged As Per Requested",
  "Pending Clearance Before Dispatch",
  "Vendor Supply Delay",
  "Packing Error / Miscount",
  "Transport Capacity Constraint",
  "Damaged In Transit",
  "Other"
];

const SKU_STATUSES = ["FULFILLED", "PARTIAL", "SHORTAGE", "NOT DISPATCHED"];

function normEnumKey(value) {
  return String(value === null || value === undefined ? "" : value).trim().toUpperCase().replace(/\s+/g, " ");
}

function findEnum(value, list) {
  const key = normEnumKey(value);
  return list.find(option => normEnumKey(option) === key) || null;
}

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

  // Load gallery photos
  loadPhotos();

  // Setup Event Listeners
  setupEventListeners();

  // Date range filter (defaults to latest day; rest stays saved in cloud)
  if (window.DateFilter) {
    DateFilter.init({ onApply: () => renderDashboard() });
  }

  // Render Everything
  renderDashboard();

  // Pull cloud data into LocalStorage (falls back silently when offline)
  syncFromCloud();
}

function saveState() {
  localStorage.setItem("warehouse_dashboard_stores_v2", JSON.stringify(state.stores));
  if (window.DataService) DataService.push("STORE_DISPATCH", state.stores);
}

async function syncFromCloud() {
  if (!window.DataService || !DataService.ready) return;
  const merged = await DataService.syncTable("STORE_DISPATCH", state.stores);
  if (merged) {
    state.stores = merged;
    saveState();
    renderDashboard();
  }
}

// ===== Photo Gallery =====
function loadPhotos() {
  const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
  if (!raw) return;
  try {
    state.photos = JSON.parse(raw);
    if (!Array.isArray(state.photos)) state.photos = [];
  } catch (e) {
    console.error("Error parsing saved photos.", e);
    state.photos = [];
  }
}

function savePhotos() {
  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(state.photos));
  } catch (e) {
    console.error("Could not persist photos.", e);
    alert("Photo could not be saved because browser storage is full. Delete some photos or use smaller images.");
    state.photos.pop();
    renderPhotoGallery();
  }
}

function photoExtension(filename) {
  const ext = String(filename || "").split(".").pop() || "";
  return ext.toLowerCase();
}

function isAllowedPhoto(file) {
  return PHOTO_EXTENSIONS.includes(photoExtension(file.name));
}

function handlePhotoUpload(files) {
  const invalid = files.filter(f => !isAllowedPhoto(f));
  if (invalid.length > 0) {
    alert(`Only .png, .jpeg and .jpg images are allowed.\nRejected: ${invalid.map(f => f.name).join(", ")}`);
  }

  const valid = files.filter(f => isAllowedPhoto(f));
  if (valid.length === 0) return;

  const confirmAdd = confirm(`Upload ${valid.length} photo${valid.length !== 1 ? "s" : ""}? Images will be optimised and saved in your browser.`);
  if (!confirmAdd) return;

  Promise.all(valid.map(processImageFile))
    .then(results => {
      results.forEach((dataUrl, i) => {
        state.photos.push({
          id: "photo-" + Date.now() + "-" + i,
          name: valid[i].name,
          dataUrl,
          addedAt: new Date().toISOString()
        });
      });
      savePhotos();
      renderPhotoGallery();
    })
    .catch(err => {
      console.error(err);
      alert("One or more photos could not be processed. Please try a valid .png or .jpeg image.");
    });
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > PHOTO_MAX_DIMENSION || height > PHOTO_MAX_DIMENSION) {
          const ratio = Math.min(PHOTO_MAX_DIMENSION / width, PHOTO_MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === "image/png" || photoExtension(file.name) === "png";
        const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", PHOTO_JPEG_QUALITY);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Invalid image file: " + file.name));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read file: " + file.name));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPhotoGallery() {
  const grid = document.getElementById("photoGrid");
  const countLabel = document.getElementById("photoCountLabel");
  const selectionLabel = document.getElementById("photoSelectionLabel");
  const selectAllBtn = document.getElementById("selectAllPhotosBtn");
  const deleteSelectedBtn = document.getElementById("deleteSelectedPhotosBtn");
  const count = state.photos.length;
  const selectedCount = state.selectedPhotoIds.length;
  const allSelected = count > 0 && selectedCount === count;

  countLabel.innerText = `${count} photo${count !== 1 ? "s" : ""}`;
  selectAllBtn.disabled = count === 0;
  selectAllBtn.innerHTML = allSelected
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 15 15"></polyline></svg>
      Clear Selection`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
      Select All`;
  deleteSelectedBtn.disabled = selectedCount === 0;
  deleteSelectedBtn.textContent = `Delete Selected (${selectedCount})`;
  selectionLabel.style.display = selectedCount > 0 ? "inline" : "none";
  selectionLabel.textContent = `${selectedCount} selected`;

  grid.innerHTML = "";
  if (count === 0) {
    state.selectedPhotoIds = [];
    grid.innerHTML = `<div class="photo-empty">No photos uploaded yet. Click "Upload Photo" to attach .png or .jpeg documentation photos.</div>`;
    return;
  }

  state.photos.forEach((photo, index) => {
    const card = document.createElement("div");
    card.className = "photo-card" + (state.selectedPhotoIds.includes(photo.id) ? " is-selected" : "");

    const addedDate = photo.addedAt ? new Date(photo.addedAt).toLocaleDateString() : "";

    const img = document.createElement("img");
    img.className = "photo-thumb";
    img.src = photo.dataUrl;
    img.alt = escapeHtml(photo.name);
    img.loading = "lazy";
    img.title = "Click to view full-screen";
    img.addEventListener("click", () => openLightbox(index));

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "photo-check";
    check.title = "Select for batch delete";
    check.checked = state.selectedPhotoIds.includes(photo.id);
    check.addEventListener("change", () => {
      if (check.checked) {
        if (!state.selectedPhotoIds.includes(photo.id)) state.selectedPhotoIds.push(photo.id);
      } else {
        state.selectedPhotoIds = state.selectedPhotoIds.filter(id => id !== photo.id);
      }
      renderPhotoGallery();
    });

    const overlay = document.createElement("div");
    overlay.className = "photo-overlay";
    overlay.innerHTML = `
      <button type="button" class="btn-icon photo-open" title="View full-screen" aria-label="View ${escapeHtml(photo.name)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
      </button>
      <button type="button" class="btn-icon photo-delete" title="Delete photo" aria-label="Delete ${escapeHtml(photo.name)}">
        ${SVG_ICONS.delete}
      </button>
    `;
    overlay.querySelector(".photo-open").addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(index);
    });
    overlay.querySelector(".photo-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deletePhoto(photo.id);
    });

    const meta = document.createElement("div");
    meta.className = "photo-meta";
    meta.title = photo.name;
    meta.textContent = addedDate ? `${photo.name} · ${addedDate}` : photo.name;

    card.appendChild(check);
    card.appendChild(img);
    card.appendChild(overlay);
    card.appendChild(meta);
    grid.appendChild(card);
  });
}

function deletePhoto(id) {
  const idx = state.photos.findIndex(p => p.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this photo from the gallery?")) return;
  state.photos.splice(idx, 1);
  state.selectedPhotoIds = state.selectedPhotoIds.filter(pid => pid !== id);
  if (state.lightboxIndex >= state.photos.length) {
    state.lightboxIndex = Math.max(0, state.photos.length - 1);
  }
  savePhotos();
  renderPhotoGallery();
  updateLightbox();
}

function deleteSelectedPhotos() {
  const count = state.selectedPhotoIds.length;
  if (count === 0) return;
  if (!confirm(`Delete ${count} selected photo${count !== 1 ? "s" : ""} from the gallery? This cannot be undone.`)) return;
  const ids = new Set(state.selectedPhotoIds);
  state.photos = state.photos.filter(p => !ids.has(p.id));
  state.selectedPhotoIds = [];
  if (state.lightboxIndex >= state.photos.length) {
    state.lightboxIndex = Math.max(0, state.photos.length - 1);
  }
  savePhotos();
  renderPhotoGallery();
  updateLightbox();
}

function openLightbox(index) {
  if (!state.photos.length) return;
  state.lightboxIndex = index;
  updateLightbox();
  document.getElementById("photoLightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function updateLightbox() {
  const img = document.getElementById("lightboxImg");
  const caption = document.getElementById("lightboxCaption");
  const prevBtn = document.getElementById("lightboxPrevBtn");
  const nextBtn = document.getElementById("lightboxNextBtn");

  if (!state.photos.length) {
    closeLightbox();
    return;
  }
  state.lightboxIndex = (state.lightboxIndex + state.photos.length) % state.photos.length;
  const photo = state.photos[state.lightboxIndex];
  img.src = photo.dataUrl;
  img.alt = escapeHtml(photo.name);
  caption.textContent = `${photo.name}  ·  ${state.lightboxIndex + 1} / ${state.photos.length}`;
  prevBtn.disabled = state.photos.length <= 1;
  nextBtn.disabled = state.photos.length <= 1;
}

function closeLightbox() {
  document.getElementById("photoLightbox").hidden = true;
  document.body.style.overflow = "";
}

function prevPhoto() {
  if (state.photos.length > 1) {
    state.lightboxIndex = (state.lightboxIndex - 1 + state.photos.length) % state.photos.length;
    updateLightbox();
  }
}

function nextPhoto() {
  if (state.photos.length > 1) {
    state.lightboxIndex = (state.lightboxIndex + 1) % state.photos.length;
    updateLightbox();
  }
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
    populateReasonSelect(document.getElementById("shortageReason"), "");
    updateShortageHint();
    
    dialog.showModal();
  });

  // Live shortage hint while editing quantities
  const poQtyInput = document.getElementById("poQty");
  const sentQtyInput = document.getElementById("sentQty");
  [poQtyInput, sentQtyInput].forEach(input => {
    input.addEventListener("input", updateShortageHint);
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
    const reasonOfShortage = document.getElementById("shortageReason").value || "-";

    if (id) {
      // Edit mode
      const index = state.stores.findIndex(s => s.id === id);
      if (index !== -1) {
        state.stores[index] = {
          ...state.stores[index],
          storeName, poDate, dispatchDate, poQty, sentQty, itemsInPo, verifiedPerson, status, reasonOfShortage
        };
      }
    } else {
      // Add mode
      const newStore = {
        id: "store-" + Date.now(),
        storeName, poDate, dispatchDate, poQty, sentQty, itemsInPo, verifiedPerson, status, reasonOfShortage, shortageDetails: []
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
    if (confirm("Erase all store dispatch data and gallery photos? This cannot be undone.")) {
      state.stores = [];
      state.photos = [];
      state.selectedPhotoIds = [];
      localStorage.removeItem(PHOTO_STORAGE_KEY);
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

  // Shortage SKU-Wise Details controls
  const addSkuBtn = document.getElementById("addSkuBtn");
  const importSkuBtn = document.getElementById("importSkuBtn");
  const exportSkuBtn = document.getElementById("exportSkuBtn");
  const skuFileInput = document.getElementById("skuFileInput");
  const skuStoreFilter = document.getElementById("skuStoreFilter");
  const skuDialog = document.getElementById("skuDialog");
  const skuForm = document.getElementById("skuForm");

  addSkuBtn.addEventListener("click", () => openSkuDialog(null, null));

  importSkuBtn.addEventListener("click", () => skuFileInput.click());

  skuFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    skuFileInput.value = "";
    importSkuDetails(file);
  });

  exportSkuBtn.addEventListener("click", exportSkuDetails);

  skuStoreFilter.addEventListener("change", () => {
    state.skuStoreFilter = skuStoreFilter.value;
    renderShortageSection();
  });

  document.querySelectorAll("#skuTable th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.skuSortKey === key) {
        state.skuSortDir = state.skuSortDir === "asc" ? "desc" : "asc";
      } else {
        state.skuSortKey = key;
        state.skuSortDir = "asc";
      }
      renderShortageSection();
    });
  });

  document.getElementById("closeSkuDialogBtn").addEventListener("click", () => skuDialog.close());
  document.getElementById("cancelSkuDialogBtn").addEventListener("click", () => skuDialog.close());

  // Photo Gallery controls
  const addPhotoBtn = document.getElementById("addPhotoBtn");
  const photoFileInput = document.getElementById("photoFileInput");
  const selectAllPhotosBtn = document.getElementById("selectAllPhotosBtn");
  const deleteSelectedPhotosBtn = document.getElementById("deleteSelectedPhotosBtn");
  const lightbox = document.getElementById("photoLightbox");

  addPhotoBtn.addEventListener("click", () => photoFileInput.click());

  selectAllPhotosBtn.addEventListener("click", () => {
    if (state.photos.length === 0) return;
    const allSelected = state.selectedPhotoIds.length === state.photos.length;
    state.selectedPhotoIds = allSelected ? [] : state.photos.map(p => p.id);
    renderPhotoGallery();
  });

  deleteSelectedPhotosBtn.addEventListener("click", () => {
    if (state.selectedPhotoIds.length === 0) return;
    deleteSelectedPhotos();
  });

  photoFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    photoFileInput.value = "";
    if (files.length === 0) return;
    handlePhotoUpload(files);
  });

  document.getElementById("lightboxCloseBtn").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrevBtn").addEventListener("click", prevPhoto);
  document.getElementById("lightboxNextBtn").addEventListener("click", nextPhoto);

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prevPhoto();
    if (e.key === "ArrowRight") nextPhoto();
  });

  ["skuPoQty", "skuSentQty"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateSkuVariancePreview);
  });

  skuForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const skuId = document.getElementById("formSkuId").value;
    const storeId = document.getElementById("skuStore").value;
    const store = state.stores.find(s => s.id === storeId);
    if (!store) return;

    const detail = {
      id: skuId || "sku-" + Date.now(),
      sku: document.getElementById("skuCode").value.trim(),
      itemDescription: document.getElementById("skuDescription").value.trim(),
      category: document.getElementById("skuCategory").value.trim(),
      poQty: parseInt(document.getElementById("skuPoQty").value) || 0,
      sentQty: parseInt(document.getElementById("skuSentQty").value) || 0,
      status: document.getElementById("skuStatus").value,
      shortageReason: document.getElementById("skuShortageReason").value || "",
      notes: document.getElementById("skuNotes").value.trim() || "-"
    };

    const details = storeDetails(store);
    if (skuId) {
      const idx = details.findIndex(d => d.id === skuId);
      if (idx !== -1) details[idx] = detail;
    } else {
      details.push(detail);
    }
    store.shortageDetails = details;

    saveState();
    skuDialog.close();
    renderDashboard();
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

if (typeof ChartDataLabels !== "undefined") {
  Chart.register(ChartDataLabels);
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
    count: { dark: "rgba(168, 85, 247, 0.85)", light: "rgba(147, 51, 234, 0.85)", border: "#a855f7" },
    po: { dark: "rgba(59, 130, 246, 0.8)", light: "rgba(37, 99, 235, 0.85)", border: "#3b82f6" },
    sent: { dark: "rgba(249, 115, 22, 0.8)", light: "rgba(234, 88, 12, 0.85)", border: "#f97316" },
    shortage: { dark: "rgba(248, 113, 113, 0.8)", light: "rgba(220, 38, 38, 0.85)", border: "#ef4444" }
  };

  const palette = [
    "#3b82f6", "#f97316", "#2dd4bf", "#ef4444", "#a855f7", "#eab308",
    "#22c55e", "#ec4899", "#06b6d4", "#fb923c", "#8b5cf6", "#f43f5e",
    "#10b981", "#f472b6", "#0ea5e9", "#facc15"
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
      },
      datalabels: {
        color: singleSeries ? "#ffffff" : (isDark ? "#e5e7eb" : "#0f172a"),
        font: { family: "Inter", weight: "bold", size: 11 },
        anchor: singleSeries || isStacked ? "center" : "end",
        align: singleSeries || isStacked ? "center" : (isLine ? "top" : "end"),
        formatter: (value) => (typeof value === "number" ? value.toLocaleString() : String(value ?? ""))
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
  populateReasonSelect(document.getElementById("shortageReason"), store.reasonOfShortage === "-" ? "" : store.reasonOfShortage);
  updateShortageHint();

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

// ---- Shortage SKU-Wise Details helpers ----

function storeShortage(store) {
  return Math.max(0, (store.poQty || 0) - (store.sentQty || 0));
}

function storeDetails(store) {
  return Array.isArray(store.shortageDetails) ? store.shortageDetails : [];
}

function detailVariance(detail) {
  return Math.max(0, (detail.poQty || 0) - (detail.sentQty || 0));
}

function detailVariancePct(detail) {
  const po = detail.poQty || 0;
  return po > 0 ? (detailVariance(detail) / po) * 100 : 0;
}

function populateReasonSelect(select, value) {
  select.innerHTML = '<option value="">-- Select Reason --</option>';
  SHORTAGE_REASONS.forEach(reason => {
    const opt = document.createElement("option");
    opt.value = reason;
    opt.textContent = reason;
    select.appendChild(opt);
  });
  if (value) {
    const match = findEnum(value, SHORTAGE_REASONS);
    if (match) {
      select.value = match;
    } else {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
      select.value = value;
    }
  }
}

function populateSkuStatusSelect(value) {
  const select = document.getElementById("skuStatus");
  select.innerHTML = "";
  SKU_STATUSES.forEach(status => {
    const opt = document.createElement("option");
    opt.value = status;
    opt.textContent = status;
    select.appendChild(opt);
  });
  if (value) select.value = value;
}

function populateSkuStoreSelect(selectedId) {
  const select = document.getElementById("skuStore");
  select.innerHTML = "";
  state.stores.forEach(store => {
    const opt = document.createElement("option");
    opt.value = store.id;
    opt.textContent = store.storeName;
    select.appendChild(opt);
  });
  if (selectedId) select.value = selectedId;
}

function updateShortageHint() {
  const poQty = parseInt(document.getElementById("poQty").value) || 0;
  const sentQty = parseInt(document.getElementById("sentQty").value) || 0;
  const hint = document.getElementById("shortageHint");
  if (hint) hint.style.display = sentQty < poQty ? "block" : "none";
}

function updateSkuVariancePreview() {
  const poQty = parseInt(document.getElementById("skuPoQty").value) || 0;
  const sentQty = parseInt(document.getElementById("skuSentQty").value) || 0;
  const variance = Math.max(0, poQty - sentQty);
  const pct = poQty > 0 ? (variance / poQty) * 100 : 0;
  const preview = document.getElementById("skuVariancePreview");
  if (preview) {
    if (variance > 0) {
      preview.style.color = "var(--accent-red)";
      preview.textContent = `${variance.toLocaleString()} units (${pct.toFixed(2)}%)`;
    } else {
      preview.style.color = "var(--accent-green)";
      preview.textContent = "0 units (0.00%) - fully dispatched";
    }
  }
}

function getSkuSortValue(detail, store, key) {
  switch (key) {
    case "storeName": return String(store.storeName).toLowerCase();
    case "variance": return detailVariance(detail);
    case "variancePct": return detailVariancePct(detail);
    case "poQty": return detail.poQty || 0;
    case "sentQty": return detail.sentQty || 0;
    default: return String(detail[key] || "").toLowerCase();
  }
}

function getSkuRows() {
  const rows = [];
  state.stores.forEach(store => {
    const details = storeDetails(store);
    if (state.skuStoreFilter === "all") {
      details.forEach(d => rows.push({ store, detail: d }));
    } else if (store.id === state.skuStoreFilter) {
      details.forEach(d => rows.push({ store, detail: d }));
    }
  });
  return rows;
}

function renderShortageSection() {
  const filterSelect = document.getElementById("skuStoreFilter");
  filterSelect.innerHTML = '<option value="all">All Short Stores</option>';
  state.stores
    .filter(store => storeShortage(store) > 0 || storeDetails(store).length > 0)
    .forEach(store => {
      const opt = document.createElement("option");
      opt.value = store.id;
      opt.textContent = `${store.storeName} (${storeShortage(store).toLocaleString()} short)`;
      filterSelect.appendChild(opt);
    });
  filterSelect.value = state.skuStoreFilter;

  const tableBody = document.getElementById("skuTableBody");
  tableBody.innerHTML = "";

  document.querySelectorAll("#skuTable th.sortable").forEach(th => {
    th.classList.remove("is-asc", "is-desc");
    if (th.dataset.sort === state.skuSortKey) {
      th.classList.add(state.skuSortDir === "asc" ? "is-asc" : "is-desc");
    }
  });

  const rows = getSkuRows().sort((a, b) => {
    const av = getSkuSortValue(a.detail, a.store, state.skuSortKey);
    const bv = getSkuSortValue(b.detail, b.store, state.skuSortKey);
    if (typeof av === "number" && typeof bv === "number") {
      return state.skuSortDir === "asc" ? av - bv : bv - av;
    }
    return state.skuSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  if (rows.length === 0) {
    const hasShortStores = state.stores.some(store => storeShortage(store) > 0);
    const msg = hasShortStores
      ? `No SKU details uploaded for ${state.skuStoreFilter === "all" ? "the short stores" : "this store"}. Use "Add SKU Detail" or "Import Shortage SKUs".`
      : "No shortage found - SKU-wise details are not required.";
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 32px;">${msg}</td></tr>`;
    return;
  }

  rows.forEach(({ store, detail }) => {
    const tr = document.createElement("tr");
    const variance = detailVariance(detail);
    const pct = detailVariancePct(detail);
    const statusClass = detail.status === "FULFILLED" ? "badge-green" : (detail.status === "PARTIAL" ? "badge-orange" : "badge-red");
    tr.innerHTML = `
      <td style="font-weight: 600;">${store.storeName}</td>
      <td style="font-family: monospace; font-weight: 600;">${detail.sku}</td>
      <td>${detail.itemDescription || "-"}</td>
      <td>${detail.category || "-"}</td>
      <td>${(detail.poQty || 0).toLocaleString()}</td>
      <td>${(detail.sentQty || 0).toLocaleString()}</td>
      <td><span class="cell-shortage-qty ${variance > 0 ? "has-shortage" : ""}">${variance.toLocaleString()}</span></td>
      <td>${pct.toFixed(2)}%</td>
      <td><span class="badge ${statusClass}">${detail.status}</span></td>
      <td>${detail.shortageReason || "-"}</td>
      <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${detail.notes || ""}">${detail.notes || "-"}</td>
      <td class="table-actions">
        <button class="btn btn-secondary btn-icon" onclick="editSkuDetail('${store.id}','${detail.id}')" title="Edit">${SVG_ICONS.edit}</button>
        <button class="btn btn-danger btn-icon" onclick="deleteSkuDetail('${store.id}','${detail.id}')" title="Delete">${SVG_ICONS.delete}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openSkuDialog(storeId, skuId) {
  state.skuEditingId = skuId || null;
  const dialog = document.getElementById("skuDialog");
  document.getElementById("skuDialogTitle").innerText = skuId ? "Edit SKU Shortage Detail" : "Add SKU Shortage Detail";
  document.getElementById("skuForm").reset();
  document.getElementById("formSkuId").value = skuId || "";

  if (skuId) {
    const target = state.stores.find(s => storeDetails(s).some(d => d.id === skuId));
    if (target) {
      const detail = storeDetails(target).find(d => d.id === skuId);
      populateSkuStoreSelect(target.id);
      document.getElementById("skuCode").value = detail.sku;
      document.getElementById("skuDescription").value = detail.itemDescription || "";
      document.getElementById("skuCategory").value = detail.category || "";
      document.getElementById("skuPoQty").value = detail.poQty || 0;
      document.getElementById("skuSentQty").value = detail.sentQty || 0;
      populateSkuStatusSelect(detail.status);
      populateReasonSelect(document.getElementById("skuShortageReason"), detail.shortageReason || "");
      document.getElementById("skuNotes").value = detail.notes || "";
    }
  } else {
    populateSkuStoreSelect(state.skuStoreFilter !== "all" ? state.skuStoreFilter : (state.stores[0] ? state.stores[0].id : ""));
    populateSkuStatusSelect(SKU_STATUSES[0]);
    populateReasonSelect(document.getElementById("skuShortageReason"), "");
  }
  updateSkuVariancePreview();
  dialog.showModal();
}

window.editSkuDetail = function(storeId, skuId) {
  openSkuDialog(storeId, skuId);
};

window.deleteSkuDetail = function(storeId, skuId) {
  const store = state.stores.find(s => s.id === storeId);
  if (!store) return;
  if (confirm("Are you sure you want to delete this SKU shortage detail?")) {
    store.shortageDetails = storeDetails(store).filter(d => d.id !== skuId);
    saveState();
    renderDashboard();
  }
};

function importSkuDetails(file) {
  const SKU_ALIASES = {
    storeName: ["Store Name", "Store", "storeName"],
    sku: ["SKU Code", "SKU", "SKU Code", "sku"],
    itemDescription: ["Item Description", "Description", "Item", "itemDescription"],
    category: ["Category", "category"],
    poQty: ["No. of Qty. in PO", "Qty. in PO", "PO Qty", "PO Quantity", "poQty"],
    sentQty: ["Sent Qty", "Sent Quantity", "sentQty"],
    variance: ["Shortage Qty", "Shortage (Variance)", "Variance", "Shortage Qty. as Variance"],
    variancePct: ["Variance %", "Variance Percent", "variancePct"],
    status: ["Status", "status"],
    shortageReason: ["Shortage Reason", "Reason of Shortage", "Reason", "shortageReason"],
    notes: ["Notes", "Note", "notes"]
  };

  BulkImport.openImport({
    file,
    fieldAliases: SKU_ALIASES,
    existingCount: getSkuRows().length,
    previewColumns: [
      { field: "storeName", label: "Store Name" },
      { field: "sku", label: "SKU Code" },
      { field: "itemDescription", label: "Item Description" },
      { field: "category", label: "Category" },
      { field: "poQty", label: "Qty. in PO" },
      { field: "sentQty", label: "Sent Qty." },
      { field: "status", label: "Status" },
      { field: "shortageReason", label: "Shortage Reason" }
    ],
    transformRow: (row) => {
      const errors = [];
      const sku = BulkImport.parseText(row.sku);
      if (!sku) errors.push("SKU Code is required");

      const storeName = BulkImport.parseText(row.storeName);
      let storeId = null;
      if (storeName) {
        const match = state.stores.find(s => normEnumKey(s.storeName) === normEnumKey(storeName));
        if (match) storeId = match.id;
        else errors.push(`Store "${storeName}" not found`);
      } else if (state.skuStoreFilter !== "all") {
        storeId = state.skuStoreFilter;
      } else {
        errors.push("Store Name is required");
      }

      const poQty = BulkImport.parseNumber(row.poQty, errors, "Qty. in PO");
      if (poQty !== null && poQty < 0) errors.push("Qty. in PO cannot be negative");

      const sentQty = BulkImport.parseNumber(row.sentQty, errors, "Sent Qty");
      if (sentQty !== null && sentQty < 0) errors.push("Sent Qty cannot be negative");

      const statusText = BulkImport.parseText(row.status);
      const statusRes = statusText ? BulkImport.parseEnum(statusText, SKU_STATUSES, "Status") : { value: "" };
      if (statusRes.error) errors.push(statusRes.error);

      let shortageReason = "";
      const reasonText = BulkImport.parseText(row.shortageReason);
      if (reasonText) {
        const match = findEnum(reasonText, SHORTAGE_REASONS);
        shortageReason = match || reasonText;
      }

      return {
        errors,
        value: {
          storeId,
          sku,
          itemDescription: BulkImport.parseText(row.itemDescription),
          category: BulkImport.parseText(row.category),
          poQty: poQty ?? 0,
          sentQty: sentQty ?? 0,
          status: statusRes.value || "SHORTAGE",
          shortageReason,
          notes: BulkImport.parseText(row.notes) || "-"
        }
      };
    },
    onImport: (records) => {
      let imported = 0;
      const byStore = {};
      records.forEach(r => {
        if (!byStore[r.storeId]) byStore[r.storeId] = [];
        byStore[r.storeId].push(r);
      });
      Object.keys(byStore).forEach(storeId => {
        const store = state.stores.find(s => s.id === storeId);
        if (!store) return;
        const details = storeDetails(store);
        byStore[storeId].forEach(r => {
          const existing = details.findIndex(d => normEnumKey(d.sku) === normEnumKey(r.sku));
          if (existing !== -1) {
            details[existing] = { id: details[existing].id, ...r };
          } else {
            details.push({ id: "sku-" + Date.now() + "-" + imported, ...r });
          }
          imported++;
        });
        store.shortageDetails = details;
      });
      saveState();
      renderDashboard();
      alert(`Successfully imported ${imported} SKU shortage detail${imported !== 1 ? "s" : ""}.`);
    }
  });
}

function exportSkuDetails() {
  const rows = getSkuRows();
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Store Name,SKU Code,Item Description,Category,No. of Qty. in PO,Sent Qty,Shortage Qty (Variance),Variance %,Status,Shortage Reason,Notes\n";

  rows.forEach(({ store, detail }) => {
    const variance = detailVariance(detail);
    const pct = detailVariancePct(detail).toFixed(2);
    const row = [
      `"${store.storeName}"`,
      `"${detail.sku}"`,
      `"${detail.itemDescription || "-"}"`,
      `"${detail.category || "-"}"`,
      detail.poQty || 0,
      detail.sentQty || 0,
      variance,
      pct,
      `"${detail.status}"`,
      `"${detail.shortageReason || "-"}"`,
      `"${detail.notes || "-"}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const anchor = document.createElement("a");
  anchor.setAttribute("href", encodeURI(csvContent));
  anchor.setAttribute("download", `shortage_sku_details_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getStoreSortValue(store, key) {
  switch (key) {
    case "shortage": return Math.max(0, store.poQty - store.sentQty);
    case "poQty": return store.poQty || 0;
    case "sentQty": return store.sentQty || 0;
    case "itemsInPo": return store.itemsInPo || 0;
    case "status": return store.status || "";
    case "shortageDetails": return storeDetails(store).length;
    default: return String(store[key] || "").toLowerCase();
  }
}

function renderDashboard() {
  const allStores = state.stores;
  if (window.DateFilter) {
    state.stores = DateFilter.apply(allStores, s => s.dispatchDate || s.poDate);
    DateFilter.setCount(state.stores.length, allStores.length);
  }
  try {
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

    const detailCount = storeDetails(s).length;
    const detailBadge = shortage > 0
      ? (detailCount > 0
          ? `<span class="badge badge-green" title="SKU-wise shortage details uploaded">${detailCount} SKU${detailCount !== 1 ? "s" : ""}</span>`
          : `<span class="badge badge-red" title="SKU-wise shortage details required">DETAILS PENDING</span>`)
      : `<span style="color: var(--text-muted);">-</span>`;

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
      <td>${detailBadge}</td>
      <td class="table-actions">
        <button class="btn btn-secondary btn-icon" onclick="editStore('${s.id}')" title="Edit">${SVG_ICONS.edit}</button>
        <button class="btn btn-danger btn-icon" onclick="deleteStore('${s.id}')" title="Delete">${SVG_ICONS.delete}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Render Summary Row in Table if there are stores
  if (state.stores.length > 0) {
    const totalDetailCount = state.stores.reduce((acc, s) => acc + storeDetails(s).length, 0);
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
      <td>${totalDetailCount} SKU${totalDetailCount !== 1 ? "s" : ""}</td>
      <td class="table-actions"></td>
    `;
    tableBody.appendChild(summaryTr);
  } else {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 32px;">No dispatch records found. Click "Add Store Dispatch" to create one.</td></tr>`;
  }

  // 4. Render Dynamic Operational Shortage & Root Cause Analysis
  renderRootCauseAnalysis(kpi);

  // 5. Render Dynamic Action Items & Strategic Recommendations
  renderRecommendations(kpi);

  // 5.1 Render Shortage SKU-Wise Details
  renderShortageSection();

  // 5.2 Render Photo Gallery
  renderPhotoGallery();

  // 6. Draw Chart
  renderChart();
  syncChartControls();
  } finally {
    state.stores = allStores;
  }
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

  // 4. Shortage documentation compliance
  const missingDetailsStores = state.stores.filter(s => storeShortage(s) > 0 && storeDetails(s).length === 0);
  if (missingDetailsStores.length > 0) {
    const namesText = missingDetailsStores.map(s => s.storeName).join(", ");
    const row = document.createElement("div");
    row.className = "recommendation-row";
    row.innerHTML = `
      <span class="tag-badge" style="background-color: var(--badge-red); color: var(--accent-red); border-color: rgba(248,113,113,0.25);">SHORTAGE DOCUMENTATION</span>
      <div class="recommendation-text">
        <strong>SKU-wise shortage details pending for: ${namesText}.</strong> Upload the short-SKU break-up (SKU Code, Item Description, Category, PO/Sent Qty, Variance, Status, Notes) in the Shortage SKU-Wise Details section to complete the shortage documentation.
      </div>
    `;
    container.appendChild(row);
  }
}

// Start the Application
window.addEventListener("DOMContentLoaded", initApp);
