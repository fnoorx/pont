-- Pont: private bucket for field photos and voice notes.
-- authenticated (dashboard staff) may read objects, so they can create signed URLs.
-- There are no insert/update/delete policies: only the service role (which
-- bypasses RLS) can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'field-media',
  'field-media',
  false,
  16777216, -- 16 MB, the WhatsApp media limit
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "field-media: authenticated can read" on storage.objects;

create policy "field-media: authenticated can read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'field-media');
