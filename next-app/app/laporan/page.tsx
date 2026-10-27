import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import { requireActiveProfile } from '@/lib/auth';
import { loadReportRows, normalizeReportFilters } from '@/lib/reports';

type Props = { searchParams: Promise<{ category?: string; posyandu?: string; start?: string; end?: string }> };
type Posyandu = { id: string; name: string };

export default async function ReportsPage({ searchParams }: Props) {
  const { profile, supabase } = await requireActiveProfile();
  const filters = normalizeReportFilters(await searchParams);
  const [{ data: posyanduData }, report] = await Promise.all([
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    loadReportRows(supabase, filters),
  ]);
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const exportQuery = new URLSearchParams({ category: filters.category, start: filters.startDate, end: filters.endDate });
  if (filters.posyanduId) exportQuery.set('posyandu', filters.posyanduId);
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T00:00:00+07:00`));

  return <main className="admin-page report-page"><header className="admin-header"><div><p className="eyebrow">Rekap data</p><h1>Laporan Monitoring</h1><p>Hasil laporan mengikuti filter dan hak akses Posyandu akun Anda.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link className="active" href="/laporan">Laporan</Link><Link href="/akun">Akun</Link></nav>
    <section className="card"><form className="report-filters" method="get">
      <label>Kategori<select name="category" defaultValue={filters.category}><option value="balita">Bayi &amp; Balita</option><option value="ibu-hamil">Ibu Hamil</option><option value="lansia">Lansia</option></select></label>
      <label>Posyandu<select name="posyandu" defaultValue={filters.posyanduId}><option value="">Semua Posyandu yang dapat diakses</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Tanggal awal<input name="start" type="date" defaultValue={filters.startDate} required /></label>
      <label>Tanggal akhir<input name="end" type="date" defaultValue={filters.endDate} required /></label>
      <button type="submit">Tampilkan</button>
    </form></section>
    {report.error && <div className="form-error" role="alert">{report.error}</div>}
    <section className="card report-results"><div className="list-heading"><div><h2>Hasil laporan</h2><p className="muted-copy">{report.rows.length} catatan ditemukan</p></div><div className="export-actions"><a className="secondary" href={`/api/laporan/csv?${exportQuery}`}>Unduh CSV</a><a href={`/api/laporan/pdf?${exportQuery}`}>Unduh PDF</a></div></div>
      {report.rows.length === 0 ? <div className="empty">Tidak ada data pada periode dan filter yang dipilih.</div> : <div className="table-scroll"><table className="report-table"><thead><tr><th>Tanggal</th><th>Nama</th><th>Posyandu</th><th>Hasil</th><th>Catatan</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id}><td>{formatDate(row.date)}</td><td><strong>{row.name}</strong><span>{row.category}</span></td><td>{row.posyandu}</td><td>{row.result}</td><td>{row.notes}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
