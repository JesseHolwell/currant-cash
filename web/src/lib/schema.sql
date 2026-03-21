-- Currant — Supabase schema
-- Run this in the Supabase SQL editor for your project.

-- user_data: stores all app state per user as JSONB blobs, keyed by data_key.
-- Each user has one row per logical data bucket (mirrors localStorage keys).
create table if not exists user_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade not null,
  data_key    text not null,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  unique (user_id, data_key)
);

-- Row-level security: users can only read/write their own rows.
alter table user_data enable row level security;

create policy "Users can read their own data"
  on user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own data"
  on user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data"
  on user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete their own data"
  on user_data for delete
  using (auth.uid() = user_id);

-- Index for fast per-user lookups.
create index if not exists user_data_user_id_idx on user_data (user_id);

-- Enable Realtime so the client can subscribe to cross-device change events.
-- Without this, postgres_changes subscriptions on user_data will not fire.
alter publication supabase_realtime add table user_data;

-- Automatically update updated_at on any row change.
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger user_data_updated_at
  before update on user_data
  for each row execute function update_updated_at();
