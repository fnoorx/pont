-- Pont: internal RPC used by the webhook to save a completed report atomically.
-- Service role only. Not part of the dashboard contract.
-- p_submission matches the Submission type in src/engine/types.ts.

create function public.submit_assessment(p_reporter_id uuid, p_submission jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_school jsonb := p_submission -> 'school';
  v_assessment jsonb := p_submission -> 'assessment';
  v_school_id uuid;
  v_assessment_id uuid;
  v_ref_code text;
  v_media jsonb;
begin
  insert into public.schools (name, region_code, town, lat_exact, lng_exact)
  values (
    v_school ->> 'name',
    v_school ->> 'regionCode',
    nullif(v_school ->> 'town', ''),
    (v_school ->> 'lat')::double precision,
    (v_school ->> 'lng')::double precision
  )
  returning id into v_school_id;

  insert into public.assessments (
    school_id, reporter_id, enrollment_band, building_condition, power_source,
    connectivity, devices, top_need, notes
  )
  values (
    v_school_id,
    p_reporter_id,
    v_assessment ->> 'enrollmentBand',
    v_assessment ->> 'buildingCondition',
    v_assessment ->> 'powerSource',
    v_assessment ->> 'connectivity',
    v_assessment ->> 'devices',
    v_assessment ->> 'topNeed',
    nullif(v_assessment ->> 'notes', '')
  )
  returning id, ref_code into v_assessment_id, v_ref_code;

  for v_media in select * from jsonb_array_elements(coalesce(p_submission -> 'media', '[]'::jsonb)) loop
    insert into public.media (assessment_id, type, storage_path)
    values (v_assessment_id, v_media ->> 'type', v_media ->> 'storagePath');
  end loop;

  return v_ref_code;
end;
$$;

revoke all on function public.submit_assessment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_assessment(uuid, jsonb) to service_role;
