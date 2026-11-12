-- Existing records can be completed through the required NIK fields in the
-- child edit forms; any NIK that is present must contain exactly 16 digits.
alter table public.children
  add column nik text
  check (nik is null or nik ~ '^[0-9]{16}$');
