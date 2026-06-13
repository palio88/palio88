-- Waitlist table for pre-launch email capture
create table if not exists public.waitlist (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  source     text,
  created_at timestamptz not null default now()
);

-- No RLS — insert via service role only from API
