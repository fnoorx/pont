-- Pont prototype: partners report milestones from the chat, staff verify them, partners earn trust.
--
-- Chat: a partner sends "DONE PJ-104" and a photo. The webhook looks the project up
--   (find_project_for_milestone) and marks its next pending milestone done, unverified (report_milestone).
-- Dashboard: staff verify a done milestone (set_milestone_verified). When every milestone of a project
--   is done and verified, the project completes, and its partner gains a delivered project and becomes
--   'proven' (trust earned by delivery).

alter table public.projects add column code text unique;
alter table public.milestones add column reported_via_chat boolean not null default false;

-- Same columns as before, new ones appended at the end (contract: never reorder).
create or replace view public.dashboard_projects
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
  (select count(*) from public.milestones m where m.project_id = pr.id and m.status = 'done')::int as milestones_done,
  pr.code
from public.projects pr
join public.schools s on s.id = pr.school_id
join public.regions r on r.code = s.region_code
left join public.partners pa on pa.id = pr.partner_id;

create or replace view public.dashboard_milestones
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
  m.verified,
  m.reported_via_chat
from public.milestones m
join public.projects pr on pr.id = m.project_id;

-- Internal (service role): what the chat shows before asking for the photo. NULL when the code is unknown.
create function public.find_project_for_milestone(p_code text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'code', pr.code,
    'projectTitle', pr.title,
    'schoolName', s.name,
    'nextMilestone', (select m.title from public.milestones m
                      where m.project_id = pr.id and m.status = 'pending'
                      order by m.sort_order limit 1),
    'done', (select count(*) from public.milestones m where m.project_id = pr.id and m.status = 'done'),
    'total', (select count(*) from public.milestones m where m.project_id = pr.id)
  )
  from public.projects pr
  join public.schools s on s.id = pr.school_id
  where upper(pr.code) = upper(p_code);
$$;

-- Internal (service role): marks the project's next pending milestone done, waiting for a staff check.
create function public.report_milestone(p_code text, p_photo_path text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_milestone_id uuid;
begin
  select pr.id into v_project_id from public.projects pr where upper(pr.code) = upper(p_code);
  if v_project_id is null then
    raise exception 'Project % not found', p_code using errcode = 'P0002';
  end if;

  select m.id into v_milestone_id
  from public.milestones m
  where m.project_id = v_project_id and m.status = 'pending'
  order by m.sort_order
  limit 1;
  if v_milestone_id is null then
    raise exception 'Project % has no pending milestone', p_code using errcode = 'P0002';
  end if;

  update public.milestones m
     set status = 'done',
         completed_at = current_date,
         photo_path = coalesce(p_photo_path, m.photo_path),
         verified = false,
         reported_via_chat = true
   where m.id = v_milestone_id;

  update public.projects pr
     set status = 'in_progress', started_at = coalesce(pr.started_at, current_date)
   where pr.id = v_project_id and pr.status = 'planned';
end;
$$;

revoke all on function public.find_project_for_milestone(text) from public, anon, authenticated;
revoke all on function public.report_milestone(text, text) from public, anon, authenticated;
grant execute on function public.find_project_for_milestone(text) to service_role;
grant execute on function public.report_milestone(text, text) to service_role;

-- Dashboard write: staff confirm (or un-confirm) a done milestone.
-- Parameter names are part of the contract and shadow column names, so they are qualified.
create function public.set_milestone_verified(milestone_id uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_partner_id uuid;
begin
  update public.milestones m
     set verified = set_milestone_verified.verified
   where m.id = set_milestone_verified.milestone_id and m.status = 'done'
  returning m.project_id into v_project_id;

  if v_project_id is null then
    raise exception 'Done milestone % not found', set_milestone_verified.milestone_id using errcode = 'P0002';
  end if;

  if set_milestone_verified.verified and not exists (
    select 1 from public.milestones m
    where m.project_id = v_project_id and (m.status <> 'done' or not m.verified)
  ) then
    update public.projects pr
       set status = 'completed', completed_at = current_date
     where pr.id = v_project_id and pr.status <> 'completed'
    returning pr.partner_id into v_partner_id;

    if v_partner_id is not null then
      update public.partners pa
         set projects_completed = pa.projects_completed + 1, trust_level = 'proven'
       where pa.id = v_partner_id;
    end if;
  end if;
end;
$$;

revoke all on function public.set_milestone_verified(uuid, boolean) from public, anon;
grant execute on function public.set_milestone_verified(uuid, boolean) to authenticated, service_role;
