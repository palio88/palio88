-- FormForge initial schema
-- Run in Supabase SQL editor or via supabase db push

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users (extends Supabase auth.users) ─────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text,
  tier         text not null default 'free' check (tier in ('free', 'pro', 'studio')),
  rc_customer_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── Designs ──────────────────────────────────────────────────────────────────
create table if not exists public.designs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  template_id   text not null,
  template_name text not null,
  params        jsonb not null default '{}',
  stl_url       text,
  glb_url       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.designs enable row level security;

create policy "Users can CRUD own designs"
  on public.designs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index designs_user_id_idx on public.designs(user_id);
create index designs_updated_at_idx on public.designs(updated_at desc);


-- ─── Generation jobs (async AI lane) ─────────────────────────────────────────
create table if not exists public.generation_jobs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  prompt        text not null,
  status        text not null default 'queued'
                  check (status in ('queued','generating','validating','exporting','ready','failed')),
  generated_code text,
  stl_url       text,
  glb_url       text,
  tmf_url       text,
  error_message text,
  execution_time_ms integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.generation_jobs enable row level security;

create policy "Users can read own jobs"
  on public.generation_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.generation_jobs for insert
  with check (auth.uid() = user_id);

create index generation_jobs_user_id_idx on public.generation_jobs(user_id);
create index generation_jobs_status_idx on public.generation_jobs(status) where status = 'queued';


-- ─── Moderation log ───────────────────────────────────────────────────────────
create table if not exists public.moderation_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete set null,
  prompt      text not null,
  flagged     boolean not null,
  categories  jsonb,
  created_at  timestamptz not null default now()
);

alter table public.moderation_log enable row level security;
-- Moderation log is write-only from service role; no user RLS reads


-- ─── Agent outputs ────────────────────────────────────────────────────────────
create table if not exists public.agent_decisions (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    text not null,
  run_date    date not null,
  output_json jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.agent_escalations (
  id            uuid primary key default uuid_generate_v4(),
  agent_id      text not null,
  run_date      date not null,
  priority      text not null default 'medium' check (priority in ('low','medium','high','critical')),
  title         text not null,
  body          text not null,
  action_schema jsonb,
  resolved      boolean not null default false,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index agent_escalations_resolved_idx on public.agent_escalations(resolved) where resolved = false;


-- ─── DMCA queue ───────────────────────────────────────────────────────────────
create table if not exists public.dmca_queue (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid references auth.users(id) on delete set null,
  template_id   text not null,
  reason        text not null,
  status        text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ─── Canonical metrics view (agent C-Suite source of truth) ──────────────────
create or replace view public.kpi_snapshot as
select
  (select count(*) from auth.users)::int                                      as total_users,
  (select count(*) from public.profiles where tier = 'pro')::int              as pro_subscribers,
  (select count(*) from public.profiles where tier = 'studio')::int           as studio_subscribers,
  (select count(*) from public.designs)::int                                   as total_designs_saved,
  (select count(*) from public.generation_jobs where status = 'ready')::int   as ai_jobs_completed,
  (select count(*) from public.generation_jobs where status = 'failed')::int  as ai_jobs_failed,
  (select count(*) from public.generation_jobs where status = 'queued')::int  as ai_jobs_queued,
  (select count(*) from public.dmca_queue where status = 'pending')::int      as dmca_pending,
  now()                                                                         as snapshot_at;


-- ─── updated_at trigger helper ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_designs_updated_at
  before update on public.designs
  for each row execute procedure public.set_updated_at();

create trigger set_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
