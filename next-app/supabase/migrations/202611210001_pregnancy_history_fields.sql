alter table public.pregnant_mothers
  add column if not exists hpht date,
  add column if not exists gravida smallint check (gravida >= 1),
  add column if not exists para smallint check (para >= 0),
  add column if not exists abortus smallint check (abortus >= 0);
