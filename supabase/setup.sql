-- ============================================================
-- MIS Dashboard - Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL > New query)
-- Creates tables + permissive anon access policies for the dashboards.
-- ============================================================

-- Store Dispatch records
create table if not exists public.store_dispatch (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Inventory Cycle Count records
create table if not exists public.inventory_cycle_count (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- RTV (Return to Vendor/Origin) records
create table if not exists public.rtv_entries (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Daily Work Report manual entries
create table if not exists public.daily_work (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: enable on all tables
alter table public.store_dispatch enable row level security;
alter table public.inventory_cycle_count enable row level security;
alter table public.rtv_entries enable row level security;
alter table public.daily_work enable row level security;

-- Allow the anon key (used by the dashboards) full access.
-- NOTE: the anon key is public by design for client-side apps. If you want
-- write protection, replace these permissive policies with a shared-secret
-- header check before shipping to untrusted environments.
create policy "anon full access store_dispatch"
  on public.store_dispatch for all
  using (true) with check (true);

create policy "anon full access inventory_cycle_count"
  on public.inventory_cycle_count for all
  using (true) with check (true);

create policy "anon full access rtv_entries"
  on public.rtv_entries for all
  using (true) with check (true);

create policy "anon full access daily_work"
  on public.daily_work for all
  using (true) with check (true);
