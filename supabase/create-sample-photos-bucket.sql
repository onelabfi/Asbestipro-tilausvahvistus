-- Create storage bucket for sample photos
-- Run this in Supabase SQL editor OR create bucket via dashboard:
--   Name: sample-photos
--   Public: false
--   File size limit: 10MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sample-photos',
  'sample-photos',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated service role to manage files
create policy "Service role can manage sample photos" on storage.objects
  for all
  using (bucket_id = 'sample-photos')
  with check (bucket_id = 'sample-photos');
