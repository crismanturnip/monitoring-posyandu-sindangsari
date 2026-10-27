import Link from 'next/link';
import { requireBidan } from '@/lib/auth';
import { approveKader, rejectKader } from './actions';
import { LogoutButton } from '@/components/logout-button';

type Profile = { id: string; full_name: string; created_at: string };
type Posyandu = { id: string; name: string };

export default async function KaderPage() {
  const { profile, supabase } = await requireBidan();
  const [{ data: pendingData }, { data: posyanduData }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, created_at').eq('role', 'KADER').eq('account_status', 'PENDING').order('created_at'),
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
  ]);
  const pending = (pendingData ?? []) as Profile[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Administrasi bidan</p><h1>Persetujuan Kader</h1><p>Tetapkan Posyandu saat menyetujui akun kader.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link href="/admin/posyandu">Posyandu</Link><Link className="active" href="/admin/kader">Kader</Link></nav>
    <section className="card"><h2>Menunggu persetujuan</h2>{pending.length === 0 ? <div className="empty">Tidak ada registrasi kader yang menunggu.</div> : <div className="data-list">{pending.map((kader) => <div className="approval-row" key={kader.id}><div><strong>{kader.full_name}</strong><span>Terdaftar {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(kader.created_at))}</span></div><div className="approval-actions"><form action={approveKader}><input type="hidden" name="kaderId" value={kader.id} /><select name="posyanduId" required defaultValue=""><option value="" disabled>Pilih Posyandu</option>{posyandu.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button type="submit" disabled={posyandu.length === 0}>Setujui</button></form><form action={rejectKader}><input type="hidden" name="kaderId" value={kader.id} /><input name="reason" required placeholder="Alasan penolakan" /><button className="danger" type="submit">Tolak</button></form></div></div>)}</div>}</section>
  </main>;
}
