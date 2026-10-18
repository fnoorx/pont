-- Pont: internal RPC used by the inbound processor to save a weekly attendance count.
-- Service role only. Not part of the dashboard contract (the dashboard reads dashboard_attendance).
-- The count belongs to the school from the reporter's latest assessment. One row per school per week:
-- sending again in the same week replaces that week's numbers.

create function public.submit_attendance(p_reporter_id uuid, p_present int, p_enrolled int)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_week date := date_trunc('week', now() at time zone 'Africa/Douala')::date;
begin
  select a.school_id into v_school_id
  from public.assessments a
  where a.reporter_id = p_reporter_id
  order by a.submitted_at desc
  limit 1;

  if v_school_id is null then
    raise exception 'reporter % has no reported school', p_reporter_id;
  end if;

  insert into public.attendance_reports (school_id, week_start, students_present, students_enrolled)
  values (v_school_id, v_week, p_present, p_enrolled)
  on conflict (school_id, week_start)
  do update set students_present = excluded.students_present,
                students_enrolled = excluded.students_enrolled,
                created_at = now();
end;
$$;

revoke execute on function public.submit_attendance(uuid, int, int) from public, anon, authenticated;
grant execute on function public.submit_attendance(uuid, int, int) to service_role;
