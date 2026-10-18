-- Pont prototype: resources and rough costs ("connect resources", component C).
-- intervention_costs is reference data: a rough cost per need, labelled as an estimate to confirm
-- with partners. resources is mock data (equipment, funding, expertise) filled by `npm run seed`.
--
-- dashboard_package_costs: what each school's package would cost.
-- dashboard_resources: for each resource, how many schools can use it now and how many are blocked
--   until a cheaper first step (usually power) is funded, and what unlocking them would cost.

create table public.intervention_costs (
  need          text primary key
                check (need in ('building', 'furniture', 'supplies', 'power', 'computers', 'internet', 'training', 'other')),
  est_cost_usd  int not null check (est_cost_usd >= 0),
  covers        text not null
);

insert into public.intervention_costs (need, est_cost_usd, covers) values
  ('building',  8000, 'Roof and repairs for two classrooms'),
  ('furniture', 2500, '40 desk-benches'),
  ('supplies',  1200, 'Textbooks and supplies for one school year'),
  ('power',     3500, 'Solar kit with battery for classrooms'),
  ('computers', 4000, '10 tablets and an offline content server'),
  ('internet',  1500, 'Router and 12 months of mobile data'),
  ('training',  1000, 'Two-day teacher training workshop'),
  ('other',     1000, 'Placeholder until the need is scoped');

create table public.resources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('equipment', 'funding', 'expertise')),
  -- NULL means it can go to any need (unrestricted funding).
  need        text check (need in ('building', 'furniture', 'supplies', 'power', 'computers', 'internet', 'training', 'other')),
  quantity    int check (quantity > 0),
  unit        text,
  value_usd   int check (value_usd >= 0),
  location    text,
  provider    text not null,
  created_at  timestamptz not null default now()
);

alter table public.intervention_costs enable row level security;
alter table public.resources enable row level security;
revoke all on public.intervention_costs, public.resources from anon, authenticated;
grant all on public.intervention_costs, public.resources to service_role;

-- One row per assessed school.
create view public.dashboard_package_costs
with (security_invoker = false)
as
select
  r.school_id,
  r.school_name,
  r.region_code,
  r.region_name,
  r.is_sensitive,
  r.tier,
  r.stated_need,
  r.recommended_need,
  r.package,
  (select c.est_cost_usd from public.intervention_costs c where c.need = r.recommended_need) as first_step_cost_usd,
  (select coalesce(sum(c.est_cost_usd), 0)
     from unnest(r.package) as p(need)
     join public.intervention_costs c on c.need = p.need)::int as package_cost_usd,
  pr.priority_rank
from public.dashboard_readiness r
left join public.dashboard_priority pr on pr.school_id = r.school_id;

-- One row per resource. A school "wants" a need when it is anywhere in its package.
-- It is "ready" when that need is the first thing to fund, and "blocked" when something comes first.
create view public.dashboard_resources
with (security_invoker = false)
as
with positions as (
  select r.school_id, x.need, x.pos, r.package
  from public.dashboard_readiness r
  cross join lateral unnest(r.package) with ordinality as x(need, pos)
),
blocked as (
  select
    p.need,
    p.package[1] as first_need,
    (select coalesce(sum(c.est_cost_usd), 0)
       from unnest(p.package[1:p.pos - 1]) as q(need)
       join public.intervention_costs c on c.need = q.need) as unlock_cost
  from positions p
  where p.pos > 1
),
by_need as (
  select
    p.need,
    count(*)::int                        as schools_wanting,
    count(*) filter (where p.pos = 1)::int as schools_ready
  from positions p
  group by p.need
),
unlock as (
  select
    b.need,
    count(*)::int              as schools_blocked,
    sum(b.unlock_cost)::int    as unlock_cost_usd,
    mode() within group (order by b.first_need) as unlock_need
  from blocked b
  group by b.need
)
select
  res.id,
  res.name,
  res.kind,
  res.need,
  res.quantity,
  res.unit,
  res.value_usd,
  res.location,
  res.provider,
  coalesce(n.schools_wanting, 0) as schools_wanting,
  coalesce(n.schools_ready, 0)   as schools_ready,
  coalesce(u.schools_blocked, 0) as schools_blocked,
  u.unlock_need,
  coalesce(u.unlock_cost_usd, 0) as unlock_cost_usd
from public.resources res
left join by_need n on n.need = res.need
left join unlock u on u.need = res.need;

revoke all on public.dashboard_package_costs, public.dashboard_resources from public, anon, authenticated;
grant select on public.dashboard_package_costs, public.dashboard_resources to authenticated, service_role;
