-- Run this migration in the Supabase SQL editor or through the Supabase CLI.
-- It is intentionally local only: executing this file requires an explicit later step.

create type public.user_role as enum ('BIDAN', 'KADER');
create type public.account_status as enum ('PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE');
create type public.schedule_status as enum ('TERJADWAL', 'SELESAI', 'DIBATALKAN');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  role public.user_role not null default 'KADER',
  account_status public.account_status not null default 'PENDING',
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((account_status <> 'REJECTED') or rejection_reason is not null)
);

create table public.posyandu (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kader_assignments (
  id uuid primary key default gen_random_uuid(),
  kader_id uuid not null references public.profiles(id) on delete restrict,
  posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= assigned_at)
);
create unique index kader_one_active_assignment on public.kader_assignments(kader_id) where ended_at is null;

create table public.children (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  name text not null,
  mother_name text not null,
  birth_place text,
  birth_date date not null,
  gender text not null check (gender in ('LAKI_LAKI', 'PEREMPUAN')),
  child_order smallint check (child_order > 0),
  delivery_type text,
  birth_weight_kg numeric(5,2) check (birth_weight_kg > 0),
  birth_length_cm numeric(5,2) check (birth_length_cm > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index children_posyandu_name_idx on public.children(posyandu_id, name) where deleted_at is null;

create table public.child_measurements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  measured_at date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  height_cm numeric(5,2) not null check (height_cm > 0),
  officer_notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index child_measurements_child_date_idx on public.child_measurements(child_id, measured_at desc);

create table public.pregnant_mothers (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.pregnancy_visits (
  id uuid primary key default gen_random_uuid(),
  pregnant_mother_id uuid not null references public.pregnant_mothers(id) on delete restrict,
  visited_at date not null,
  officer_notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.elderly_people (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.elderly_examinations (
  id uuid primary key default gen_random_uuid(),
  elderly_person_id uuid not null references public.elderly_people(id) on delete restrict,
  examined_at date not null,
  officer_notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu(id) on delete restrict,
  starts_at timestamptz not null,
  location text not null,
  status public.schedule_status not null default 'TERJADWAL',
  is_public boolean not null default true,
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index schedules_public_upcoming_idx on public.schedules(starts_at) where is_public = true;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete restrict,
  action text not null,
  object_type text not null,
  object_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Audit is written by database triggers, never by a browser form. This keeps
-- the log append-only from the application perspective.
create or replace function public.audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_logs (actor_id, action, object_type, object_id, metadata)
  values (auth.uid(), lower(TG_OP), TG_TABLE_NAME, coalesce(new.id, old.id),
    jsonb_build_object('operation', TG_OP));
  return coalesce(new, old);
end;
$$;
create trigger audit_posyandu after insert or update on public.posyandu for each row execute function public.audit_change();
create trigger audit_assignments after insert or update on public.kader_assignments for each row execute function public.audit_change();
create trigger audit_children after insert or update on public.children for each row execute function public.audit_change();
create trigger audit_measurements after insert on public.child_measurements for each row execute function public.audit_change();
create trigger audit_mothers after insert or update on public.pregnant_mothers for each row execute function public.audit_change();
create trigger audit_visits after insert on public.pregnancy_visits for each row execute function public.audit_change();
create trigger audit_elderly after insert or update on public.elderly_people for each row execute function public.audit_change();
create trigger audit_examinations after insert on public.elderly_examinations for each row execute function public.audit_change();
create trigger audit_schedules after insert or update on public.schedules for each row execute function public.audit_change();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger posyandu_updated_at before update on public.posyandu for each row execute function public.set_updated_at();
create trigger children_updated_at before update on public.children for each row execute function public.set_updated_at();
create trigger mothers_updated_at before update on public.pregnant_mothers for each row execute function public.set_updated_at();
create trigger elderly_updated_at before update on public.elderly_people for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules for each row execute function public.set_updated_at();

-- A new Supabase Auth account starts as a pending kader. Promote the first bidan
-- manually in Supabase before opening registration to users.
create or replace function public.handle_new_user() returns trigger security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Kader Baru'));
  return new;
end;
$$ language plpgsql;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_bidan() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'BIDAN' and account_status = 'ACTIVE');
$$;
create or replace function public.has_posyandu_access(target_posyandu uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_bidan() or exists (
    select 1 from public.kader_assignments a join public.profiles p on p.id = a.kader_id
    where a.kader_id = auth.uid() and a.posyandu_id = target_posyandu and a.ended_at is null and p.account_status = 'ACTIVE'
  );
$$;

alter table public.profiles enable row level security;
alter table public.posyandu enable row level security;
alter table public.kader_assignments enable row level security;
alter table public.children enable row level security;
alter table public.child_measurements enable row level security;
alter table public.pregnant_mothers enable row level security;
alter table public.pregnancy_visits enable row level security;
alter table public.elderly_people enable row level security;
alter table public.elderly_examinations enable row level security;
alter table public.schedules enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles own or bidan read" on public.profiles for select using (id = auth.uid() or public.is_bidan());
create policy "bidan updates profiles" on public.profiles for update using (public.is_bidan()) with check (public.is_bidan());
create policy "signed in reads active posyandu" on public.posyandu for select to authenticated using (is_active and public.has_posyandu_access(id));
create policy "bidan manages posyandu" on public.posyandu for all using (public.is_bidan()) with check (public.is_bidan());
create policy "assignment own or bidan read" on public.kader_assignments for select using (kader_id = auth.uid() or public.is_bidan());
create policy "bidan manages assignments" on public.kader_assignments for all using (public.is_bidan()) with check (public.is_bidan());
create policy "permitted children read" on public.children for select using (public.has_posyandu_access(posyandu_id));
create policy "permitted children add" on public.children for insert with check (public.has_posyandu_access(posyandu_id));
create policy "permitted children update" on public.children for update using (public.has_posyandu_access(posyandu_id)) with check (public.has_posyandu_access(posyandu_id) and (public.is_bidan() or deleted_at is null));
create policy "permitted mothers read" on public.pregnant_mothers for select using (public.has_posyandu_access(posyandu_id));
create policy "permitted mothers add" on public.pregnant_mothers for insert with check (public.has_posyandu_access(posyandu_id));
create policy "permitted mothers update" on public.pregnant_mothers for update using (public.has_posyandu_access(posyandu_id)) with check (public.has_posyandu_access(posyandu_id) and (public.is_bidan() or deleted_at is null));
create policy "permitted elderly read" on public.elderly_people for select using (public.has_posyandu_access(posyandu_id));
create policy "permitted elderly add" on public.elderly_people for insert with check (public.has_posyandu_access(posyandu_id));
create policy "permitted elderly update" on public.elderly_people for update using (public.has_posyandu_access(posyandu_id)) with check (public.has_posyandu_access(posyandu_id) and (public.is_bidan() or deleted_at is null));
create policy "permitted measurements read" on public.child_measurements for select using (exists (select 1 from public.children c where c.id = child_id and public.has_posyandu_access(c.posyandu_id)));
create policy "permitted measurements add" on public.child_measurements for insert with check (exists (select 1 from public.children c where c.id = child_id and public.has_posyandu_access(c.posyandu_id)));
create policy "permitted pregnancy visits read" on public.pregnancy_visits for select using (exists (select 1 from public.pregnant_mothers m where m.id = pregnant_mother_id and public.has_posyandu_access(m.posyandu_id)));
create policy "permitted pregnancy visits add" on public.pregnancy_visits for insert with check (exists (select 1 from public.pregnant_mothers m where m.id = pregnant_mother_id and public.has_posyandu_access(m.posyandu_id)));
create policy "permitted elderly examinations read" on public.elderly_examinations for select using (exists (select 1 from public.elderly_people e where e.id = elderly_person_id and public.has_posyandu_access(e.posyandu_id)));
create policy "permitted elderly examinations add" on public.elderly_examinations for insert with check (exists (select 1 from public.elderly_people e where e.id = elderly_person_id and public.has_posyandu_access(e.posyandu_id)));
create policy "assigned users read schedules" on public.schedules for select to authenticated using (public.has_posyandu_access(posyandu_id));
create policy "bidan manages schedules" on public.schedules for all using (public.is_bidan()) with check (public.is_bidan());
create policy "recipient reads notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "bidan creates notifications" on public.notifications for insert with check (public.is_bidan());
create policy "bidan reads activity logs" on public.activity_logs for select using (public.is_bidan());

-- No browser policy permits editing or deleting activity logs.

-- This deliberately exposes only public event information, never user IDs or
-- health data. It can be called by the public schedule page without login.
create or replace function public.get_public_schedules()
returns table (id uuid, posyandu_name text, starts_at timestamptz, location text, status public.schedule_status)
language sql stable security definer set search_path = public as $$
  select s.id, p.name, s.starts_at, s.location, s.status
  from public.schedules s join public.posyandu p on p.id = s.posyandu_id
  where s.is_public = true and p.is_active = true
  order by s.starts_at asc;
$$;
grant execute on function public.get_public_schedules() to anon, authenticated;
