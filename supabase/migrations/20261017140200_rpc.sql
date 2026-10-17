-- Pont: the dashboard's only write. Contract: AGENTS.md section 7.
-- Parameter names are part of the contract (supabase.rpc uses them as keys).
-- They shadow the column names, so they are always qualified with the function name.

create function public.set_assessment_verified(assessment_id uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.assessments a
     set verified = set_assessment_verified.verified
   where a.id = set_assessment_verified.assessment_id;

  if not found then
    raise exception 'Assessment % not found', set_assessment_verified.assessment_id
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_assessment_verified(uuid, boolean) from public, anon;
grant execute on function public.set_assessment_verified(uuid, boolean) to authenticated, service_role;
