-- Bidan may delete schedules through the existing "bidan manages schedules"
-- RLS policy. Kader remain unable to delete because the policy rejects them.
grant delete on public.schedules to authenticated;
