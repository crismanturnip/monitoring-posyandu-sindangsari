import Link from 'next/link';
import { createPublicSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/public';

type PublicSchedule = { id: string; posyandu_name: string; starts_at: string; location: string; status: 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN' };

export default async function PublicSchedulePage() {
  const schedules: PublicSchedule[] = isSupabaseConfigured()
    ? ((await createPublicSupabaseClient().rpc('get_public_schedules')).data ?? []) as PublicSchedule[]
    : [];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(date));
  return <main className="public-page"><header className="public-header"><div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></div><Link href="/login">Masuk petugas</Link></header><section className="public-hero"><p className="eyebrow">Informasi untuk masyarakat</p><h1>Jadwal kegiatan Posyandu</h1><p>Lihat waktu dan lokasi kegiatan Posyandu Desa Sindangsari. Halaman ini tidak menampilkan data pribadi atau kesehatan.</p></section><section className="public-list">{schedules.length === 0 ? <div className="card empty">Belum ada jadwal kegiatan yang dipublikasikan.</div> : schedules.map((schedule) => <article className="public-schedule card" key={schedule.id}><span className={`status ${schedule.status.toLowerCase()}`}>{schedule.status}</span><h2>{schedule.posyandu_name}</h2><p>{formatDate(schedule.starts_at)}</p><p>{schedule.location}</p></article>)}</section></main>;
}
