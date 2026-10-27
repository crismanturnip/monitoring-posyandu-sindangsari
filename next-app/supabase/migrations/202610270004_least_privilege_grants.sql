-- Remove dashboard-inherited privileges and grant only operations used by the
-- application. RLS still evaluates every granted operation.
revoke all privileges on public.profiles from anon, authenticated;
revoke all privileges on public.posyandu from anon, authenticated;
revoke all privileges on public.kader_assignments from anon, authenticated;
revoke all privileges on public.children from anon, authenticated;
revoke all privileges on public.child_measurements from anon, authenticated;
revoke all privileges on public.pregnant_mothers from anon, authenticated;
revoke all privileges on public.pregnancy_visits from anon, authenticated;
revoke all privileges on public.elderly_people from anon, authenticated;
revoke all privileges on public.elderly_examinations from anon, authenticated;
revoke all privileges on public.schedules from anon, authenticated;
revoke all privileges on public.notifications from anon, authenticated;
revoke all privileges on public.activity_logs from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.posyandu to authenticated;
grant select, insert, update on public.kader_assignments to authenticated;
grant select, insert, update on public.children to authenticated;
grant select, insert on public.child_measurements to authenticated;
grant select, insert, update on public.pregnant_mothers to authenticated;
grant select, insert on public.pregnancy_visits to authenticated;
grant select, insert, update on public.elderly_people to authenticated;
grant select, insert on public.elderly_examinations to authenticated;
grant select, insert, update on public.schedules to authenticated;
grant select, insert on public.notifications to authenticated;
grant select on public.activity_logs to authenticated;
