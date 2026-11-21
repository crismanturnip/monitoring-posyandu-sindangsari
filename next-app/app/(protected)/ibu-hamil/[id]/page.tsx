import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addPregnancyVisit, softDeletePregnantMother, updatePregnantMother, updatePregnancyVisit } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { AutoResizeTextarea } from '@/components/auto-resize-textarea';
import { jakartaDate } from '@/lib/health-record-dates';
import { parseMotherExaminationNotes } from '@/lib/examination-notes';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ visit?: string }> };
type Visit = { id: string; visited_at: string; officer_notes: string | null };

export default async function PregnantMotherDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { visit } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const [{ data: mother }, { data: visitsData }] = await Promise.all([
    supabase.from('pregnant_mothers').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('pregnancy_visits').select('id, visited_at, officer_notes').eq('pregnant_mother_id', id).order('visited_at', { ascending: false }),
  ]);
  if (!mother) notFound();
  const visits = (visitsData ?? []) as Visit[];
  const reportDate = visits[0]?.visited_at ?? jakartaDate(new Date(mother.created_at));
  const reportHref = `/laporan?${new URLSearchParams({ category: 'ibu-hamil', period: 'custom', start: reportDate, end: reportDate, posyandu: mother.posyandu_id })}`;
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));

  return <main className="admin-page">
    <Link className="back-link" href="/ibu-hamil">← Kembali ke ibu hamil</Link>
    <header className="admin-header"><div><p className="eyebrow">Detail monitoring</p><h1>{mother.name}</h1><p>Perbarui identitas dan riwayat pemeriksaan secara terpisah.</p><Link className="ghost-btn" href={reportHref}>Lihat di laporan</Link></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    {visit === 'failed' && <p className="form-error" role="alert">Identitas ibu hamil tersimpan, tetapi kunjungan gagal disimpan. Isi ulang kunjungan di bawah.</p>}
    <section className="admin-grid detail-grid">
      <form action={updatePregnantMother} className="card stacked-form">
        <h2>Identitas</h2><input type="hidden" name="id" value={id} />
        <label>Nama lengkap<input name="name" required defaultValue={mother.name} /></label>
        <label>NIK ibu<input name="nik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={mother.nik ?? ''} /></label>
        <label>Tanggal lahir<input name="birthDate" type="date" defaultValue={mother.birth_date ?? ''} /></label>
        <label>Nama suami<input name="husbandName" defaultValue={mother.husband_name ?? ''} /></label>
        <label>NIK suami<input name="husbandNik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={mother.husband_nik ?? ''} /></label>
        <label>No. HP ibu/keluarga<input name="phoneNumber" type="tel" defaultValue={mother.phone_number ?? ''} /></label>
        <label>Usia kehamilan (minggu)<input name="gestationalWeeks" type="number" min="0.1" step="0.1" defaultValue={mother.gestational_age_weeks ?? ''} /></label>
        <label>HPHT (Hari Pertama Haid Terakhir)<input name="hpht" type="date" defaultValue={mother.hpht ?? ''} /></label>
        <div className="anc-gpa-grid">
          <label>G (Graviditas)<input name="gravida" type="number" min="1" max="32767" step="1" defaultValue={mother.gravida ?? ''} /></label>
          <label>P (Paritas)<input name="para" type="number" min="0" max="32767" step="1" defaultValue={mother.para ?? ''} /></label>
          <label>A (Abortus)<input name="abortus" type="number" min="0" max="32767" step="1" defaultValue={mother.abortus ?? ''} /></label>
        </div>
        <button type="submit">Simpan identitas</button>
      </form>
      <div>
        <form action={addPregnancyVisit} className="card stacked-form"><h2>Catat kunjungan baru</h2><input type="hidden" name="pregnantMotherId" value={id} /><label>Tanggal kunjungan<input name="visitedAt" type="date" required defaultValue={jakartaDate()} /></label><label>BB (kg)<input name="weight" type="number" min="0.01" step="0.01" /></label><label>TB (cm)<input name="height" type="number" min="0.01" step="0.01" /></label><label>Tekanan darah (mmHg)<input name="bloodPressure" placeholder="Contoh: 110/70" /></label><label>LiLA (cm)<input name="lila" type="number" min="0.01" step="0.01" /></label><label>Catatan petugas<AutoResizeTextarea name="notes" rows={4} /></label><button type="submit">Simpan sebagai riwayat baru</button></form>
        <section className="card history-card"><h2>Riwayat kunjungan</h2>{visits.length === 0 ? <p className="empty">Belum ada riwayat kunjungan.</p> : <div className="data-list">{visits.map(item => <div className="data-row measurement-history-row" key={item.id}><strong>{formatDate(item.visited_at)}</strong><span className="history-notes">{item.officer_notes || 'Tanpa catatan'}</span><details className="history-edit"><summary>Perbaiki hasil ini</summary><form action={updatePregnancyVisit} className="stacked-form"><input type="hidden" name="visitId" value={item.id} /><input type="hidden" name="pregnantMotherId" value={id} /><label>Tanggal kunjungan<input name="visitedAt" type="date" defaultValue={item.visited_at} required /></label><label>BB (kg)<input name="weight" type="number" min="0.01" step="0.01" defaultValue={parseMotherExaminationNotes(item.officer_notes).weight} /></label><label>TB (cm)<input name="height" type="number" min="0.01" step="0.01" defaultValue={parseMotherExaminationNotes(item.officer_notes).height} /></label><label>Tekanan darah (mmHg)<input name="bloodPressure" defaultValue={parseMotherExaminationNotes(item.officer_notes).bloodPressure} /></label><label>LiLA (cm)<input name="lila" type="number" min="0.01" step="0.01" defaultValue={parseMotherExaminationNotes(item.officer_notes).lila} /></label><label>Catatan petugas<textarea name="notes" rows={4} defaultValue={parseMotherExaminationNotes(item.officer_notes).notes} /></label><p className="muted-copy">Perbarui nilai BB, TB, tekanan darah, atau LiLA pada catatan ini. Baris laporan yang sama akan ikut berubah.</p><button type="submit">Simpan koreksi</button></form></details></div>)}</div>}</section>
        {profile.role === 'BIDAN' && <form action={softDeletePregnantMother} className="delete-form"><input type="hidden" name="id" value={id} /><button className="danger" type="submit">Hapus data (soft delete)</button></form>}
      </div>
    </section>
  </main>;
}
