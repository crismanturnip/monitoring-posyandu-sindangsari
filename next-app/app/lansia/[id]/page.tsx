import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addElderlyExamination, softDeleteElderlyPerson, updateElderlyPerson } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Props = { params: Promise<{ id: string }> };
type Examination = { id: string; examined_at: string; officer_notes: string | null };

export default async function ElderlyPersonDetailPage({ params }: Props) {
  const { id } = await params;
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: person }, { data: examinationsData }] = await Promise.all([
    supabase.from('elderly_people').select('id, name').eq('id', id).is('deleted_at', null).single(),
    supabase.from('elderly_examinations').select('id, examined_at, officer_notes').eq('elderly_person_id', id).order('examined_at', { ascending: false }),
  ]);
  if (!person) notFound();
  const examinations = (examinationsData ?? []) as Examination[];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));
  return <main className="admin-page"><nav className="admin-nav"><Link href="/lansia">← Kembali ke lansia</Link></nav><header className="admin-header"><div><p className="eyebrow">Detail monitoring</p><h1>{person.name}</h1><p>Parameter pemeriksaan klinis ditambahkan setelah disepakati tenaga kesehatan.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <section className="admin-grid detail-grid"><form action={updateElderlyPerson} className="card stacked-form"><h2>Identitas</h2><input type="hidden" name="id" value={id} /><label>Nama lengkap<input name="name" required defaultValue={person.name} /></label><button type="submit">Simpan perubahan</button></form>
      <div><form action={addElderlyExamination} className="card stacked-form"><h2>Catat pemeriksaan baru</h2><input type="hidden" name="elderlyPersonId" value={id} /><label>Tanggal pemeriksaan<input name="examinedAt" type="date" required /></label><label>Catatan petugas<textarea name="notes" rows={4} /></label><button type="submit">Simpan sebagai riwayat baru</button></form><section className="card history-card"><h2>Riwayat pemeriksaan</h2>{examinations.length === 0 ? <div className="empty">Belum ada riwayat pemeriksaan.</div> : <div className="data-list">{examinations.map((item) => <div className="data-row" key={item.id}><strong>{formatDate(item.examined_at)}</strong><span>{item.officer_notes || 'Tanpa catatan'}</span></div>)}</div>}</section>{profile.role === 'BIDAN' && <form action={softDeleteElderlyPerson} className="delete-form"><input type="hidden" name="id" value={id} /><button className="danger" type="submit">Hapus data (soft delete)</button></form>}</div>
    </section></main>;
}
