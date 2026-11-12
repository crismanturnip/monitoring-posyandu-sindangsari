-- Run this migration in the Supabase SQL editor or through the Supabase CLI.
-- Existing children remain unset until their KMS status is entered.
alter table public.children
  add column kms_status text
  check (kms_status in ('GIZI_BAIK', 'PERLU_PANTAUAN'));
