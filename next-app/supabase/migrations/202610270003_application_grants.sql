-- RLS policies filter rows, while grants define which operations may reach
-- those policies. Keep these privileges explicit instead of relying on
-- dashboard defaults.
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

revoke execute on function public.is_bidan() from public;
revoke execute on function public.has_posyandu_access(uuid) from public;
revoke execute on function public.get_current_profile() from public;
revoke execute on function public.audit_change() from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;

grant execute on function public.is_bidan() to authenticated;
grant execute on function public.has_posyandu_access(uuid) to authenticated;
grant execute on function public.get_current_profile() to authenticated;
grant execute on function public.get_public_schedules() to anon, authenticated;
