-- RLS tetap membatasi penghapusan Posyandu hanya untuk akun BIDAN aktif.
-- Relasi warga, jadwal, dan penugasan kader memakai ON DELETE RESTRICT.
grant delete on public.posyandu to authenticated;
