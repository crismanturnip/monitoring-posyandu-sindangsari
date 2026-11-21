-- Izinkan Kader yang memiliki akses ke Posyandu untuk melakukan soft-delete (update deleted_at) pada data balita/bayi
drop policy if exists "permitted children update" on public.children;
create policy "permitted children update" on public.children
for update
using (public.has_posyandu_access(posyandu_id))
with check (public.has_posyandu_access(posyandu_id));

-- Izinkan Kader yang memiliki akses ke Posyandu untuk melakukan soft-delete (update deleted_at) pada data ibu hamil
drop policy if exists "permitted mothers update" on public.pregnant_mothers;
create policy "permitted mothers update" on public.pregnant_mothers
for update
using (public.has_posyandu_access(posyandu_id))
with check (public.has_posyandu_access(posyandu_id));
