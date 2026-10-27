import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addMeasurement, softDeleteChild, updateChild } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

type Props = { params: Promise<{ id: string }> };
type Measurement = { id: string; measured_at: string; weight_kg: number; height_cm: number; officer_notes: string | null };

export default async function ChildDetailPage({ params }: Props) {
  const { id } = await params;
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: child }, { data: measurementsData }] = await Promise.all([
    supabase.from('children').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('child_measurements').select('id, measured_at, weight_kg, height_cm, officer_notes').eq('child_id', id).order('measured_at', { ascending: false }),
  ]);
  if (!child) notFound();
  const measurements = (measurementsData ?? []) as Measurement[];
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));
  return <main className="admin-page"><nav className="admin-nav"><Link href="/balita">← Kembali ke bayi &amp; balita</Link></nav><header className="admin-header"><div><p className="eyebrow">Detail monitoring</p><h1>{child.name}</h1><p>Riwayat baru selalu ditambahkan sebagai catatan terpisah.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <section className="admin-grid detail-grid"><form action={updateChild} className="card stacked-form"><h2>Identitas</h2><input type="hidden" name="id" value={id} /><label>Nama anak<input name="name" required defaultValue={child.name} /></label><label>Nama ibu<input name="motherName" required defaultValue={child.mother_name} /></label><label>Tempat lahir<input name="birthPlace" defaultValue={child.birth_place ?? ''} /></label><label>Tanggal lahir<input name="birthDate" type="date" required defaultValue={child.birth_date} /></label><label>Jenis kelamin<select name="gender" defaultValue={child.gender}><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></label><label>Anak ke-<input name="childOrder" type="number" min="1" defaultValue={child.child_order ?? ''} /></label><label>Jenis persalinan<input name="deliveryType" defaultValue={child.delivery_type ?? ''} /></label><label>Berat lahir (kg)<input name="birthWeight" type="number" step="0.01" min="0.01" defaultValue={child.birth_weight_kg ?? ''} /></label><label>Panjang lahir (cm)<input name="birthLength" type="number" step="0.01" min="0.01" defaultValue={child.birth_length_cm ?? ''} /></label><button type="submit">Simpan perubahan</button></form>
      <div><form action={addMeasurement} className="card stacked-form"><h2>Catat pengukuran baru</h2><input type="hidden" name="childId" value={id} /><label>Tanggal pengukuran<input name="measuredAt" type="date" required /></label><label>Berat badan (kg)<input name="weightKg" type="number" step="0.01" min="0.01" required /></label><label>Tinggi/panjang badan (cm)<input name="heightCm" type="number" step="0.01" min="0.01" required /></label><label>Catatan petugas<textarea name="notes" rows={3} /></label><button type="submit">Simpan sebagai riwayat baru</button></form>
        <section className="card history-card"><h2>Riwayat pengukuran</h2>{measurements.length === 0 ? <div className="empty">Belum ada riwayat pengukuran.</div> : <div className="data-list">{measurements.map((item) => <div className="data-row" key={item.id}><div><strong>{formatDate(item.measured_at)}</strong><span>{item.officer_notes || 'Tanpa catatan'}</span></div><strong>{item.weight_kg} kg · {item.height_cm} cm</strong></div>)}</div>}</section>
        {profile.role === 'BIDAN' && <form action={softDeleteChild} className="delete-form"><input type="hidden" name="id" value={id} /><button className="danger" type="submit">Hapus data (soft delete)</button></form>}
      </div>
    </section></main>;
}
