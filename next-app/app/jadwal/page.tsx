import Link from 'next/link';
import { cancelSchedule, createSchedule, updateSchedule } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Schedule = { id: string; starts_at: string; location: string; status: 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN'; posyandu: { name: string } | null };
type Posyandu = { id: string; name: string };

export default async function SchedulePage() {
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: schedulesData }, { data: posyanduData }] = await Promise.all([
    supabase.from('schedules').select('id, starts_at, location, status, posyandu(name)').order('starts_at'),
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
  ]);
  const schedules = (schedulesData ?? []) as unknown as Schedule[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(date));
  const inputDateTime = (date: string) => {
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date));
    const value = (part: string) => parts.find((item) => item.type === part)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
  };
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Kegiatan Posyandu</p><h1>Jadwal Posyandu</h1><p>Jadwal publik dapat dilihat masyarakat tanpa masuk ke sistem.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link href="/balita">Bayi &amp; Balita</Link><Link href="/ibu-hamil">Ibu Hamil</Link><Link href="/lansia">Lansia</Link><Link className="active" href="/jadwal">Jadwal</Link><Link href="/jadwal-publik">Jadwal publik</Link></nav>
    <section className="admin-grid">{profile.role === 'BIDAN' ? <form action={createSchedule} className="card stacked-form"><h2>Buat jadwal kegiatan</h2><label>Posyandu<select name="posyanduId" required defaultValue=""><option value="" disabled>Pilih Posyandu</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Tanggal dan waktu<input name="startsAt" type="datetime-local" required /></label><label>Lokasi kegiatan<input name="location" required /></label><button type="submit" disabled={posyandu.length === 0}>Simpan jadwal</button></form> : <section className="card"><h2>Jadwal Anda</h2><p className="muted-copy">Jadwal yang ditampilkan dibatasi untuk Posyandu penugasan Anda.</p></section>}
      <section className="card"><h2>Daftar jadwal</h2>{schedules.length === 0 ? <div className="empty">Belum ada jadwal yang dapat Anda akses.</div> : <div className="data-list">{schedules.map((schedule) => <div className="schedule-entry" key={schedule.id}><div className="data-row"><div><strong>{schedule.posyandu?.name ?? 'Posyandu'}</strong><span>{formatDate(schedule.starts_at)} · {schedule.location}</span></div><div className="row-actions"><span className={`status ${schedule.status.toLowerCase()}`}>{schedule.status}</span>{profile.role === 'BIDAN' && schedule.status === 'TERJADWAL' && <form action={cancelSchedule}><input type="hidden" name="id" value={schedule.id} /><button className="danger" type="submit">Batalkan</button></form>}</div></div>{profile.role === 'BIDAN' && <details className="schedule-edit"><summary>Ubah jadwal</summary><form action={updateSchedule}><input type="hidden" name="id" value={schedule.id} /><input name="startsAt" type="datetime-local" required defaultValue={inputDateTime(schedule.starts_at)} /><input name="location" required defaultValue={schedule.location} /><button type="submit">Simpan perubahan</button></form></details>}</div>)}</div>}</section>
    </section></main>;
}
