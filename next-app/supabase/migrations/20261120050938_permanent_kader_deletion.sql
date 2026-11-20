begin;

create or replace function public.delete_kader_account(target_kader uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
  blockers text[] := array[]::text[];
  blocker_summary text;
begin
  if auth.uid() is null or not public.is_bidan() then
    raise exception 'Hanya bidan aktif yang dapat menghapus akun kader.' using errcode = 'P0001';
  end if;
  if target_kader is null then
    raise exception 'Akun kader tidak valid.' using errcode = 'P0001';
  end if;

  select p.role into target_role
  from public.profiles p
  where p.id = target_kader
  for update;

  if not found then
    raise exception 'Akun kader tidak ditemukan.' using errcode = 'P0001';
  end if;
  if target_role <> 'KADER' then
    raise exception 'Hanya akun kader yang dapat dihapus melalui fitur ini.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.child_measurements where recorded_by = target_kader)
    or exists (select 1 from public.pregnancy_visits where recorded_by = target_kader)
    or exists (select 1 from public.elderly_examinations where recorded_by = target_kader) then
    blockers := array_append(blockers, 'riwayat pemeriksaan kesehatan');
  end if;
  if exists (select 1 from public.schedules where created_by = target_kader) then
    blockers := array_append(blockers, 'jadwal');
  end if;
  if exists (select 1 from public.activity_logs where actor_id = target_kader) then
    blockers := array_append(blockers, 'catatan audit');
  end if;
  if exists (select 1 from public.profiles where approved_by = target_kader) then
    blockers := array_append(blockers, 'riwayat persetujuan akun');
  end if;
  if exists (select 1 from public.kader_assignments where assigned_by = target_kader) then
    blockers := array_append(blockers, 'riwayat penetapan kader lain');
  end if;
  if exists (select 1 from public.kader_transfer_requests where decided_by = target_kader) then
    blockers := array_append(blockers, 'riwayat keputusan permintaan pindah');
  end if;

  if cardinality(blockers) > 0 then
    blocker_summary := pg_catalog.array_to_string(blockers, ', ');
    raise exception 'Akun tidak dihapus karena masih tercatat pada: %. Riwayat tersebut dipertahankan; tidak ada perubahan yang disimpan.', blocker_summary
      using errcode = 'P0001';
  end if;

  delete from public.kader_assignments where kader_id = target_kader;
  delete from public.kader_transfer_requests where kader_id = target_kader;

  insert into public.activity_logs(actor_id, action, object_type, object_id, metadata)
  values (auth.uid(), 'delete', 'kader_account', target_kader, '{"permanent": true}'::jsonb);

  delete from public.profiles where id = target_kader;
  delete from auth.users where id = target_kader;

  if not found then
    raise exception 'Akun autentikasi tidak ditemukan; penghapusan dibatalkan.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.delete_kader_account(uuid) from public, anon;
grant execute on function public.delete_kader_account(uuid) to authenticated;

commit;
