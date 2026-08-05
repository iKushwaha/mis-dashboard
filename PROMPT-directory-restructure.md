# Prompt: Restructure the MIS Dashboard into a Best-Practice Project Directory

Paste the block below into any AI coding tool to restructure this project safely.

---

ROLE

You are a senior software architect. Restructure this flat vanilla HTML/CSS/JS
project into a clean, best-practice directory layout that follows standard
software development conventions - WITHOUT breaking any existing functionality.
No build tooling, bundler, or framework may be introduced.

PROJECT CONTEXT (current state - verified)

- A client-side MIS reporting suite: 4 static pages, no backend, no database,
  no build step. All data lives in browser LocalStorage.
- Files at project root:
    home.html       All Reports overview / landing page
    index.html      Store Dispatch Report
    inventory.html  Inventory Cycle Count Report
    rtv.html        RTV Report
    home.js         Overview logic
    app.js          Store Dispatch logic
    inventory.js    Cycle Count logic
    rtv.js          RTV logic
    data-import.js  Shared bulk-import engine (JSON/CSV/XLSX + validation)
    index.css       Shared styles (dark/light themes, responsive layout)
    ugaoo-logo.png  Brand logo
    README.md, .gitignore
- All local cross-references live ONLY in the HTML files (relative paths):
    <link rel="stylesheet" href="index.css">
    <script src="home.js"> / "data-import.js" / "app.js" / "inventory.js" / "rtv.js"
    <img src="ugaoo-logo.png">
    Inter-page links via the report switcher and report cards:
        home.html, index.html, inventory.html, rtv.html
- The JS files contain NO imports, requires, or fetch/XHR calls; they expose
  globals (window.*) consumed by inline on* attributes in the HTML.
- index.css imports Google Fonts via @import and uses inline data: URIs only.
- CDN scripts (must be preserved exactly as-is):
    https://cdn.jsdelivr.net/npm/chart.js
    https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
- LocalStorage keys (must NOT be renamed or touched):
    warehouse_dashboard_stores_v2
    inventory_cycle_count_stores_v3
    rtv_entries_v1
    warehouse_dashboard_theme

NON-NEGOTIABLE CONSTRAINTS (do not break any of these)

1. Functionality must be pixel-identical: KPI cards, charts (Chart.js), tables,
   add/edit/delete modals, sorting, filtering, bulk import (JSON/CSV/XLSX),
   export, print, reset, dark/light theme toggle, responsive breakpoints.
2. Never rename LocalStorage keys, never change seeded default data, never
   alter business/aggregation logic inside the JS files.
3. Keep the no-build, no-framework, static-file-serve architecture
   (python3 -m http.server still works).
4. CDN URLs and the Google Fonts import must remain untouched.
5. The four HTML pages must stay SIBLINGS in the same directory so their
   relative links to each other keep working.
6. Do not delete, reformat, or "modernize" existing code content. Only MOVE
   files and update the absolute minimum of references required.

TARGET DIRECTORY LAYOUT (follow this exactly)

.
├── home.html                  # entry pages stay at root (siblings)
├── index.html
├── inventory.html
├── rtv.html
├── src/
│   ├── css/
│   │   └── index.css          # moved from root
│   ├── js/
│   │   ├── app.js
│   │   ├── home.js
│   │   ├── inventory.js
│   │   ├── rtv.js
│   │   └── data-import.js     # shared module
│   └── assets/
│       └── ugaoo-logo.png
├── docs/
│   ├── data-model.md          # document the 4 LocalStorage schemas + keys
│   └── architecture.md        # page map, file responsibilities, shared engine
├── scripts/
│   └── serve.sh               # #!/usr/bin/env bash -> python3 -m http.server 8080
├── tests/
│   └── smoke.html             # optional: links to each page; must open without 404s
├── README.md                  # update the "Project Structure" section to match
├── .gitignore                 # keep as-is (already covers macOS + node artifacts)
└── PROMPT-directory-restructure.md

MIGRATION RULES

- Use `git mv` to preserve history. Commit once at the end with a concise
  message describing the restructure.
- After moving files, update every local reference in the four HTML files:
  stylesheet, scripts, img src, and any href that pointed at moved pages.
  Because the pages remain at root, these become:
    <link rel="stylesheet" href="src/css/index.css">
    <script src="src/js/data-import.js"></script>
    <img src="src/assets/ugaoo-logo.png">
  Inter-page links (home/index/inventory/rtv.html) stay unchanged.
- Verify with a recursive grep that no file references a path that no longer
  exists (e.g. "index.css", "home.js", "ugaoo-logo.png" without the src/ prefix).
- Only create docs/*.md and scripts/serve.sh as NEW files; everything else is a
  pure file move. Do not invent files that add no value.

VERIFICATION CHECKLIST (run all, in order)

1. ./scripts/serve.sh (or python3 -m http.server 8080) starts cleanly.
2. Open home.html, index.html, inventory.html, rtv.html in a browser:
   - No console errors (view-source / DevTools).
   - All four pages reachable from the report switcher and from the home cards.
   - Logo renders; styles load; charts draw on the report pages.
   - Theme toggle persists across pages (localStorage key unchanged).
3. grep the repo for stale references: no remaining hrefs or src attributes
   pointing at old flat paths (index.css, home.js, ugaoo-logo.png at root).
4. git status shows only moves + the new files (docs/*, scripts/serve.sh).
5. README "Project Structure" section matches the new tree.

DEFINITION OF DONE

- Directory matches the TARGET layout exactly.
- All pages open with zero console errors and full functionality.
- Only expected changes in git diff (moves + reference updates + new docs).
- Existing functionality, data keys, CDNs, and no-build architecture intact.

EXECUTE NOW.
