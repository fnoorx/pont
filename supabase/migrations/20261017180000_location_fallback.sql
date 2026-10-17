-- AGENTS.md section 8, step 14: if the reporter skips the location pin, place the school at
-- its region centroid plus a small random offset (about +/- 15 km) so it still appears on
-- the map. Views still round to 1 decimal and hide sensitive regions as before.

create or replace function public.submit_assessment(p_reporter_id uuid, p_submission jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_school jsonb := p_submission -> 'school';
  v_assessment jsonb := p_submission -> 'assessment';
  v_region public.regions%rowtype;
  v_lat double precision := (v_school ->> 'lat')::double precision;
  v_lng double precision := (v_school ->> 'lng')::double precision;
  v_school_id uuid;
  v_assessment_id uuid;
  v_ref_code text;
  v_media jsonb;
begin
  if v_lat is null or v_lng is null then
    select * into strict v_region from public.regions where code = v_school ->> 'regionCode';
    v_lat := v_region.centroid_lat + (random() - 0.5) * 0.3;
    v_lng := v_region.centroid_lng + (random() - 0.5) * 0.3;
  end if;

  insert into public.schools (name, region_code, town, lat_exact, lng_exact)
  values (v_school ->> 'name', v_school ->> 'regionCode', nullif(v_school ->> 'town', ''), v_lat, v_lng)
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
