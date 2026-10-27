-- Provides the authenticated user's own profile without relying on a browser
-- table query. The function is security definer but always scopes to auth.uid().
create or replace function public.get_current_profile()
returns table (
  id uuid,
  full_name text,
  role public.user_role,
  account_status public.account_status
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role, p.account_status
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_current_profile() to authenticated;
