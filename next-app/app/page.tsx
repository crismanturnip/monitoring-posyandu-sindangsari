import Link from 'next/link';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Schedule = { id: string; starts_at: string; location: string; posyandu: { name: string } | null };
type Activity = { id: string; action: string; object_type: string; created_at: string };

const labels: Record<string, string> = { children: 'data bayi/balita', child_measurements: 'pengukuran bayi/balita', pregnant_mothers: 'data ibu hamil', pregnancy_visits: 'kunjungan ibu hamil', elderly_people: 'data lansia', elderly_examinations: 'pemeriksaan lansia', schedules: 'jadwal kegiatan', posyandu: 'Posyandu', kader_assignments: 'penugasan kader' };

export default async function Home() {
  const { profile, supabase } = await requireActiveProfile();
  const now = new Date().toISOString();
  const [children, mothers, elderly, posyandu, schedules, activities] = await Promise.all([
    supabase.from('children').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('pregnant_mothers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('elderly_people').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('posyandu').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('schedules').select('id, starts_at, location, posyandu(name)').gte('starts_at', now).neq('status', 'DIBATALKAN').order('starts_at').limit(5),
    profile.role === 'BIDAN' ? supabase.from('activity_logs').select('id, action, object_type, created_at').order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] as Activity[] }),
  ]);
  const stats: Array<[string, number, string]> = [['Bayi & Balita', children.count ?? 0, '/balita'], ['Ibu Hamil', mothers.count ?? 0, '/ibu-hamil'], ['Lansia', elderly.count ?? 0, '/lansia'], ['Posyandu Aktif', posyandu.count ?? 0, profile.role === 'BIDAN' ? '/admin/posyandu' : '/jadwal']];
  const upcoming = (schedules.data ?? []) as unknown as Schedule[];
  const activityData = (activities.data ?? []) as Activity[];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(date));

  return <div className="dashboard-home">
    <header className="topbar"><div><h1>Dashboard</h1><p>Ringkasan monitoring Posyandu Desa Sindangsari</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name} · {profile.role === 'BIDAN' ? 'Bidan' : 'Kader'}</span><LogoutButton /></div></header>
    <section className="content">
      <div className="notice"><strong>Data langsung dari sistem</strong>Statistik dan jadwal mengikuti hak akses Posyandu akun yang sedang masuk.</div>
      <div className="stats">{stats.map(([label, value, href]) => <Link className="card stat-card" href={href} key={label}><div className="stat-label">{label}</div><div className="stat-value">{new Intl.NumberFormat('id-ID').format(value)}</div></Link>)}</div>
      <div className="section-grid">
        <section className="card"><h2>Jadwal kegiatan mendatang</h2>{upcoming.length === 0 ? <div className="empty">Belum ada jadwal mendatang.</div> : <div className="data-list">{upcoming.map((schedule) => <div className="data-row" key={schedule.id}><div><strong>{schedule.posyandu?.name ?? 'Posyandu'}</strong><span>{formatDate(schedule.starts_at)} · {schedule.location}</span></div></div>)}</div>}<Link className="panel-link" href="/jadwal">Lihat seluruh jadwal</Link></section>
        <section className="card"><h2>Aktivitas terbaru</h2>{profile.role !== 'BIDAN' ? <div className="empty">Aktivitas administrasi hanya tersedia untuk bidan.</div> : activityData.length === 0 ? <div className="empty">Belum ada aktivitas tercatat.</div> : <div className="data-list">{activityData.map((activity) => <div className="data-row" key={activity.id}><div><strong>{activity.action === 'insert' ? 'Menambahkan' : 'Memperbarui'} {labels[activity.object_type] ?? activity.object_type}</strong><span>{formatDate(activity.created_at)}</span></div></div>)}</div>}</section>
      </div>
    </section>
  </div>;
}
