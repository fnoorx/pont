-- Pont prototype: Assess (B), Match (C), Deliver and Prove (D).
-- B is computed live from real assessments with transparent rules.
-- C and D tables hold fictional mock data for the demo (seeded by `npm run seed`).
-- Same access model as everything else: raw tables locked, dashboard_* views for authenticated.

-- ---------------------------------------------------------------------------
-- C: partners (mock). Referral based: referred_by points at the partner who vouched.
-- region_code NULL means the partner works nationwide.
-- ---------------------------------------------------------------------------
create table public.partners (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(btrim(name)) between 1 and 200),
  type                text not null check (type in ('ngo', 'community_org', 'contractor', 'supplier')),
  region_code         text references public.regions (code),
  town                text,
  services            text[] not null default '{}'
                        check (services <@ array['building', 'furniture', 'supplies', 'power', 'computers', 'internet', 'training']::text[]),
  trust_level         text not null default 'new' check (trust_level in ('new', 'referred', 'proven')),
  projects_completed  int not null default 0 check (projects_completed >= 0),
  referred_by         uuid references public.partners (id) on delete set null,
  joined_at           timestamptz not null default now()
);

create index partners_region_idx on public.partners (region_code);

-- ---------------------------------------------------------------------------
-- D: projects, milestones, attendance (mock)
-- ---------------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  partner_id    uuid references public.partners (id) on delete set null,
  title         text not null,
  intervention  text not null check (intervention in ('building', 'furniture', 'supplies', 'power', 'computers', 'internet', 'training', 'other')),
  tier          text not null check (tier in ('tier0', 'tier1', 'tier2')),
  status        text not null check (status in ('planned', 'in_progress', 'completed')),
  budget_usd    int check (budget_usd >= 0),
  started_at    date,
  completed_at  date,
  created_at    timestamptz not null default now()
);

create index projects_school_idx on public.projects (school_id);

create table public.milestones (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  sort_order    int not null,
  title         text not null,
  status        text not null default 'pending' check (status in ('pending', 'done')),
  due_date      date,
  completed_at  date,
  -- Path in the private field-media bucket. Photos show the building or delivery, never people.
  photo_path    text,
  verified      boolean not null default false
);

create index milestones_project_idx on public.milestones (project_id, sort_order);

-- Weekly attendance by SMS: aggregate counts only, never student-level data.
create table public.attendance_reports (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools (id) on delete cascade,
  week_start         date not null,
  students_present   int not null check (students_present >= 0),
  students_enrolled  int not null check (students_enrolled > 0),
  created_at         timestamptz not null default now(),
  constraint attendance_present_le_enrolled check (students_present <= students_enrolled),
  constraint attendance_one_per_week unique (school_id, week_start)
);

alter table public.partners           enable row level security;
alter table public.projects           enable row level security;
alter table public.milestones         enable row level security;
alter table public.attendance_reports enable row level security;

revoke all on public.partners, public.projects, public.milestones, public.attendance_reports from anon, authenticated;
grant all on public.partners, public.projects, public.milestones, public.attendance_reports to service_role;

-- ---------------------------------------------------------------------------
-- B: dashboard_readiness. Transparent rules on each school's latest assessment.
--   building:     good 30, needs_repair 15, unsafe 0
--   power:        grid_reliable 30, solar 25, generator 15, grid_unreliable 10, none 0
--   connectivity: good 20, weak 10, none 0
--   devices:      enough 20, few 10, none 0
--   tier: unsafe building -> tier0 (safety first); score < 40 -> tier0; < 70 -> tier1; else tier2
-- ---------------------------------------------------------------------------
create view public.dashboard_readiness
with (security_invoker = false)
as
with latest as (
  select distinct on (a.school_id) a.*
  from public.assessments a
  order by a.school_id, a.submitted_at desc, a.id desc
),
scored as (
  select
    s.id   as school_id,
    s.name as school_name,
    s.region_code,
    r.name_en as region_name,
    r.is_sensitive,
    l.id   as latest_assessment_id,
    case l.building_condition when 'good' then 30 when 'needs_repair' then 15 else 0 end as building_points,
    case l.power_source
      when 'grid_reliable' then 30 when 'solar' then 25 when 'generator' then 15
      when 'grid_unreliable' then 10 else 0 end as power_points,
    case l.connectivity when 'good' then 20 when 'weak' then 10 else 0 end as connectivity_points,
    case l.devices when 'enough' then 20 when 'few' then 10 else 0 end as devices_points,
    l.building_condition = 'unsafe' as safety_first
  from public.schools s
  join public.regions r on r.code = s.region_code
  join latest l on l.school_id = s.id
)
select
  school_id,
  school_name,
  region_code,
  region_name,
  is_sensitive,
  latest_assessment_id,
  building_points,
  power_points,
  connectivity_points,
  devices_points,
  (building_points + power_points + connectivity_points + devices_points) as score,
  case
    when safety_first then 'tier0'
    when building_points + power_points + connectivity_points + devices_points < 40 then 'tier0'
    when building_points + power_points + connectivity_points + devices_points < 70 then 'tier1'
    else 'tier2'
  end as tier,
  safety_first
from scored;

-- ---------------------------------------------------------------------------
-- C: dashboard_partners and dashboard_partner_matches
-- ---------------------------------------------------------------------------
create view public.dashboard_partners
with (security_invoker = false)
as
select
  p.id,
  p.name,
  p.type,
  p.region_code,
  r.name_en      as region_name,
  p.town,
  p.services,
  p.trust_level,
  p.projects_completed,
  p.referred_by  as referred_by_id,
  ref.name       as referred_by_name,
  p.joined_at
from public.partners p
left join public.regions r on r.code = p.region_code
left join public.partners ref on ref.id = p.referred_by;

-- Up to 3 partners per school who offer the school's latest top_need, in the same
-- region first, then nationwide; ranked by trust, then delivery record.
create view public.dashboard_partner_matches
with (security_invoker = false)
as
with latest as (
  select distinct on (a.school_id) a.school_id, a.top_need
  from public.assessments a
  order by a.school_id, a.submitted_at desc, a.id desc
),
candidates as (
  select
    s.id as school_id,
    p.id as partner_id,
    p.name as partner_name,
    p.type as partner_type,
    p.trust_level,
    p.projects_completed,
    (p.region_code is not distinct from s.region_code) as same_region,
    l.top_need as need,
    row_number() over (
      partition by s.id
      order by (p.region_code is not distinct from s.region_code) desc,
               case p.trust_level when 'proven' then 3 when 'referred' then 2 else 1 end desc,
               p.projects_completed desc,
               p.name
    ) as match_rank
  from public.schools s
  join latest l on l.school_id = s.id
  join public.partners p
    on l.top_need = any (p.services)
   and (p.region_code = s.region_code or p.region_code is null)
)
select school_id, partner_id, partner_name, partner_type, trust_level, projects_completed, same_region, need, match_rank::int
from candidates
where match_rank <= 3;

-- ---------------------------------------------------------------------------
-- D: dashboard_projects, dashboard_milestones, dashboard_attendance, dashboard_impact_summary
-- ---------------------------------------------------------------------------
create view public.dashboard_projects
with (security_invoker = false)
as
select
  pr.id,
  pr.school_id,
  s.name        as school_name,
  s.region_code,
  r.name_en     as region_name,
  r.is_sensitive,
  pr.partner_id,
  pa.name       as partner_name,
  pr.title,
  pr.intervention,
  pr.tier,
  pr.status,
  pr.budget_usd,
  pr.started_at,
  pr.completed_at,
  (select count(*) from public.milestones m where m.project_id = pr.id)::int                       as milestones_total,
  (select count(*) from public.milestones m where m.project_id = pr.id and m.status = 'done')::int as milestones_done
from public.projects pr
join public.schools s on s.id = pr.school_id
join public.regions r on r.code = s.region_code
left join public.partners pa on pa.id = pr.partner_id;

create view public.dashboard_milestones
with (security_invoker = false)
as
select
  m.id,
  m.project_id,
  pr.school_id,
  m.sort_order,
  m.title,
  m.status,
  m.due_date,
  m.completed_at,
  m.photo_path,
  m.verified
from public.milestones m
join public.projects pr on pr.id = m.project_id;

create view public.dashboard_attendance
with (security_invoker = false)
as
select
  a.school_id,
  s.name as school_name,
  s.region_code,
  a.week_start,
  a.students_present,
  a.students_enrolled,
  round(a.students_present::numeric / a.students_enrolled, 3)::double precision as attendance_rate
from public.attendance_reports a
join public.schools s on s.id = a.school_id;

-- One row of headline numbers for the pitch.
create view public.dashboard_impact_summary
with (security_invoker = false)
as
with completed as (
  select school_id, min(completed_at) as completed_at
  from public.projects
  where status = 'completed' and completed_at is not null
  group by school_id
),
rates as (
  select a.week_start, c.completed_at, a.students_present::numeric / a.students_enrolled as rate
  from public.attendance_reports a
  join completed c on c.school_id = a.school_id
),
latest_enrolled as (
  select distinct on (a.school_id) a.school_id, a.students_enrolled
  from public.attendance_reports a
  join completed c on c.school_id = a.school_id
  order by a.school_id, a.week_start desc
)
select
  (select count(*) from public.schools)::int                                          as school_count,
  (select count(*) from public.assessments)::int                                      as assessment_count,
  (select count(*) from public.assessments where verified)::int                       as verified_count,
  (select count(*) from public.partners)::int                                         as partner_count,
  (select count(*) from public.partners where trust_level = 'proven')::int            as proven_partner_count,
  (select count(*) from public.projects where status = 'planned')::int                as projects_planned,
  (select count(*) from public.projects where status = 'in_progress')::int            as projects_in_progress,
  (select count(*) from public.projects where status = 'completed')::int              as projects_completed,
  (select coalesce(sum(students_enrolled), 0) from latest_enrolled)::int              as students_reached,
  (select round(avg(rate), 3) from rates where week_start < completed_at)::double precision  as attendance_before,
  (select round(avg(rate), 3) from rates where week_start >= completed_at)::double precision as attendance_after;

-- ---------------------------------------------------------------------------
-- Grants: authenticated gets SELECT only. Never anon.
-- ---------------------------------------------------------------------------
revoke all on
  public.dashboard_readiness, public.dashboard_partners, public.dashboard_partner_matches,
  public.dashboard_projects, public.dashboard_milestones, public.dashboard_attendance,
  public.dashboard_impact_summary
from public, anon, authenticated;

grant select on
  public.dashboard_readiness, public.dashboard_partners, public.dashboard_partner_matches,
  public.dashboard_projects, public.dashboard_milestones, public.dashboard_attendance,
  public.dashboard_impact_summary
to authenticated, service_role;
