// DataService — thin cloud-sync layer between the dashboards' LocalStorage and
// Supabase (Postgres). Works in the background: if Supabase is unreachable the
// dashboards keep working on LocalStorage and re-sync when back online.
//
// Storage model: every record is stored as one row { id, payload (jsonb) }.
// History accumulates naturally because records are never deleted from the
// database by the app (deleting a record in a dashboard only removes it from
// the current dataset; the row remains in Supabase for audit/restore).
window.DataService = (function () {
  const cfg = window.SUPABASE_CONFIG || null;
  let client = null;

  function init() {
    if (!cfg || !cfg.url || !cfg.anonKey || !window.supabase) return null;
    try {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
    } catch (e) {
      console.error("Supabase init failed:", e);
      client = null;
    }
    return client;
  }

  function table(name) {
    return cfg && cfg.tables && cfg.tables[name];
  }

  function rowId(r) {
    return String((r && r.id) || (r && r._id) || JSON.stringify(r));
  }

  // Fetch every payload for a table. Returns null when offline/error.
  async function fetchAll(name) {
    if (!client) return null;
    const t = table(name);
    if (!t) return null;
    try {
      const { data, error } = await client.from(t).select("id, payload");
      if (error) {
        console.warn(`Supabase fetch ${name} failed:`, error.message);
        return null;
      }
      return (data || []).map(r => r.payload);
    } catch (e) {
      console.warn(`Supabase fetch ${name} error:`, e.message);
      return null;
    }
  }

  // Upsert a full record set into Supabase. Fire-and-forget friendly.
  async function push(name, records) {
    if (!client || !records || records.length === 0) return false;
    const t = table(name);
    if (!t) return false;
    try {
      const rows = records.map(r => ({ id: rowId(r), payload: r }));
      const { error } = await client.from(t).upsert(rows, { onConflict: "id" });
      if (error) {
        console.warn(`Supabase push ${name} failed:`, error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn(`Supabase push ${name} error:`, e.message);
      return false;
    }
  }

  // Two-way sync: pull cloud records, merge with local (cloud wins on id
  // conflict, local-only records are kept), push the merged set back up.
  // Returns the merged array, or null when Supabase is unreachable.
  async function syncTable(name, localRecords) {
    const cloud = await fetchAll(name);
    if (cloud === null) return null;
    const map = new Map();
    cloud.forEach(r => map.set(rowId(r), r));
    (localRecords || []).forEach(r => {
      const k = rowId(r);
      if (!map.has(k)) map.set(k, r);
    });
    const merged = [...map.values()];
    await push(name, merged);
    return merged;
  }

  init();

  return {
    get ready() {
      return !!client;
    },
    fetchAll,
    push,
    syncTable
  };
})();
