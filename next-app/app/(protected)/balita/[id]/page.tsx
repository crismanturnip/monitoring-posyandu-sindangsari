import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addMeasurement, softDeleteChild, updateChild, updateMeasurement } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { jakartaDate } from '@/lib/health-record-dates';
import { childRegisterGroup } from '@/lib/child-register';
import { ChildReportIdentityFields, ChildReportMeasurementFields } from '@/components/child-report-fields';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ measurement?: string }> };
type Measurement = {
  id: string;
  measured_at: string;
  created_at: string;
  weight_kg: number;
  height_cm: number;
  head_circumference_cm: number | null;
  lila_cm: number | null;
  officer_notes: string | null;
};

const deliveryTypes = ['Normal', 'Operasi Caesar', 'Vakum', 'Forsep'];

export default async function ChildDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { measurement } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: child }, { data: measurementsData }] = await Promise.all([
    supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('child_measurements')
      .select('id, measured_at, created_at, weight_kg, height_cm, head_circumference_cm, lila_cm, officer_notes')
      .eq('child_id', id)
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (!child) notFound();
  const group = childRegisterGroup(child.birth_date, jakartaDate()) ?? 'balita';
  const basePath = `/${group}`;
  const measurements = (measurementsData ?? []) as Measurement[];
  const reportDate = measurements[0]?.measured_at ?? jakartaDate(new Date(child.created_at));
  const reportCategory = childRegisterGroup(child.birth_date, reportDate) ?? group;
  const reportHref = `/laporan?${new URLSearchParams({ category: reportCategory, period: 'custom', start: reportDate, end: reportDate, posyandu: child.posyandu_id })}`;
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
      new Date(`${date}T00:00:00`),
    );

  return (
    <main className="admin-page">
      <Link className="back-link" href={basePath}>
        ← Kembali ke {group}
      </Link>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Detail monitoring</p>
          <h1>{child.name}</h1>
          <p>Riwayat baru selalu ditambahkan sebagai catatan terpisah.</p>
          <Link className="ghost-btn" href={reportHref}>Lihat di laporan</Link>
        </div>
        <div className="profile">
          <div className="avatar">{profile.full_name[0]}</div>
          <span>{profile.full_name}</span>
          <LogoutButton />
        </div>
      </header>
      {measurement === 'failed' && (
        <p className="form-error" role="alert">
          Identitas balita sudah tersimpan, tetapi pengukuran gagal disimpan. Isi ulang pengukurannya pada form di bawah; tidak perlu mendaftarkan balita lagi.
        </p>
      )}
      <section className="admin-grid detail-grid">
        <form action={updateChild} className="card stacked-form">
          <h2>Identitas</h2>
          <input type="hidden" name="id" value={id} />
          <label>
            Nama anak
            <input name="name" required defaultValue={child.name} />
          </label>
          <label>
            NIK {group}
            <input name="nik" type="text" inputMode="numeric" pattern="[0-9]{16}" minLength={16} maxLength={16} required defaultValue={child.nik ?? ''} placeholder="16 digit NIK" title="NIK harus terdiri dari 16 digit angka" />
          </label>
          <label>
            Nama ibu
            <input name="motherName" required defaultValue={child.mother_name} />
          </label>
          <ChildReportIdentityFields child={child} group={group} />
          <label>
            Tempat lahir
            <input name="birthPlace" defaultValue={child.birth_place ?? ''} />
          </label>
          <label>
            Tanggal lahir
            <input name="birthDate" type="date" required defaultValue={child.birth_date} />
          </label>
          <label>
            Jenis kelamin
            <select name="gender" defaultValue={child.gender}>
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </label>
          <label>
            Anak ke-
            <input name="childOrder" type="number" min="1" defaultValue={child.child_order ?? ''} />
          </label>
          <label>
            Jenis persalinan
            <select name="deliveryType" defaultValue={child.delivery_type ?? ''}>
              <option value="">Pilih jenis persalinan</option>
              {deliveryTypes.map((type) => <option value={type} key={type}>{type}</option>)}
              {child.delivery_type && !deliveryTypes.includes(child.delivery_type) && (
                <option value={child.delivery_type}>{child.delivery_type}</option>
              )}
            </select>
          </label>
          <label>
            Berat lahir (kg)
            <input name="birthWeight" type="number" step="0.01" min="0.01" defaultValue={child.birth_weight_kg ?? ''} />
          </label>
          <label>
            Panjang lahir (cm)
            <input name="birthLength" type="number" step="0.01" min="0.01" defaultValue={child.birth_length_cm ?? ''} />
          </label>
          <button type="submit">Simpan perubahan</button>
        </form>
        <div>
          <form action={addMeasurement} className="card stacked-form">
            <h2>Catat pengukuran baru</h2>
            <p className="muted-copy">Hasil akan masuk laporan sesuai tanggal pengukuran dan Posyandu balita.</p>
            <input type="hidden" name="childId" value={id} />
            <input type="hidden" name="returnPath" value={basePath} />
            <label>Tanggal pengukuran<input name="measuredAt" type="date" required defaultValue={jakartaDate()} /></label>
            <label>Berat badan (kg)<input name="weightKg" type="number" step="0.01" min="0.01" required /></label>
            <label>Tinggi / panjang badan (cm)<input name="heightCm" type="number" step="0.01" min="0.01" required /></label>
            <ChildReportMeasurementFields group={group} />
            <label>Catatan petugas<textarea name="notes" rows={3} /></label>
            <button type="submit">Simpan sebagai riwayat baru</button>
          </form>
          <section className="card history-card">
            <h2>Riwayat pengukuran</h2>
            {measurements.length === 0 ? (
              <div className="empty">Belum ada riwayat pengukuran.</div>
            ) : (
              <div className="data-list">
                {measurements.map((item) => (
                  <div className="data-row measurement-history-row" key={item.id}>
                    <div>
                      <strong>{formatDate(item.measured_at)}</strong>
                      <span>{item.officer_notes || 'Tanpa catatan'}</span>
                    </div>
                    <strong>{item.weight_kg} kg · {item.height_cm} cm</strong>
                    <details className="history-edit">
                      <summary>Perbaiki hasil ini</summary>
                      <form action={updateMeasurement} className="stacked-form">
                        <input type="hidden" name="measurementId" value={item.id} />
                        <input type="hidden" name="childId" value={id} />
                        <label>Tanggal pengukuran<input name="measuredAt" type="date" defaultValue={item.measured_at} required /></label>
                        <label>Berat badan (kg)<input name="weightKg" type="number" min="0.01" step="0.01" defaultValue={item.weight_kg} required /></label>
                        <label>Tinggi / panjang badan (cm)<input name="heightCm" type="number" min="0.01" step="0.01" defaultValue={item.height_cm} required /></label>
                        <label>Lingkar kepala (cm)<input name="headCircumferenceCm" type="number" min="0.01" step="0.01" defaultValue={item.head_circumference_cm ?? ''} /></label>
                        <label>LiLA (cm)<input name="lilaCm" type="number" min="0.01" step="0.01" defaultValue={item.lila_cm ?? ''} /></label>
                        <label>Catatan petugas<textarea name="notes" rows={3} defaultValue={item.officer_notes ?? ''} /></label>
                        <button type="submit">Simpan koreksi</button>
                      </form>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </section>
          {profile.role === 'BIDAN' && (
            <form action={softDeleteChild} className="delete-form">
              <input type="hidden" name="returnPath" value={basePath} />
              <input type="hidden" name="id" value={id} />
              <button className="danger" type="submit">Hapus data (soft delete)</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
