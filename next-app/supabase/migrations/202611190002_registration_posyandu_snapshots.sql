begin;

alter table public.children
  add column if not exists registered_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists registered_posyandu_name text;
alter table public.pregnant_mothers
  add column if not exists registered_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists registered_posyandu_name text;
alter table public.elderly_people
  add column if not exists registered_posyandu_id uuid references public.posyandu(id) on delete restrict,
  add column if not exists registered_posyandu_name text;

update public.children c set registered_posyandu_id = c.posyandu_id,
  registered_posyandu_name = p.name from public.posyandu p
  where p.id = c.posyandu_id and c.registered_posyandu_id is null;
update public.pregnant_mothers m set registered_posyandu_id = m.posyandu_id,
  registered_posyandu_name = p.name from public.posyandu p
  where p.id = m.posyandu_id and m.registered_posyandu_id is null;
update public.elderly_people e set registered_posyandu_id = e.posyandu_id,
  registered_posyandu_name = p.name from public.posyandu p
  where p.id = e.posyandu_id and e.registered_posyandu_id is null;

create or replace function public.stamp_registration_posyandu() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.id, p.name into new.registered_posyandu_id, new.registered_posyandu_name
  from public.posyandu p where p.id = new.posyandu_id;
  if new.registered_posyandu_id is null then raise exception 'Posyandu pendaftaran tidak ditemukan'; end if;
  return new;
end;
$$;
drop trigger if exists stamp_child_registration_posyandu on public.children;
create trigger stamp_child_registration_posyandu before insert on public.children
  for each row execute function public.stamp_registration_posyandu();
drop trigger if exists stamp_mother_registration_posyandu on public.pregnant_mothers;
create trigger stamp_mother_registration_posyandu before insert on public.pregnant_mothers
  for each row execute function public.stamp_registration_posyandu();
drop trigger if exists stamp_elderly_registration_posyandu on public.elderly_people;
create trigger stamp_elderly_registration_posyandu before insert on public.elderly_people
  for each row execute function public.stamp_registration_posyandu();

create or replace function public.preserve_registration_posyandu() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.registered_posyandu_id := old.registered_posyandu_id;
  new.registered_posyandu_name := old.registered_posyandu_name;
  return new;
end;
$$;
drop trigger if exists preserve_child_registration_posyandu on public.children;
create trigger preserve_child_registration_posyandu before update on public.children
  for each row execute function public.preserve_registration_posyandu();
drop trigger if exists preserve_mother_registration_posyandu on public.pregnant_mothers;
create trigger preserve_mother_registration_posyandu before update on public.pregnant_mothers
  for each row execute function public.preserve_registration_posyandu();
drop trigger if exists preserve_elderly_registration_posyandu on public.elderly_people;
create trigger preserve_elderly_registration_posyandu before update on public.elderly_people
  for each row execute function public.preserve_registration_posyandu();

commit;
