-- Pont: web chat channel, a WhatsApp-style chat page judges open from a QR code.
-- Web reporters have no phone number. They are identified by a salted hash of a random
-- browser id (stored in phone_hash), so phone_e164 and phone_last4 are NULL for them.

alter table public.reporters alter column phone_e164 drop not null;
alter table public.reporters alter column phone_last4 drop not null;

alter table public.reporters drop constraint reporters_channel_check;
alter table public.reporters add constraint reporters_channel_check
  check (channel in ('whatsapp', 'sms', 'web'));

alter table public.reporters add constraint reporters_phone_required_for_messaging
  check (channel = 'web' or (phone_e164 is not null and phone_last4 is not null));

-- Additive contract change: reporter_channel appended to dashboard_assessments.
create or replace view public.dashboard_assessments
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
  a.submitted_at,
  rep.channel     as reporter_channel
from public.assessments a
join public.schools s on s.id = a.school_id
join public.regions r on r.code = s.region_code
left join public.reporters rep on rep.id = a.reporter_id;
