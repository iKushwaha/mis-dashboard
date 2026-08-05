# Architecture

A client-side MIS reporting suite built with vanilla HTML / CSS / JavaScript.
No build step, no framework, no backend - serve the directory over any static
file server (`python3 -m http.server 8080`).

## Page map

| Page | Report | Logic | Storage key |
| --- | --- | --- | --- |
| `home.html` | All Reports overview | `src/js/home.js` | reads all three keys |
| `index.html` | Store Dispatch | `src/js/app.js` | `warehouse_dashboard_stores_v2` |
| `inventory.html` | Inventory Cycle Count | `src/js/inventory.js` | `inventory_cycle_count_stores_v3` |
| `rtv.html` | RTV | `src/js/rtv.js` | `rtv_entries_v1` |

All four pages stay siblings at the root so their relative links to each other
(the report switcher dropdown and the home-page report cards) keep working.

## Directory layout

```
.
├── home.html / index.html / inventory.html / rtv.html   # entry pages
├── src/
│   ├── css/index.css       # shared styles + dark/light themes + responsive
│   ├── js/                 # per-report logic + shared engine
│   └── assets/             # static images (brand logo)
├── docs/                   # architecture + data model documentation
├── scripts/serve.sh        # local dev server
└── tests/smoke.html        # manual smoke check for all pages
```

## Module responsibilities

- **`src/js/data-import.js`** - Shared bulk-import engine. Exposes `window.BulkImport`.
  Handles JSON / CSV / XLSX parsing, fuzzy header matching, row validation with
  error messages, date parsing (`DD/MM/YYYY`, ISO, Excel serials), and a preview
  dialog before anything is written to storage.
- **`src/js/app.js`** - Store Dispatch. Owns `DEFAULT_STORES`, state, CRUD modal,
  KPI aggregation, Chart.js chart, root-cause & recommendations panels, and the
  import/export/print/reset toolbar.
- **`src/js/inventory.js`** - Cycle Count. Owns `DEFAULT_ITEMS`, state (incl.
  chart mode/type/metric and status/category filters), CRUD, variance analytics,
  and multiple chart renderings.
- **`src/js/rtv.js`** - RTV. Owns `DEFAULT_ENTRIES`, state, CRUD, and channel /
  warehouse / status analytics.
- **`src/js/home.js`** - Overview. Reads all three report keys, computes headline
  KPIs, and populates the report cards and summary tiles.
- **`src/css/index.css`** - Single shared stylesheet. Google Fonts via `@import`,
  CSS custom properties for the dark/light themes, and responsive grid layouts.
- **`src/assets/ugaoo-logo.png`** - Brand logo referenced by every page header.

## Cross-page conventions

- Pages expose global functions (on `window`) consumed by inline `on*` HTML
  attributes; JS files are loaded as classic scripts in dependency order
  (`data-import.js` first, then the report script).
- Theme is shared: all pages read/write the same `warehouse_dashboard_theme` key.
- External dependencies are loaded from CDN only:
  - `https://cdn.jsdelivr.net/npm/chart.js`
  - `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`

## Local development

```bash
./scripts/serve.sh          # -> python3 -m http.server 8080
# open http://localhost:8080/home.html
```

See `docs/data-model.md` for the storage schemas.
