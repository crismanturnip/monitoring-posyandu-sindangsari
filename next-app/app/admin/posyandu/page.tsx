import Link from 'next/link';
import { requireBidan } from '@/lib/auth';
import { createPosyandu, togglePosyandu } from './actions';
import { LogoutButton } from '@/components/logout-button';

type Posyandu = { id: string; name: string; address: string | null; is_active: boolean };
type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function PosyanduPage({ searchParams }: PageProps) {
  const message = await searchParams;
  const { profile, supabase } = await requireBidan();
  const { data, error } = await supabase.from('posyandu').select('id, name, address, is_active').order('name');
  const posyandu = (data ?? []) as Posyandu[];

  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Administrasi bidan</p><h1>Data Posyandu</h1><p>Tambah, aktifkan, atau nonaktifkan Posyandu tanpa menghapus riwayat data.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link className="active" href="/admin/posyandu">Posyandu</Link><Link href="/admin/kader">Kader</Link></nav>
    {message.error && <div className="form-error" role="alert">{message.error}</div>}{message.success && <div className="form-success" role="status">{message.success}</div>}{error && <div className="form-error" role="alert">Daftar Posyandu gagal dimuat.</div>}
    <section className="admin-grid"><form action={createPosyandu} className="card stacked-form"><h2>Tambah Posyandu</h2><label>Nama Posyandu<input name="name" required minLength={2} placeholder="Contoh: Posyandu Melati" /></label><label>Alamat / lokasi utama<textarea name="address" rows={3} placeholder="Opsional" /></label><button type="submit">Simpan Posyandu</button></form>
      <section className="card"><h2>Daftar Posyandu</h2>{posyandu.length === 0 ? <div className="empty">Belum ada data Posyandu.</div> : <div className="data-list">{posyandu.map((item) => <div className="data-row" key={item.id}><div><strong>{item.name}</strong><span>{item.address || 'Alamat belum diisi'}</span></div><form action={togglePosyandu}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="nextStatus" value={String(!item.is_active)} /><button className="secondary" type="submit">{item.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></form></div>)}</div>}</section>
    </section></main>;
}
