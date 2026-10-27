import Link from 'next/link';
import { createChild } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Props = { searchParams: Promise<{ q?: string }> };
type Child = { id: string; name: string; mother_name: string; birth_date: string; gender: string; posyandu: { name: string } | null };
type Posyandu = { id: string; name: string };

export default async function BalitaPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  let childQuery = supabase.from('children').select('id, name, mother_name, birth_date, gender, posyandu(name)').is('deleted_at', null).order('name');
  if (q?.trim()) childQuery = childQuery.ilike('name', `%${q.trim()}%`);
  const [{ data: childrenData }, { data: posyanduData }] = await Promise.all([childQuery, supabase.from('posyandu').select('id, name').order('name')]);
  const children = (childrenData ?? []) as unknown as Child[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Data monitoring</p><h1>Bayi &amp; Balita</h1><p>Identitas dan riwayat pengukuran dikelola sesuai Posyandu penugasan.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link className="active" href="/balita">Bayi &amp; Balita</Link>{profile.role === 'BIDAN' && <><Link href="/admin/posyandu">Posyandu</Link><Link href="/admin/kader">Kader</Link></>}</nav>
    <section className="admin-grid"><form action={createChild} className="card stacked-form"><h2>Tambah bayi/balita</h2><label>Posyandu<select name="posyanduId" required defaultValue=""><option value="" disabled>Pilih Posyandu</option>{posyandu.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Nama anak<input name="name" required /></label><label>Nama ibu<input name="motherName" required /></label><label>Tanggal lahir<input name="birthDate" type="date" required /></label><label>Jenis kelamin<select name="gender" required defaultValue=""><option value="" disabled>Pilih</option><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></label><details><summary>Data kelahiran tambahan</summary><label>Tempat lahir<input name="birthPlace" /></label><label>Anak ke-<input name="childOrder" type="number" min="1" /></label><label>Jenis persalinan<input name="deliveryType" /></label><label>Berat lahir (kg)<input name="birthWeight" type="number" step="0.01" min="0.01" /></label><label>Panjang lahir (cm)<input name="birthLength" type="number" step="0.01" min="0.01" /></label></details><button type="submit" disabled={posyandu.length === 0}>Simpan data</button></form>
      <section className="card"><div className="list-heading"><h2>Daftar bayi/balita</h2><form className="search-form"><input name="q" defaultValue={q} placeholder="Cari nama anak" /><button className="secondary">Cari</button></form></div>{children.length === 0 ? <div className="empty">Belum ada data bayi/balita pada Posyandu yang dapat Anda akses.</div> : <div className="data-list">{children.map((child) => <Link className="data-row linked-row" href={`/balita/${child.id}`} key={child.id}><div><strong>{child.name}</strong><span>{child.mother_name} · {child.posyandu?.name ?? 'Posyandu'}</span></div><span>{child.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</span></Link>)}</div>}</section>
    </section></main>;
}
