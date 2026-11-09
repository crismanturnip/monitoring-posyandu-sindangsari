-- Tipe kembalian berubah, jadi fungsi harus di-drop dulu.
drop function if exists public.get_public_schedules();

create function public.get_public_schedules()
returns table (
  id uuid,
  posyandu_name text,
  title text,
  description text,
  target_category public.schedule_target,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  status public.schedule_status
)
language sql stable security definer set search_path = public as $$
  select s.id, p.name, s.title, s.description, s.target_category, s.starts_at, s.ends_at, s.location, s.status
  from public.schedules s join public.posyandu p on p.id = s.posyandu_id
  where s.is_public = true and p.is_active = true
  order by s.starts_at asc;
$$;

grant execute on function public.get_public_schedules() to anon, authenticated;
