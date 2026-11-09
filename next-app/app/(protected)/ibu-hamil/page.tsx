import Link from 'next/link';
import { createPregnantMother } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { PageHero } from '@/components/page-hero';

type Props = { searchParams: Promise<{ q?: string }> };
type Mother = { id: string; name: string; posyandu: { name: string } | null };
type Posyandu = { id: string; name: string };

export default async function PregnantMothersPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  let mothersQuery = supabase.from('pregnant_mothers').select('id, name, posyandu(name)').is('deleted_at', null).order('name');
  if (q?.trim()) mothersQuery = mothersQuery.ilike('name', `%${q.trim()}%`);
  const [{ data: mothersData }, { data: posyanduData }] = await Promise.all([mothersQuery, supabase.from('posyandu').select('id, name').order('name')]);
  const mothers = (mothersData ?? []) as unknown as Mother[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  return <div className="stitch-dashboard">
    <PageHero profile={profile} pageTitle="Ibu Hamil" pageDescription="Catat identitas dan riwayat kunjungan pemeriksaan ibu hamil di wilayah posyandu." />
    <main className="stitch-content ibu-hamil-content">
      <section className="admin-grid"><form action={createPregnantMother} className="card stacked-form"><h2>Tambah ibu hamil</h2><label>Posyandu<select name="posyanduId" required defaultValue=""><option value="" disabled>Pilih Posyandu</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Nama lengkap<input name="name" required /></label><button type="submit" disabled={posyandu.length === 0}>Simpan data</button></form>
        <section className="card"><div className="list-heading"><h2>Daftar ibu hamil</h2><form className="search-form"><input name="q" defaultValue={q} placeholder="Cari nama" /><button className="secondary">Cari</button></form></div>{mothers.length === 0 ? <div className="empty">Belum ada data ibu hamil pada Posyandu yang dapat Anda akses.</div> : <div className="data-list">{mothers.map((mother) => <Link className="data-row linked-row" href={`/ibu-hamil/${mother.id}`} key={mother.id}><div><strong>{mother.name}</strong><span>{mother.posyandu?.name ?? 'Posyandu'}</span></div><span>Lihat riwayat</span></Link>)}</div>}</section>
      </section>
    </main>
  </div>;
}
