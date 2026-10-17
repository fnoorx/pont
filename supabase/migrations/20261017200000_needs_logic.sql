-- Pont prototype: dependency-aware recommendations and a priority score.
--
-- Infrastructure is a chain, not a sum: safe building -> power -> devices -> internet.
-- 1. Tier cap: no power or an unreliable grid can never be Tier 2 (no computer lab without electricity).
-- 2. Blockers: compare the stated need with what it depends on, and recommend fixing the first missing
--    link. The "package" is everything to fund, in order, to actually meet the stated need.
--      furniture        needs a safe building
--      power (solar)    needs a safe building (no panels on an unsafe roof)
--      computers        needs a safe building, then power
--      internet         needs a safe building, power, devices; no mobile signal is flagged (satellite)
--      building, supplies, training, other: no prerequisites
-- 3. Partner matches use the recommended package and prefer partners who cover all of it.
-- 4. dashboard_priority: one transparent number for "who should PS43 help first".
--
-- Contract: dashboard_readiness and dashboard_partner_matches keep every existing column in place
-- and gain new columns at the end. dashboard_priority is new.

create or replace view public.dashboard_readiness
with (security_invoker = false)
as
with latest as (
  select distinct on (a.school_id) a.*
  from public.assessments a
  order by a.school_id, a.submitted_at desc, a.id desc
),
scored as (
  select
    s.id      as school_id,
    s.name    as school_name,
    s.region_code,
    r.name_en as region_name,
    r.is_sensitive,
    l.id      as latest_assessment_id,
    case l.building_condition when 'good' then 30 when 'needs_repair' then 15 else 0 end as building_points,
    case l.power_source
      when 'grid_reliable' then 30 when 'solar' then 25 when 'generator' then 15
      when 'grid_unreliable' then 10 else 0 end as power_points,
    case l.connectivity when 'good' then 20 when 'weak' then 10 else 0 end as connectivity_points,
    case l.devices when 'enough' then 20 when 'few' then 10 else 0 end as devices_points,
    l.building_condition = 'unsafe' as safety_first,
    l.power_source in ('none', 'grid_unreliable') as weak_power,
    l.building_condition,
    l.connectivity,
    l.devices,
    l.top_need
  from public.schools s
  join public.regions r on r.code = s.region_code
  join latest l on l.school_id = s.id
),
tiered as (
  select
    *,
    building_points + power_points + connectivity_points + devices_points as score,
    case
      when safety_first then 'tier0'
      when building_points + power_points + connectivity_points + devices_points < 40 then 'tier0'
      when building_points + power_points + connectivity_points + devices_points < 70 then 'tier1'
      else 'tier2'
    end as base_tier,
    -- Missing prerequisites for the stated need, in chain order.
    array_remove(array[
      case when building_condition = 'unsafe' and top_need in ('furniture', 'power', 'computers', 'internet') then 'building' end,
      case when weak_power and top_need in ('computers', 'internet') then 'power' end,
      case when devices = 'none' and top_need = 'internet' then 'devices' end,
      case when connectivity = 'none' and top_need = 'internet' then 'signal' end
    ], null) as blockers
  from scored
),
recommended as (
  select
    *,
    -- What to fund, in order: missing prerequisites (signal is not fundable here), then the stated need.
    array_remove(array[
      case when 'building' = any (blockers) then 'building' end,
      case when 'power' = any (blockers) then 'power' end,
      case when 'devices' = any (blockers) then 'computers' end
    ], null) || array[top_need] as package
  from tiered
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
  score,
  case when base_tier = 'tier2' and weak_power then 'tier1' else base_tier end as tier,
  safety_first,
  -- New columns (appended):
  (base_tier = 'tier2' and weak_power) as tier_capped,
  top_need       as stated_need,
  blockers[1]    as blocked_by,
  package[1]     as recommended_need,
  package
from recommended;

-- Partners who can deliver the school's recommended need, preferring those who cover the whole
-- package, then the same region, then trust and delivery record. Up to 3 per school.
create or replace view public.dashboard_partner_matches
with (security_invoker = false)
as
with candidates as (
  select
    rd.school_id,
    p.id   as partner_id,
    p.name as partner_name,
    p.type as partner_type,
    p.trust_level,
    p.projects_completed,
    (p.region_code is not distinct from rd.region_code) as same_region,
    rd.recommended_need as need,
    array(select x from unnest(rd.package) as x where x = any (p.services)) as covers,
    rd.package
  from public.dashboard_readiness rd
  join public.partners p
    on rd.recommended_need = any (p.services)
   and (p.region_code = rd.region_code or p.region_code is null)
),
ranked as (
  select
    *,
    cardinality(covers) = cardinality(package) as covers_full_package,
    row_number() over (
      partition by school_id
      order by cardinality(covers) desc,
               same_region desc,
               case trust_level when 'proven' then 3 when 'referred' then 2 else 1 end desc,
               projects_completed desc,
               partner_name
    ) as match_rank
  from candidates
)
select
  school_id, partner_id, partner_name, partner_type, trust_level, projects_completed, same_region, need,
  match_rank::int as match_rank,
  -- New columns (appended):
  covers,
  covers_full_package
from ranked
where match_rank <= 3;

-- Who should PS43 help first. Higher priority = help sooner. Every part is shown so staff can see why.
--   need_points     = 100 - readiness score
--   safety_points   = 20 if the building is unsafe
--   size_points     = students: under 100 -> 0, 100-300 -> 10, 300-600 -> 20, over 600 -> 30
--   verified_points = 10 if PS43 staff verified the latest report
create view public.dashboard_priority
with (security_invoker = false)
as
with parts as (
  select
    rd.school_id,
    rd.school_name,
    rd.region_code,
    rd.region_name,
    rd.is_sensitive,
    rd.score as readiness_score,
    rd.tier,
    rd.stated_need,
    rd.recommended_need,
    rd.blocked_by,
    s.enrollment_band,
    s.verified,
    s.last_submitted_at,
    100 - rd.score as need_points,
    case when rd.safety_first then 20 else 0 end as safety_points,
    case s.enrollment_band when 'gt600' then 30 when '300_600' then 20 when '100_300' then 10 else 0 end as size_points,
    case when s.verified then 10 else 0 end as verified_points
  from public.dashboard_readiness rd
  join public.dashboard_schools s on s.id = rd.school_id
)
select
  school_id,
  school_name,
  region_code,
  region_name,
  is_sensitive,
  readiness_score,
  tier,
  stated_need,
  recommended_need,
  blocked_by,
  enrollment_band,
  verified,
  need_points,
  safety_points,
  size_points,
  verified_points,
  need_points + safety_points + size_points + verified_points as priority,
  (rank() over (order by need_points + safety_points + size_points + verified_points desc, last_submitted_at desc))::int
    as priority_rank
from parts;

revoke all on public.dashboard_priority from public, anon, authenticated;
grant select on public.dashboard_priority to authenticated, service_role;
