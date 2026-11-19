-- Keep registration requests, assignments, and examination locations distinct.
begin;

alter table public.profiles
  add column if not exists email text,
  add column if not exists email_confirmed_at timestamptz,
  add column if not exists phone_number text,
  add column if not exists requested_posyandu_id uuid references public.posyandu(id) on delete set null;

update public.profiles p
set email = u.email, email_confirmed_at = u.email_confirmed_at
from auth.users u where u.id = p.id;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare preferred uuid;
begin
  if (new.raw_user_meta_data ->> 'requested_posyandu_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into preferred from public.posyandu
    where id = (new.raw_user_meta_data ->> 'requested_posyandu_id')::uuid and is_active;
  end if;
  insert into public.profiles (id, full_name, email, email_confirmed_at, requested_posyandu_id)
  values (new.id, coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Kader Baru'), new.email, new.email_confirmed_at, preferred);
  return new;
end;
$$;

create or replace function public.sync_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email, email_confirmed_at = new.email_confirmed_at
  where id = new.id;
  return new;
end;
$$;
drop trigger if exists sync_auth_profile on auth.users;
create trigger sync_auth_profile after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_auth_profile();

create or replace function public.registration_posyandu()
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name from public.posyandu p where p.is_active order by p.name;
$$;
revoke all on function public.registration_posyandu() from public;
grant execute on function public.registration_posyandu() to anon, authenticated;

create or replace function public.update_my_profile(new_name text, new_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or pg_catalog.char_length(pg_catalog.btrim(coalesce(new_name, ''))) not between 2 and 100 then
    raise exception 'Nama lengkap harus 2 sampai 100 karakter';
  end if;
  if new_phone is not null and pg_catalog.btrim(new_phone) <> '' and
     (pg_catalog.char_length(pg_catalog.btrim(new_phone)) not between 8 and 25 or
      pg_catalog.btrim(new_phone) !~ '^[+0-9 ()-]+$') then
    raise exception 'Nomor telepon tidak valid';
  end if;
  update public.profiles set full_name = pg_catalog.btrim(new_name),
    phone_number = nullif(pg_catalog.btrim(coalesce(new_phone, '')), '')
  where id = auth.uid() and account_status = 'ACTIVE';
  if not found then raise exception 'Akun tidak aktif'; end if;
end;
$$;
revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;

create table if not exists public.kader_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  kader_id uuid not null references public.profiles(id) on delete restrict,
  requested_posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  decided_posyandu_id uuid references public.posyandu(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  check ((status = 'PENDING' and decided_at is null and decided_by is null)
      or (status <> 'PENDING' and decided_at is not null and decided_by is not null))
);
create unique index if not exists kader_one_pending_transfer
  on public.kader_transfer_requests(kader_id) where status = 'PENDING';
alter table public.kader_transfer_requests enable row level security;
drop policy if exists "transfer own or bidan read" on public.kader_transfer_requests;
create policy "transfer own or bidan read" on public.kader_transfer_requests
  for select to authenticated using (kader_id = auth.uid() or public.is_bidan());
grant select on public.kader_transfer_requests to authenticated;

create or replace function public.request_kader_transfer(target_posyandu uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'KADER' and account_status = 'ACTIVE'
  ) then raise exception 'Hanya kader aktif yang dapat mengajukan pindah'; end if;
  if not exists (select 1 from public.posyandu where id = target_posyandu and is_active) then
    raise exception 'Posyandu tujuan tidak aktif';
  end if;
  if exists (select 1 from public.kader_assignments where kader_id = auth.uid()
      and posyandu_id = target_posyandu and ended_at is null) then
    raise exception 'Anda sudah bertugas di Posyandu tersebut';
  end if;
  insert into public.kader_transfer_requests(kader_id, requested_posyandu_id)
  values (auth.uid(), target_posyandu);
end;
$$;
revoke all on function public.request_kader_transfer(uuid) from public;
grant execute on function public.request_kader_transfer(uuid) to authenticated;

create or replace function public.assign_kader(target_kader uuid, target_posyandu uuid, transfer_request uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status public.account_status;
begin
  if not public.is_bidan() then raise exception 'Hanya bidan aktif yang dapat menetapkan kader'; end if;
  select account_status into current_status from public.profiles
    where id = target_kader and role = 'KADER' for update;
  if current_status is null or current_status not in ('PENDING', 'ACTIVE') then
    raise exception 'Status kader tidak dapat ditetapkan';
  end if;
  if not exists (select 1 from public.posyandu where id = target_posyandu and is_active) then
    raise exception 'Posyandu tujuan tidak aktif';
  end if;
  if transfer_request is not null and not exists (
    select 1 from public.kader_transfer_requests where id = transfer_request
      and kader_id = target_kader and status = 'PENDING'
  ) then raise exception 'Permintaan pindah tidak ditemukan'; end if;
  if current_status = 'PENDING' and not exists (
    select 1 from public.profiles where id = target_kader and email_confirmed_at is not null
  ) then raise exception 'Email kader belum terverifikasi'; end if;

  update public.kader_assignments set ended_at = pg_catalog.now()
    where kader_id = target_kader and ended_at is null;
  insert into public.kader_assignments(kader_id, posyandu_id, assigned_by)
    values (target_kader, target_posyandu, auth.uid());
  if current_status = 'PENDING' then
    update public.profiles set account_status = 'ACTIVE', approved_at = pg_catalog.now(),
      approved_by = auth.uid(), rejection_reason = null
    where id = target_kader;
  end if;
  if transfer_request is not null then
    update public.kader_transfer_requests set status = 'APPROVED',
      decided_posyandu_id = target_posyandu, decided_at = pg_catalog.now(), decided_by = auth.uid()
    where id = transfer_request;
  end if;
end;
$$;
revoke all on function public.assign_kader(uuid, uuid, uuid) from public;
grant execute on function public.assign_kader(uuid, uuid, uuid) to authenticated;

create or replace function public.reject_kader_transfer(transfer_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_bidan() then raise exception 'Hanya bidan aktif yang dapat menolak permintaan'; end if;
  update public.kader_transfer_requests set status = 'REJECTED',
    decided_at = pg_catalog.now(), decided_by = auth.uid()
  where id = transfer_request and status = 'PENDING';
  if not found then raise exception 'Permintaan tidak ditemukan'; end if;
end;
$$;
revoke all on function public.reject_kader_transfer(uuid) from public;
grant execute on function public.reject_kader_transfer(uuid) to authenticated;

alter table public.child_measurements
  add column if not exists recorded_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists recorded_posyandu_name text;
alter table public.pregnancy_visits
  add column if not exists recorded_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists recorded_posyandu_name text;
alter table public.elderly_examinations
  add column if not exists recorded_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists recorded_posyandu_name text;

update public.child_measurements h set recorded_posyandu_id = c.posyandu_id,
  recorded_posyandu_name = p.name
from public.children c join public.posyandu p on p.id = c.posyandu_id
where c.id = h.child_id and h.recorded_posyandu_id is null;
update public.pregnancy_visits h set recorded_posyandu_id = m.posyandu_id,
  recorded_posyandu_name = p.name
from public.pregnant_mothers m join public.posyandu p on p.id = m.posyandu_id
where m.id = h.pregnant_mother_id and h.recorded_posyandu_id is null;
update public.elderly_examinations h set recorded_posyandu_id = e.posyandu_id,
  recorded_posyandu_name = p.name
from public.elderly_people e join public.posyandu p on p.id = e.posyandu_id
where e.id = h.elderly_person_id and h.recorded_posyandu_id is null;

create or replace function public.stamp_examination_posyandu() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'child_measurements' then
    select c.posyandu_id, p.name into new.recorded_posyandu_id, new.recorded_posyandu_name
      from public.children c join public.posyandu p on p.id = c.posyandu_id where c.id = new.child_id;
  elsif tg_table_name = 'pregnancy_visits' then
    select m.posyandu_id, p.name into new.recorded_posyandu_id, new.recorded_posyandu_name
      from public.pregnant_mothers m join public.posyandu p on p.id = m.posyandu_id where m.id = new.pregnant_mother_id;
  else
    select e.posyandu_id, p.name into new.recorded_posyandu_id, new.recorded_posyandu_name
      from public.elderly_people e join public.posyandu p on p.id = e.posyandu_id where e.id = new.elderly_person_id;
  end if;
  if new.recorded_posyandu_id is null then raise exception 'Posyandu pemeriksaan tidak ditemukan'; end if;
  return new;
end;
$$;
drop trigger if exists stamp_child_posyandu on public.child_measurements;
create trigger stamp_child_posyandu before insert on public.child_measurements
  for each row execute function public.stamp_examination_posyandu();
drop trigger if exists stamp_mother_posyandu on public.pregnancy_visits;
create trigger stamp_mother_posyandu before insert on public.pregnancy_visits
  for each row execute function public.stamp_examination_posyandu();
drop trigger if exists stamp_elderly_posyandu on public.elderly_examinations;
create trigger stamp_elderly_posyandu before insert on public.elderly_examinations
  for each row execute function public.stamp_examination_posyandu();

drop policy if exists "permitted measurements update" on public.child_measurements;
create policy "permitted measurements update" on public.child_measurements for update to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and public.has_posyandu_access(c.posyandu_id)))
  with check (exists (select 1 from public.children c where c.id = child_id and public.has_posyandu_access(c.posyandu_id)));
drop policy if exists "permitted pregnancy visits update" on public.pregnancy_visits;
create policy "permitted pregnancy visits update" on public.pregnancy_visits for update to authenticated
  using (exists (select 1 from public.pregnant_mothers m where m.id = pregnant_mother_id and public.has_posyandu_access(m.posyandu_id)))
  with check (exists (select 1 from public.pregnant_mothers m where m.id = pregnant_mother_id and public.has_posyandu_access(m.posyandu_id)));
grant update(measured_at, weight_kg, height_cm, head_circumference_cm, lila_cm, officer_notes)
  on public.child_measurements to authenticated;
grant update(visited_at, officer_notes) on public.pregnancy_visits to authenticated;

create or replace function public.audit_examination_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_logs(actor_id, action, object_type, object_id, metadata)
  values (auth.uid(), 'update', tg_table_name, new.id,
    pg_catalog.jsonb_build_object('before', pg_catalog.to_jsonb(old), 'after', pg_catalog.to_jsonb(new)));
  return new;
end;
$$;
drop trigger if exists audit_measurement_updates on public.child_measurements;
create trigger audit_measurement_updates after update on public.child_measurements
  for each row execute function public.audit_examination_update();
drop trigger if exists audit_visit_updates on public.pregnancy_visits;
create trigger audit_visit_updates after update on public.pregnancy_visits
  for each row execute function public.audit_examination_update();

commit;
