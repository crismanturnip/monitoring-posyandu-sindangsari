import { requireBidan } from '@/lib/auth';
import { approveKader, editKaderProfile, rejectKader, rejectTransfer } from './actions';
import { PageHero } from '@/components/page-hero';

type Kader = { id: string; full_name: string; email: string | null; phone_number: string | null; account_status: string; requested_posyandu_id: string | null; email_confirmed_at: string | null; created_at: string };
type Posyandu = { id: string; name: string };
type Assignment = { kader_id: string; posyandu_id: string };
type Transfer = { id: string; kader_id: string; requested_posyandu_id: string; requested_at: string };

export default async function KaderPage() {
  const { profile, supabase } = await requireBidan();
  const [kaderResult, posyanduResult, assignmentResult, transferResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone_number, account_status, requested_posyandu_id, email_confirmed_at, created_at').eq('role', 'KADER').order('full_name'),
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    supabase.from('kader_assignments').select('kader_id, posyandu_id').is('ended_at', null),
    supabase.from('kader_transfer_requests').select('id, kader_id, requested_posyandu_id, requested_at').eq('status', 'PENDING').order('requested_at'),
  ]);
  const queryError = kaderResult.error ?? posyanduResult.error ?? assignmentResult.error ?? transferResult.error;
  const kader = (kaderResult.data ?? []) as Kader[];
  const posyandu = (posyanduResult.data ?? []) as Posyandu[];
  const assignments = (assignmentResult.data ?? []) as Assignment[];
  const transfers = (transferResult.data ?? []) as Transfer[];
  const pending = kader.filter(item => item.account_status === 'PENDING');
  const roster = kader.filter(item => item.account_status === 'ACTIVE');
  const nameOf = (id: string | null) => posyandu.find(item => item.id === id)?.name ?? 'Belum tersedia';
  const assignedId = (id: string) => assignments.find(item => item.kader_id === id)?.posyandu_id ?? '';

  return <div className="stitch-dashboard">
    <PageHero compact profile={profile} pageTitle="Pengaturan" pageDescription="Kelola persetujuan akun, penugasan kader, dan permintaan pindah Posyandu." />
    <main className="stitch-content kader-content settings-content">
      {queryError && <p className="form-error" role="alert">Data pengaturan belum dapat dimuat: {queryError.message}</p>}
      <section className="card">
        <h2>Persetujuan akun kader</h2>
        {pending.length === 0 ? <p className="empty">Tidak ada akun yang menunggu.</p> : <div className="data-list">{pending.map(item => <div className="approval-row" key={item.id}>
          <div><strong>{item.full_name}</strong><span>{item.email ?? 'Email belum tersedia'} · Memilih {nameOf(item.requested_posyandu_id)}</span><span>{item.email_confirmed_at ? 'Email terverifikasi' : 'Menunggu verifikasi email'}</span></div>
          <div className="approval-actions">
            <form action={approveKader}><input type="hidden" name="kaderId" value={item.id} /><label className="approval-field">Tetapkan Posyandu<select name="posyanduId" defaultValue={item.requested_posyandu_id ?? ''} required><option value="" disabled>Pilih Posyandu</option>{posyandu.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="submit" disabled={!item.email_confirmed_at}>Setujui</button></form>
            <form action={rejectKader}><input type="hidden" name="kaderId" value={item.id} /><label className="approval-field">Alasan penolakan<input name="reason" required placeholder="Tuliskan alasan" /></label><button className="danger" type="submit">Tolak</button></form>
          </div>
        </div>)}</div>}
      </section>
      <section className="card">
        <h2>Permintaan pindah Posyandu</h2>
        {transfers.length === 0 ? <p className="empty">Tidak ada permintaan pindah.</p> : <div className="data-list">{transfers.map(request => {
          const item = kader.find(person => person.id === request.kader_id);
          return <div className="approval-row" key={request.id}><div><strong>{item?.full_name ?? 'Kader'}</strong><span>{nameOf(assignedId(request.kader_id))} → {nameOf(request.requested_posyandu_id)}</span></div><div className="approval-actions">
            <form action={approveKader}><input type="hidden" name="kaderId" value={request.kader_id} /><input type="hidden" name="transferRequest" value={request.id} /><label className="approval-field">Posyandu tujuan<select name="posyanduId" defaultValue={request.requested_posyandu_id} required>{posyandu.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="submit">Setujui pindah</button></form>
            <form action={rejectTransfer}><input type="hidden" name="transferRequest" value={request.id} /><button className="danger" type="submit">Tolak</button></form>
          </div></div>;
        })}</div>}
      </section>
      <section className="card">
        <h2>Daftar kader</h2>
        {roster.length === 0 ? <p className="empty">Belum ada kader aktif.</p> : <div className="data-list">{roster.map(item => <div className="approval-row" key={item.id}>
          <div><strong>{item.full_name}</strong><span>{item.email ?? 'Email belum tersedia'}{item.phone_number ? ` · ${item.phone_number}` : ''}</span><span>Penugasan: {nameOf(assignedId(item.id))}</span></div>
          <div className="settings-kader-controls">
            <details><summary>Edit profil</summary><form action={editKaderProfile} className="settings-assignment-form"><input type="hidden" name="kaderId" value={item.id} /><label>Nama lengkap<input name="fullName" defaultValue={item.full_name} minLength={2} maxLength={100} required /></label><label>No. telepon<input name="phoneNumber" type="tel" defaultValue={item.phone_number ?? ''} /></label><button type="submit">Simpan profil</button></form></details>
            <form action={approveKader} className="settings-assignment-form"><input type="hidden" name="kaderId" value={item.id} /><label className="approval-field">Ubah penugasan<select name="posyanduId" defaultValue={assignedId(item.id)} required><option value="" disabled>Pilih Posyandu</option>{posyandu.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="submit">Simpan tugas</button></form>
          </div>
        </div>)}</div>}
      </section>
    </main>
  </div>;
}
