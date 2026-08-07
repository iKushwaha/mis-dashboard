// Supabase connection configuration for the MIS Dashboard.
// Fill in your project URL and anon public key (Supabase Dashboard > Settings > API).
// The anon key is safe to expose in client-side code; it is protected by the
// Row Level Security policies defined in supabase/setup.sql.
window.SUPABASE_CONFIG = {
  url: "https://hipxgrfflqxqycidqeia.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcHhncmZmbHF4cXljaWRxZWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTg1OTYsImV4cCI6MjEwMTY5NDU5Nn0.GgDKLX--hte4Zfvq5UDGrlHQJKNUJps3m_FVcjW_NSs",
  tables: {
    STORE_DISPATCH: "store_dispatch",
    INVENTORY: "inventory_cycle_count",
    RTV: "rtv_entries",
    DAILY_WORK: "daily_work",
    LOGISTICS_DISPATCH: "logistics_dispatch",
    LOGISTICS_SHORT_SKU: "logistics_short_sku",
    LOGISTICS_CONFIG: "logistics_config"
  }
};
