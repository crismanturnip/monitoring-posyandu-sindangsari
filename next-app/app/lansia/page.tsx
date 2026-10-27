import Link from 'next/link';
import { createElderlyPerson } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Props = { searchParams: Promise<{ q?: string }> };
type ElderlyPerson = { id: string; name: string; posyandu: { name: string } | null };
type Posyandu = { id: string; name: string };

export default async function ElderlyPeoplePage({ searchParams }: Props) {
  const { q } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  let elderlyQuery = supabase.from('elderly_people').select('id, name, posyandu(name)').is('deleted_at', null).order('name');
  if (q?.trim()) elderlyQuery = elderlyQuery.ilike('name', `%${q.trim()}%`);
  const [{ data: elderlyData }, { data: posyanduData }] = await Promise.all([elderlyQuery, supabase.from('posyandu').select('id, name').order('name')]);
  const elderlyPeople = (elderlyData ?? []) as unknown as ElderlyPerson[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Data monitoring</p><h1>Lansia</h1><p>Kelola identitas dan riwayat pemeriksaan sesuai Posyandu penugasan.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link href="/balita">Bayi &amp; Balita</Link><Link href="/ibu-hamil">Ibu Hamil</Link><Link className="active" href="/lansia">Lansia</Link>{profile.role === 'BIDAN' && <Link href="/admin/posyandu">Posyandu</Link>}</nav>
    <section className="admin-grid"><form action={createElderlyPerson} className="card stacked-form"><h2>Tambah lansia</h2><label>Posyandu<select name="posyanduId" required defaultValue=""><option value="" disabled>Pilih Posyandu</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Nama lengkap<input name="name" required /></label><button type="submit" disabled={posyandu.length === 0}>Simpan data</button></form>
      <section className="card"><div className="list-heading"><h2>Daftar lansia</h2><form className="search-form"><input name="q" defaultValue={q} placeholder="Cari nama" /><button className="secondary">Cari</button></form></div>{elderlyPeople.length === 0 ? <div className="empty">Belum ada data lansia pada Posyandu yang dapat Anda akses.</div> : <div className="data-list">{elderlyPeople.map((person) => <Link className="data-row linked-row" href={`/lansia/${person.id}`} key={person.id}><div><strong>{person.name}</strong><span>{person.posyandu?.name ?? 'Posyandu'}</span></div><span>Lihat riwayat</span></Link>)}</div>}</section>
    </section></main>;
}
