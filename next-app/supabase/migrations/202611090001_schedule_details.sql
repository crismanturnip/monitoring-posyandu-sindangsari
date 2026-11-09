create type public.schedule_target as enum ('BALITA', 'IBU_HAMIL', 'LANSIA', 'UMUM');

alter table public.schedules
  add column title text not null default 'Kegiatan Posyandu',
  add column description text,
  add column ends_at timestamptz,
  add column target_category public.schedule_target not null default 'UMUM',
  add constraint schedules_ends_after_start check (ends_at is null or ends_at > starts_at);

-- Data lama sudah terisi default; jadwal baru wajib punya judul.
alter table public.schedules alter column title drop default;
