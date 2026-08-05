# Data Model

All application data lives in the browser's `localStorage`. There is no backend
or database. Keys must never be renamed - existing users' data depends on them.

| Storage key | Owned by | Content |
| --- | --- | --- |
| `warehouse_dashboard_stores_v2` | `src/js/app.js` | Store Dispatch records |
| `inventory_cycle_count_stores_v3` | `src/js/inventory.js` | Cycle Count records |
| `rtv_entries_v1` | `src/js/rtv.js` | RTV return entries |
| `warehouse_dashboard_theme` | all pages | Shared `dark` / `light` theme |

When a key is absent or unparseable, the page seeds defaults from the
`DEFAULT_*` constant at the top of its owning JS file.

## Store Dispatch (`warehouse_dashboard_stores_v2`)

Array of records:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique, e.g. `store-1` |
| `storeName` | string | Destination store name |
| `poDate` | string | PO raised date, `YYYY-MM-DD` |
| `dispatchDate` | string | Dispatched date, `YYYY-MM-DD` |
| `poQty` | number | Total PO quantity |
| `sentQty` | number | Quantity dispatched |
| `itemsInPo` | number | Number of line items in the PO |
| `verifiedPerson` | string | Who verified the dispatch |
| `status` | string enum | `DELIVERED` / `READY TO DISPATCH` / `SHORTAGE` / `IN TRANSIT` |
| `reasonOfShortage` | string | Root-cause note (picked from the shortage reason dropdown) |
| `shortageDetails` | array | SKU-wise shortage break-up (required whenever `poQty > sentQty`) |

Derived per record: `shortage = poQty - sentQty`.

### Shortage detail record (`store.shortageDetails[]`)

Each entry documents a short SKU line for a store:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique, e.g. `sku-...` |
| `sku` | string | SKU code |
| `itemDescription` | string | Item / product description |
| `category` | string | Product category |
| `poQty` | number | Quantity in PO |
| `sentQty` | number | Quantity dispatched |
| `status` | string enum | `FULFILLED` / `PARTIAL` / `SHORTAGE` / `NOT DISPATCHED` |
| `shortageReason` | string | Reason from the shortage reason dropdown |
| `notes` | string | Free text |

Derived per detail: `variance = poQty - sentQty`, `variancePct = variance / poQty * 100`.

A store with `poQty > sentQty` is flagged **DETAILS PENDING** in the report until at least one shortage detail is uploaded.

## Inventory Cycle Count (`inventory_cycle_count_stores_v3`)

Array of records:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique, e.g. `item-1` |
| `itemName` | string | Item / product name |
| `sku` | string | SKU code |
| `category` | string | e.g. `FLOWER SEED`, `VEGETABLE SEEDS` |
| `binLocation` | string | Rack-bin location code |
| `systemQty` | number | System stock |
| `physicalQty` | number | Physical counted stock |
| `countedBy` | string | Counter's name |
| `countDate` | string | Count date, `YYYY-MM-DD` |
| `notes` | string | Free text |

Derived per record: `variance = systemQty - physicalQty`; a record matches when
`variance === 0`.

## RTV Entries (`rtv_entries_v1`)

Array of records:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique, e.g. `rtv-1` |
| `warehouseLocation` | string | Origin warehouse / FC |
| `channelName` | string | Sales channel, e.g. `Amazon`, `Flipkart` |
| `receiveDate` | string | Receive date, `YYYY-MM-DD` |
| `receivedQty` | number | Quantity received back |
| `unboxingStatus` | string enum | `DONE` / `IN PROGRESS` / `PENDING` |
| `videoUploadStatus` | string enum | `UPLOADED` / `NOT UPLOADED` |
| `booking` | string enum | `BOOKED` / `IN PROGRESS` / `NOT BOOKED` |
| `notes` | string | Free text |

## Import / export

- Export serialises the current record array to JSON or CSV (built client-side).
- Import (via `src/js/data-import.js`) accepts JSON, CSV, or XLSX, maps headers
  by fuzzy matching, validates rows, and only writes after a preview confirms.
- Dates are parsed from `DD/MM/YYYY`, ISO `YYYY-MM-DD`, or Excel serial numbers.
