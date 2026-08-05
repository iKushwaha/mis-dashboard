/* Shared bulk import helper: JSON / CSV / XLSX parsing, row validation and preview-confirm.
   Requires SheetJS (xlsx.full.min.js) for CSV/XLSX. Exposes window.BulkImport. */
(function () {
  "use strict";

  function normalizeHeader(h) {
    return String(h)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  // Parses a date into YYYY-MM-DD. Pushes errors onto the provided array.
  // Handles JS Date objects, Excel serial numbers and text (DD/MM/YYYY or YYYY-MM-DD).
  function parseDate(value, errors) {
    if (value === null || value === undefined || value === "") {
      errors.push("date is missing");
      return "";
    }
    if (typeof value === "number") {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (isNaN(d.getTime())) {
        errors.push("invalid date");
        return "";
      }
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        errors.push("invalid date");
        return "";
      }
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    let m = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (m) {
      const y = +m[1], mo = +m[2], d = +m[3];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      errors.push(`invalid date "${str}"`);
      return "";
    }
    m = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (m) {
      const d = +m[1], mo = +m[2], y = +m[3];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      errors.push(`invalid date "${str}"`);
      return "";
    }
    errors.push(`unrecognized date "${str}" (use DD/MM/YYYY or YYYY-MM-DD)`);
    return "";
  }

  // Parses a number, stripping thousands commas. Returns null when blank.
  function parseNumber(value, errors, label) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return value;
    const cleaned = String(value).trim().replace(/,/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    if (isNaN(n)) {
      errors.push(`${label || "Value"} must be a number`);
      return null;
    }
    return n;
  }

  // Normalizes a status value to UPPERCASE and validates against allowed values.
  function parseEnum(value, allowed, label) {
    const v = parseText(value).toUpperCase().replace(/\s+/g, " ");
    if (!v) return { value: "", error: `${label} is required` };
    if (!allowed.includes(v)) {
      return { value: "", error: `${label} must be one of: ${allowed.join(" / ")}` };
    }
    return { value: v, error: null };
  }

  // Minimal robust CSV parser (handles quoted fields, escaped quotes, BOM and
  // comma/semicolon/tab delimiters). Keeps every field as text so dates and
  // numbers are interpreted by our own validators, never by a library guess.
  function detectDelimiter(text) {
    const firstLine = text.split(/\r?\n/, 1)[0] || "";
    const counts = { ",": 0, ";": 0, "\t": 0 };
    for (const ch of firstLine) {
      if (ch in counts) counts[ch]++;
    }
    let best = ",";
    let bestCount = -1;
    for (const d in counts) {
      if (counts[d] > bestCount) {
        best = d;
        bestCount = counts[d];
      }
    }
    return best;
  }

  function parseCSV(text, delim) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // ignore carriage returns; \n is the row terminator
      } else {
        field += ch;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function csvToRows(text) {
    const clean = String(text).replace(/^\uFEFF/, "");
    const delim = detectDelimiter(clean);
    const grid = parseCSV(clean, delim).filter((r) => r.some((c) => c.trim() !== ""));
    if (!grid.length) throw new Error("The file is empty.");
    const headers = grid[0].map(normalizeHeader);
    const out = [];
    for (let i = 1; i < grid.length; i++) {
      const obj = {};
      grid[i].forEach((val, j) => {
        obj[headers[j] || `column${j + 1}`] = val;
      });
      out.push(obj);
    }
    if (!out.length) throw new Error("The file has no data rows (header row + at least one record required).");
    return out;
  }

  async function parseFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "json") {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Failed to parse JSON file.");
      }
      if (!Array.isArray(data)) {
        throw new Error("Invalid JSON format. Expected an array of records.");
      }
      return data;
    }
    if (ext === "csv") {
      const text = await file.text();
      return csvToRows(text);
    }
    if (ext === "xlsx" || ext === "xls") {
      if (typeof XLSX === "undefined") {
        throw new Error("Excel parser (SheetJS) failed to load. Check your internet connection.");
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("The workbook/sheet is empty.");
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
      if (!rows.length) throw new Error("The file has no data rows (header row + at least one record required).");
      return rows;
    }
    throw new Error(`Unsupported file type ".${ext}". Use .csv, .xlsx or .json.`);
  }

  function mapColumns(row, fieldAliases) {
    const keyMap = {};
    Object.keys(row).forEach((k) => {
      const norm = normalizeHeader(k);
      if (!(norm in keyMap)) keyMap[norm] = k;
    });
    const out = {};
    Object.keys(fieldAliases).forEach((field) => {
      const aliases = fieldAliases[field].map(normalizeHeader);
      for (const a of aliases) {
        if (keyMap[a] !== undefined) {
          out[field] = row[keyMap[a]];
          break;
        }
      }
    });
    return out;
  }

  function processRows(rows, fieldAliases, transformRow) {
    const valid = [];
    const invalid = [];
    rows.forEach((row, idx) => {
      const mapped = mapColumns(row, fieldAliases);
      const result = transformRow(mapped, idx);
      if (result.errors && result.errors.length) {
        invalid.push({ row: idx + 1, reason: result.errors.join("; ") });
      } else {
        valid.push(result.value);
      }
    });
    return { valid, invalid };
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? "" : str).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function previewAndImport({ fileName, total, valid, invalid, previewColumns, existingCount }) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "dialog-import-preview";
      dialog.setAttribute("closedby", "any");

      const previewRows = valid.slice(0, 8);
      const cols = previewColumns.filter((c) => previewRows.some((r) => r[c.field] !== undefined && r[c.field] !== ""));

      let tableHtml = "";
      if (previewRows.length && cols.length) {
        tableHtml = `
          <div class="table-responsive" style="max-height: 240px; overflow: auto; margin-top: 12px;">
            <table class="data-table">
              <thead><tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
              <tbody>
                ${previewRows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c.field])}</td>`).join("")}</tr>`).join("")}
              </tbody>
            </table>
          </div>
          ${valid.length > previewRows.length ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0 0;">+ ${valid.length - previewRows.length} more valid record${valid.length - previewRows.length !== 1 ? "s" : ""} (not shown)</p>` : ""}
        `;
      } else {
        tableHtml = `<p style="color: var(--text-muted); margin: 12px 0 0;">No valid records to import.</p>`;
      }

      const invalidHtml = invalid.length
        ? `<div style="max-height: 160px; overflow: auto; margin-top: 16px;">
             <p style="color: var(--accent-red); font-weight: 600; margin: 0 0 8px;">Rejected rows (${invalid.length})</p>
             <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-secondary);">
               ${invalid.slice(0, 20).map((i) => `<li>Row ${i.row}: ${escapeHtml(i.reason)}</li>`).join("")}
             </ul>
             ${invalid.length > 20 ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0 0;">+ ${invalid.length - 20} more rejected row${invalid.length - 20 !== 1 ? "s" : ""}</p>` : ""}
           </div>`
        : "";

      dialog.innerHTML = `
        <div class="dialog-header">
          <h3 class="dialog-title">Import Preview</h3>
          <button class="dialog-close" data-close aria-label="Close dialog">&times;</button>
        </div>
        <div style="padding: 0 0 16px;">
          <p style="margin: 0 0 8px; font-size: 0.9rem;"><strong>${escapeHtml(fileName)}</strong> — ${total} rows read, <strong style="color: var(--accent-green);">${valid.length} valid</strong>, <strong style="color: var(--accent-red);">${invalid.length} rejected</strong>.</p>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">This will replace the current ${existingCount} record${existingCount !== 1 ? "s" : ""} with the ${valid.length} validated record${valid.length !== 1 ? "s" : ""}.</p>
          ${tableHtml}
          ${invalidHtml}
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
          <button type="button" class="btn btn-primary" data-confirm ${valid.length ? "" : "disabled"}>Import ${valid.length} Valid Record${valid.length !== 1 ? "s" : ""}</button>
        </div>
      `;

      document.body.appendChild(dialog);

      let confirmed = false;
      const close = () => {
        dialog.close();
        dialog.remove();
      };
      dialog.querySelector("[data-close]").addEventListener("click", close);
      dialog.querySelector("[data-cancel]").addEventListener("click", close);
      dialog.querySelector("[data-confirm]").addEventListener("click", () => {
        confirmed = true;
        close();
      });

      if (!("closedBy" in HTMLDialogElement.prototype)) {
        dialog.addEventListener("click", (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
          if (!isContent) close();
        });
      }

      dialog.addEventListener("close", () => {
        resolve(confirmed ? valid : null);
      });
      dialog.showModal();
    });
  }

  async function openImport(config) {
    const { file, fieldAliases, transformRow, previewColumns, existingCount, onImport } = config;
    let rows;
    try {
      rows = await parseFile(file);
    } catch (err) {
      alert(err.message || "Failed to read the file.");
      return;
    }
    const { valid, invalid } = processRows(rows, fieldAliases, transformRow);
    const result = await previewAndImport({
      fileName: file.name,
      total: rows.length,
      valid,
      invalid,
      previewColumns,
      existingCount: existingCount || 0
    });
    if (result) {
      onImport(result);
    }
  }

  window.BulkImport = {
    parseText,
    parseDate,
    parseNumber,
    parseEnum,
    parseFile,
    processRows,
    openImport
  };
})();
