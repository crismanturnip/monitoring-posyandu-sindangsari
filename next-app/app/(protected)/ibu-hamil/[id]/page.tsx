import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addPregnancyVisit, softDeletePregnantMother, updatePregnantMother } from '../actions';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { AutoResizeTextarea } from '@/components/auto-resize-textarea';
import { jakartaDate } from '@/lib/health-record-dates';

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
  return <main className="admin-page"><Link className="back-link" href="/ibu-hamil">← Kembali ke ibu hamil</Link><header className="admin-header"><div><p className="eyebrow">Detail monitoring</p><h1>{mother.name}</h1><p>Identitas dan hasil pemeriksaan yang dicatat tampil di laporan.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <Link className="ghost-btn" href={reportHref}>Lihat di laporan</Link>
    {visit === 'failed' && <p className="form-error" role="alert">Identitas ibu hamil sudah tersimpan, tetapi kunjungan gagal disimpan. Isi ulang kunjungan pada form di bawah; tidak perlu mendaftarkan ibu hamil lagi.</p>}
    <section className="admin-grid detail-grid"><form action={updatePregnantMother} className="card stacked-form"><h2>Identitas</h2><input type="hidden" name="id" value={id} /><label>Nama lengkap<input name="name" required defaultValue={mother.name} /></label><label>NIK ibu<input name="nik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={mother.nik ?? ''} /></label><label>Tanggal lahir<input name="birthDate" type="date" defaultValue={mother.birth_date ?? ''} /></label><label>Nama suami<input name="husbandName" defaultValue={mother.husband_name ?? ''} /></label><label>NIK suami<input name="husbandNik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={mother.husband_nik ?? ''} /></label><label>No. HP ibu/keluarga<input name="phoneNumber" type="tel" defaultValue={mother.phone_number ?? ''} /></label><label>Usia kehamilan (minggu)<input name="gestationalWeeks" type="number" min="0.1" step="0.1" defaultValue={mother.gestational_age_weeks ?? ''} /></label><button type="submit">Simpan perubahan</button></form>
      <div><form action={addPregnancyVisit} className="card stacked-form"><h2>Catat kunjungan baru</h2><input type="hidden" name="pregnantMotherId" value={id} /><label>Tanggal kunjungan<input name="visitedAt" type="date" required /></label><label>BB (kg)<input name="weight" type="number" min="0.01" step="0.01" /></label><label>TB (cm)<input name="height" type="number" min="0.01" step="0.01" /></label><label>Tekanan darah (mmHg)<input name="bloodPressure" placeholder="Contoh: 110/70" /></label><label>LiLA (cm)<input name="lila" type="number" min="0.01" step="0.01" /></label><label>Catatan petugas<AutoResizeTextarea name="notes" rows={4} /></label><button type="submit">Simpan sebagai riwayat baru</button></form><section className="card history-card"><h2>Riwayat kunjungan</h2>{visits.length === 0 ? <div className="empty">Belum ada riwayat kunjungan.</div> : <div className="data-list">{visits.map((visit) => <div className="data-row" key={visit.id}><strong>{formatDate(visit.visited_at)}</strong><span>{visit.officer_notes || 'Tanpa catatan'}</span></div>)}</div>}</section>{profile.role === 'BIDAN' && <form action={softDeletePregnantMother} className="delete-form"><input type="hidden" name="id" value={id} /><button className="danger" type="submit">Hapus data (soft delete)</button></form>}</div>
    </section></main>;
}
