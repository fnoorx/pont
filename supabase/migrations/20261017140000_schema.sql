-- Pont: raw tables (see AGENTS.md section 7).
-- Value sets are text columns with CHECK constraints, not Postgres enums.
-- No raw table is readable by anon or authenticated. Only the service role
-- (webhook, seed scripts) and the dashboard_* views touch them.

-- ---------------------------------------------------------------------------
-- Lock down defaults first, so nothing created below (or later) is auto-granted
-- to anon or authenticated. Supabase grants these per schema by default.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- regions
-- ---------------------------------------------------------------------------
create table public.regions (
  code          text primary key check (code ~ '^[A-Z]{2}$'),
  name_en       text not null,
  name_fr       text not null,
  centroid_lat  double precision not null check (centroid_lat between -90 and 90),
  centroid_lng  double precision not null check (centroid_lng between -180 and 180),
  is_sensitive  boolean not null default false
);

-- Regional capitals as centroids. NW, SW and EN are conflict-affected (sensitive).
insert into public.regions (code, name_en, name_fr, centroid_lat, centroid_lng, is_sensitive) values
  ('AD', 'Adamawa',   'Adamaoua',     7.32, 13.58, false),
  ('CE', 'Centre',    'Centre',       3.87, 11.52, false),
  ('ES', 'East',      'Est',          4.58, 13.68, false),
  ('EN', 'Far North', 'Extrême-Nord', 10.59, 14.32, true),
  ('LT', 'Littoral',  'Littoral',     4.05,  9.70, false),
  ('NO', 'North',     'Nord',         9.30, 13.40, false),
  ('NW', 'Northwest', 'Nord-Ouest',   5.96, 10.15, true),
  ('SU', 'South',     'Sud',          2.90, 11.15, false),
  ('SW', 'Southwest', 'Sud-Ouest',    4.16,  9.24, true),
  ('OU', 'West',      'Ouest',        5.48, 10.42, false);

-- ---------------------------------------------------------------------------
-- reporters
-- phone_e164 is the only place a raw number lives (so the bot can reply).
-- No view exposes it.
-- ---------------------------------------------------------------------------
create table public.reporters (
  id           uuid primary key default gen_random_uuid(),
  phone_e164   text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_hash   text not null unique check (phone_hash ~ '^[0-9a-f]{64}$'),
  phone_last4  text not null check (phone_last4 ~ '^[0-9]{4}$'),
  channel      text not null check (channel in ('whatsapp', 'sms')),
  language     text not null default 'fr' check (language in ('en', 'fr')),
  role         text check (role in ('headteacher', 'teacher', 'partner', 'community')),
  consent_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions (conversation state, persisted, never in memory)
-- ---------------------------------------------------------------------------
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.reporters (id) on delete cascade,
  flow         text not null default 'school_assessment',
  step         text not null,
  answers      jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status       text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  updated_at   timestamptz not null default now()
);

create index sessions_reporter_updated_idx on public.sessions (reporter_id, updated_at desc);
-- At most one active session per reporter.
create unique index sessions_one_active_per_reporter on public.sessions (reporter_id) where status = 'active';

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- schools
-- Exact coordinates are restricted. Views round them, or null them for sensitive regions.
-- ---------------------------------------------------------------------------
create table public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 200),
  region_code  text not null references public.regions (code),
  town         text check (town is null or char_length(btrim(town)) between 1 and 200),
  lat_exact    double precision check (lat_exact between -90 and 90),
  lng_exact    double precision check (lng_exact between -180 and 180),
  created_at   timestamptz not null default now(),
  constraint schools_coords_both_or_neither check ((lat_exact is null) = (lng_exact is null))
);

create index schools_region_idx on public.schools (region_code);

-- ---------------------------------------------------------------------------
-- assessments (append only: a school can have many, never overwrite)
-- ---------------------------------------------------------------------------

-- Short human-friendly reference like PS-4F2K. Skips look-alike characters (0/O, 1/I).
create function public.generate_ref_code() returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int := 0;
begin
  loop
    candidate := 'PS-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.assessments where ref_code = candidate);
    attempt := attempt + 1;
    if attempt >= 20 then
      raise exception 'Could not generate a unique ref_code';
    end if;
  end loop;
  return candidate;
end;
$$;

create table public.assessments (
  id                  uuid primary key default gen_random_uuid(),
  ref_code            text not null unique default public.generate_ref_code()
                        check (ref_code ~ '^PS-[A-Z0-9]{4}$'),
  school_id           uuid not null references public.schools (id) on delete cascade,
  reporter_id         uuid references public.reporters (id) on delete set null,
  enrollment_band     text not null check (enrollment_band in ('lt100', '100_300', '300_600', 'gt600')),
  building_condition  text not null check (building_condition in ('good', 'needs_repair', 'unsafe')),
  power_source        text not null check (power_source in ('grid_reliable', 'grid_unreliable', 'solar', 'generator', 'none')),
  connectivity        text not null check (connectivity in ('good', 'weak', 'none')),
  devices             text not null check (devices in ('none', 'few', 'enough')),
  top_need            text not null check (top_need in ('building', 'furniture', 'supplies', 'power', 'computers', 'internet', 'training', 'other')),
  notes               text check (notes is null or char_length(notes) <= 2000),
  verified            boolean not null default false,
  submitted_at        timestamptz not null default now()
);

create index assessments_school_submitted_idx on public.assessments (school_id, submitted_at desc, id desc);
create index assessments_reporter_idx on public.assessments (reporter_id);
create index assessments_submitted_idx on public.assessments (submitted_at desc);

-- ---------------------------------------------------------------------------
-- media (files live in the private field-media bucket; never store Twilio URLs)
-- ---------------------------------------------------------------------------
create table public.media (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  type           text not null check (type in ('photo', 'audio')),
  storage_path   text not null unique check (char_length(storage_path) between 1 and 500),
  created_at     timestamptz not null default now()
);

create index media_assessment_idx on public.media (assessment_id);

-- ---------------------------------------------------------------------------
-- processed_messages (Twilio idempotency)
-- ---------------------------------------------------------------------------
create table public.processed_messages (
  message_sid   text primary key,
  processed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- messages (audit log)
-- ---------------------------------------------------------------------------
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.reporters (id) on delete cascade,
  direction    text not null check (direction in ('inbound', 'outbound')),
  body         text not null,
  created_at   timestamptz not null default now()
);

create index messages_reporter_created_idx on public.messages (reporter_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access: RLS on with no policies (defence in depth), and no grants for
-- anon / authenticated. The service role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.regions            enable row level security;
alter table public.reporters          enable row level security;
alter table public.sessions           enable row level security;
alter table public.schools            enable row level security;
alter table public.assessments        enable row level security;
alter table public.media              enable row level security;
alter table public.processed_messages enable row level security;
alter table public.messages           enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

revoke all on function public.generate_ref_code() from public, anon, authenticated;
revoke all on function public.touch_updated_at()  from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant execute on function public.generate_ref_code() to service_role;
