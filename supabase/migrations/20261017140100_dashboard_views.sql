-- Pont: dashboard views. This is the contract with the Lovable dashboard
-- (AGENTS.md section 7, docs/DASHBOARD_CONTRACT.md). Do not rename or drop
-- columns without updating both.
--
-- These views run with owner privileges (security_invoker = false) so they can
-- read the locked raw tables. This is intentional; the Supabase linter warning
-- about security-definer views is expected. SELECT is granted to authenticated
-- only, never anon.
--
-- Privacy: coordinates are rounded to 1 decimal (about 11 km) and are NULL for
-- schools in sensitive regions. Raw phone numbers are never exposed.

-- ---------------------------------------------------------------------------
-- dashboard_schools: one row per school, latest assessment flattened
-- ---------------------------------------------------------------------------
create view public.dashboard_schools
with (security_invoker = false)
as
with latest as (
  select distinct on (a.school_id) a.*
  from public.assessments a
  order by a.school_id, a.submitted_at desc, a.id desc
),
counts as (
  select a.school_id,
         count(*)::int        as assessment_count,
         max(a.submitted_at)  as last_submitted_at
  from public.assessments a
  group by a.school_id
)
select
  s.id,
  s.name,
  s.region_code,
  r.name_en                                                         as region_name,
  s.town,
  r.is_sensitive,
  case when r.is_sensitive then null
       else round(s.lat_exact::numeric, 1)::double precision end    as lat_display,
  case when r.is_sensitive then null
       else round(s.lng_exact::numeric, 1)::double precision end    as lng_display,
  coalesce(c.assessment_count, 0)                                   as assessment_count,
  c.last_submitted_at,
  l.id                                                              as latest_assessment_id,
  l.enrollment_band,
  l.building_condition,
  l.power_source,
  l.connectivity,
  l.devices,
  l.top_need,
  l.verified
from public.schools s
join public.regions r on r.code = s.region_code
left join counts c on c.school_id = s.id
left join latest l on l.school_id = s.id;

-- ---------------------------------------------------------------------------
-- dashboard_assessments: one row per assessment
-- ---------------------------------------------------------------------------
create view public.dashboard_assessments
with (security_invoker = false)
as
select
  a.id,
  a.ref_code,
  a.school_id,
  s.name          as school_name,
  s.region_code,
  r.name_en       as region_name,
  r.is_sensitive,
  rep.role        as reporter_role,
  rep.phone_last4 as reporter_last4,
  rep.language,
  a.enrollment_band,
  a.building_condition,
  a.power_source,
  a.connectivity,
  a.devices,
  a.top_need,
  a.notes,
  a.verified,
  a.submitted_at
from public.assessments a
join public.schools s on s.id = a.school_id
join public.regions r on r.code = s.region_code
left join public.reporters rep on rep.id = a.reporter_id;

-- ---------------------------------------------------------------------------
-- dashboard_region_stats: one row per region, including regions with zero schools.
-- Counts use each school's latest assessment. top_need is the most common latest
-- top_need in the region; ties go to the most recently reported need.
-- ---------------------------------------------------------------------------
create view public.dashboard_region_stats
with (security_invoker = false)
as
with latest as (
  select distinct on (a.school_id) a.*
  from public.assessments a
  order by a.school_id, a.submitted_at desc, a.id desc
),
need_rank as (
  select
    s.region_code,
    l.top_need,
    row_number() over (
      partition by s.region_code
      order by count(*) desc, max(l.submitted_at) desc, l.top_need
    ) as rn
  from public.schools s
  join latest l on l.school_id = s.id
  group by s.region_code, l.top_need
)
select
  r.code                                                        as region_code,
  r.name_en                                                     as region_name,
  r.centroid_lat,
  r.centroid_lng,
  r.is_sensitive,
  count(s.id)::int                                              as school_count,
  (count(*) filter (where l.building_condition = 'unsafe'))::int as unsafe_count,
  (count(*) filter (where l.power_source = 'none'))::int         as no_power_count,
  nr.top_need,
  max(l.submitted_at)                                           as last_submitted_at
from public.regions r
left join public.schools s on s.region_code = r.code
left join latest l on l.school_id = s.id
left join need_rank nr on nr.region_code = r.code and nr.rn = 1
group by r.code, r.name_en, r.centroid_lat, r.centroid_lng, r.is_sensitive, nr.top_need;

-- ---------------------------------------------------------------------------
-- dashboard_media
-- ---------------------------------------------------------------------------
create view public.dashboard_media
with (security_invoker = false)
as
select
  m.id,
  m.assessment_id,
  a.school_id,
  m.type,
  m.storage_path,
  m.created_at
from public.media m
join public.assessments a on a.id = m.assessment_id;

-- ---------------------------------------------------------------------------
-- Grants: authenticated gets SELECT only. Never anon.
-- ---------------------------------------------------------------------------
revoke all on public.dashboard_schools      from public, anon, authenticated;
revoke all on public.dashboard_assessments  from public, anon, authenticated;
revoke all on public.dashboard_region_stats from public, anon, authenticated;
revoke all on public.dashboard_media        from public, anon, authenticated;

grant select on public.dashboard_schools      to authenticated, service_role;
grant select on public.dashboard_assessments  to authenticated, service_role;
grant select on public.dashboard_region_stats to authenticated, service_role;
grant select on public.dashboard_media        to authenticated, service_role;
