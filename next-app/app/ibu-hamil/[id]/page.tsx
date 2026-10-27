import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addPregnancyVisit, softDeletePregnantMother, updatePregnantMother } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Props = { params: Promise<{ id: string }> };
type Visit = { id: string; visited_at: string; officer_notes: string | null };

export default async function PregnantMotherDetailPage({ params }: Props) {
  const { id } = await params;
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: mother }, { data: visitsData }] = await Promise.all([
    supabase.from('pregnant_mothers').select('id, name').eq('id', id).is('deleted_at', null).single(),
    supabase.from('pregnancy_visits').select('id, visited_at, officer_notes').eq('pregnant_mother_id', id).order('visited_at', { ascending: false }),
  ]);
  if (!mother) notFound();
  const visits = (visitsData ?? []) as Visit[];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));
  return <main className="admin-page"><nav className="admin-nav"><Link href="/ibu-hamil">← Kembali ke ibu hamil</Link></nav><header className="admin-header"><div><p className="eyebrow">Detail monitoring</p><h1>{mother.name}</h1><p>Variabel pemeriksaan klinis ditambahkan setelah ada keputusan bidan.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <section className="admin-grid detail-grid"><form action={updatePregnantMother} className="card stacked-form"><h2>Identitas</h2><input type="hidden" name="id" value={id} /><label>Nama lengkap<input name="name" required defaultValue={mother.name} /></label><button type="submit">Simpan perubahan</button></form>
      <div><form action={addPregnancyVisit} className="card stacked-form"><h2>Catat kunjungan baru</h2><input type="hidden" name="pregnantMotherId" value={id} /><label>Tanggal kunjungan<input name="visitedAt" type="date" required /></label><label>Catatan petugas<textarea name="notes" rows={4} /></label><button type="submit">Simpan sebagai riwayat baru</button></form><section className="card history-card"><h2>Riwayat kunjungan</h2>{visits.length === 0 ? <div className="empty">Belum ada riwayat kunjungan.</div> : <div className="data-list">{visits.map((visit) => <div className="data-row" key={visit.id}><strong>{formatDate(visit.visited_at)}</strong><span>{visit.officer_notes || 'Tanpa catatan'}</span></div>)}</div>}</section>{profile.role === 'BIDAN' && <form action={softDeletePregnantMother} className="delete-form"><input type="hidden" name="id" value={id} /><button className="danger" type="submit">Hapus data (soft delete)</button></form>}</div>
    </section></main>;
}
