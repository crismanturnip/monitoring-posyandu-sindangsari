-- Fields displayed in the baby, toddler, and pregnancy reports need matching inputs.
alter table public.children
  add column if not exists mother_nik text,
  add column if not exists father_name text,
  add column if not exists father_nik text,
  add column if not exists phone_number text,
  add column if not exists gestational_age_weeks numeric(4,1);

alter table public.child_measurements
  add column if not exists head_circumference_cm numeric(5,2),
  add column if not exists lila_cm numeric(5,2);

alter table public.pregnant_mothers
  add column if not exists nik text,
  add column if not exists birth_date date,
  add column if not exists husband_name text,
  add column if not exists husband_nik text,
  add column if not exists phone_number text,
  add column if not exists gestational_age_weeks numeric(4,1);
