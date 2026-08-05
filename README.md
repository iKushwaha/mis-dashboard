# MIS Dashboard

A client-side MIS (Management Information System) reporting suite for supply-chain & warehouse operations, consisting of three linked dashboards plus an overview landing page:

1. **All Reports Overview** (`home.html`) — attractive landing dashboard with live summary KPIs
2. **Store Dispatch Report** (`index.html`)
3. **Inventory Cycle Count Report** (`inventory.html`)
4. **Return to Vendor / Origin (RTV) Report** (`rtv.html`)

Each dashboard is a self-contained single-page app built with vanilla HTML/CSS/JavaScript. All data lives in the browser (LocalStorage); no backend or database is required.

## Dashboards

| Report | Table | Key Metrics | Charts |
| --- | --- | --- | --- |
| All Reports (`home.html`) | Report cards + summary tiles | Dispatch Efficiency, Total Shortage, Inventory Accuracy, Items Counted, RTV Completion Score, Qty Returned | — |
| Store Dispatch | Store-Wise Purchase Order & Dispatch Summary | Total PO Qty, Total Sent Qty, Total Shortage, Dispatch Efficiency | PO vs Sent vs Shortage by store |
| Inventory Cycle Count | Item-Wise Cycle Count & Variance Summary | Items Counted, System Qty, Physical Qty, Total Variance (SKU count), Accuracy / Match Rate | Variance by item / by category (bar, line, doughnut, pie, polar area) |
| RTV | Return Entry Log & Processing Summary | Total Qty Returned, Top Location, Completion Score, Entries Processed | Warehouse % of total volume, channel volume, unboxing / video / booking status |

Every dashboard also includes:

- **KPI cards** with live totals and sub-metrics
- **Root Cause Analysis** and **Action Items & Strategic Recommendations** panels driven by the current dataset
- **Add / Edit / Delete** records via modal dialogs
- **Sortable table columns** (click a header to sort asc/desc)
- **Filter dropdowns** (e.g. status / category in the Cycle Count report)
- **Theme toggle** (dark / light, shared across all three pages)

## Data Management

- **Bulk import** – JSON, CSV, or Excel (`.xlsx` / `.xls`) via the shared `data-import.js` engine:
  - Fuzzy header matching (e.g. `Store Name` / `Store`, `SKU Code` / `SKU`)
  - Row-level validation with precise error messages (missing fields, invalid numbers, bad dates, invalid enums)
  - Dates parsed as `DD/MM/YYYY`, ISO (`YYYY-MM-DD`), or Excel serial numbers
  - A preview dialog shows valid rows and rejected rows (with reasons) before anything is written
- **Export** – download the current data as JSON or CSV
- **Print** – print-friendly rendering of the active report
- **Reset** – erase all locally stored data for that report

All data persists in the browser's LocalStorage:

| Dashboard | Storage key |
| --- | --- |
| Store Dispatch | `warehouse_dashboard_stores_v2` |
| Inventory Cycle Count | `inventory_cycle_count_stores_v3` |
| RTV | `rtv_entries_v1` |
| Theme (shared) | `warehouse_dashboard_theme` |

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no build step, no framework)
- [Chart.js](https://www.chartjs.org/) (CDN) for visual analytics
- [SheetJS (xlsx)](https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js) (CDN) for Excel import
- Native `<dialog>` elements, CSS custom properties, responsive grid layouts

## Getting Started

No installation or build step is required. Serve the directory over any static file server:

```bash
./scripts/serve.sh        # or: python3 -m http.server 8080
```

Then open:

- http://localhost:8080/home.html – All Reports Overview
- http://localhost:8080/index.html – Store Dispatch Report
- http://localhost:8080/inventory.html – Inventory Cycle Count Report
- http://localhost:8080/rtv.html – RTV Report

Use the **report switcher** in the header toolbar (on every page) to jump between All Reports, Store Dispatch, Inventory Cycle Count, and RTV.

## Project Structure

```
.
├── home.html         # All Reports overview / landing page
├── index.html        # Store Dispatch Report
├── inventory.html    # Inventory Cycle Count Report
├── rtv.html          # Return to Vendor/Origin Report
├── src/
│   ├── css/
│   │   └── index.css         # Shared styles (themes, layouts, components)
│   ├── js/
│   │   ├── home.js           # Overview logic (live summary KPIs, theme)
│   │   ├── app.js            # Store Dispatch logic
│   │   ├── inventory.js      # Cycle Count logic
│   │   ├── rtv.js            # RTV logic
│   │   └── data-import.js    # Shared bulk-import engine (JSON/CSV/XLSX + validation + preview)
│   └── assets/
│       └── ugaoo-logo.png    # Brand logo used in report headers
├── docs/
│   ├── data-model.md         # LocalStorage schemas & keys
│   └── architecture.md       # Page map, module responsibilities
├── scripts/
│   └── serve.sh              # Local static file server
├── tests/
│   └── smoke.html            # Manual smoke check (all pages / assets load)
└── .gitignore
```

## Notes

- Data is stored locally per browser; clearing site data or switching browsers resets the reports to their seeded defaults.
- Tip: use **Export CSV** to download a template, bulk-edit it in a spreadsheet, then re-import it.
