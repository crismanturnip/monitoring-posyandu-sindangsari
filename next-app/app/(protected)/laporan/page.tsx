import { requireActiveProfile } from '@/lib/auth';
import Link from 'next/link';
import { loadReportAvailability, loadReportRows, normalizeReportFilters } from '@/lib/reports';
import { PageHero } from '@/components/page-hero';
import { ReportFiltersForm } from '@/components/report-filters';

type Props = { searchParams: Promise<{ category?: string; period?: string; posyandu?: string; start?: string; end?: string }> };
type Posyandu = { id: string; name: string };

export default async function ReportsPage({ searchParams }: Props) {
  const { profile, supabase } = await requireActiveProfile();
  const filters = normalizeReportFilters(await searchParams);
  const [{ data: posyanduData }, report] = await Promise.all([
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    loadReportRows(supabase, filters),
  ]);
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const availability = !report.error && report.rows.length === 0 ? await loadReportAvailability(supabase, filters) : null;
  const exportQuery = new URLSearchParams({ category: filters.category, period: filters.period, start: filters.startDate, end: filters.endDate });
  if (filters.posyanduId) exportQuery.set('posyandu', filters.posyanduId);
  const availableQuery = new URLSearchParams(exportQuery);
  if (availability?.startDate && availability.endDate) {
    availableQuery.set('period', 'custom');
    availableQuery.set('start', availability.startDate);
    availableQuery.set('end', availability.endDate);
  }
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T00:00:00+07:00`));

  return <div className="stitch-dashboard">
    <PageHero profile={profile} pageTitle="Laporan Monitoring" pageDescription="Rekap dan ekspor data hasil monitoring kesehatan balita, ibu hamil, dan lansia." />
    <main className="stitch-content laporan-content report-page">
    <section className="card"><ReportFiltersForm key={`${filters.category}:${filters.posyanduId}:${filters.period}:${filters.startDate}:${filters.endDate}`} filters={filters} posyandu={posyandu} /><p className="muted-copy">Rentang dihitung mundur dari tanggal akhir, termasuk tanggal tersebut. Periode mengikuti tanggal pengukuran atau pemeriksaan. Setelah mengubah filter, klik Tampilkan sebelum mengunduh.</p></section>
    {report.error && <div className="form-error" role="alert">{report.error}</div>}
    {availability?.error && <div className="form-error" role="alert">{availability.error}</div>}
    <section className="card report-results"><div className="list-heading"><div><h2>Hasil laporan</h2><p className="muted-copy">{report.rows.length} catatan ditemukan</p></div>{report.rows.length > 0 && <div className="export-actions"><a className="secondary" href={`/api/laporan/excel?${exportQuery}`}>Unduh Excel</a><a href={`/api/laporan/pdf?${exportQuery}`}>Unduh PDF</a></div>}</div>
      {report.rows.length === 0 ? <div className="empty">
        {report.error || availability?.error ? <p>Laporan belum dapat ditampilkan. Periksa pesan kesalahan di atas.</p>
          : availability && availability.count > 0 && availability.startDate && availability.endDate ? <div>
            <p>Tidak ada catatan pada periode {formatDate(filters.startDate)} sampai {formatDate(filters.endDate)}.</p>
            <p>Ada {availability.count} catatan pada kategori dan Posyandu yang dipilih, dengan tanggal pemeriksaan {formatDate(availability.startDate)} sampai {formatDate(availability.endDate)}.</p>
            <Link className="ghost-btn" href={`/laporan?${availableQuery}`}>Tampilkan periode seluruh riwayat</Link>
          </div> : <div>
            <p>Belum ada riwayat pengukuran atau pemeriksaan yang dapat diakses pada kategori dan Posyandu ini.</p>
            <p>Periksa kategori dan Posyandu, serta pastikan catatan sudah muncul di riwayat warga setelah disimpan.</p>
          </div>}
        <p>Unduhan tersedia setelah hasil laporan berisi data.</p>
      </div> : <div className="table-scroll"><table className="report-table"><thead><tr><th>Tanggal</th><th>Nama</th><th>Posyandu</th><th>Hasil</th><th>Catatan</th></tr></thead><tbody>{report.rows.map((row) => <tr key={`${row.category}:${row.id}`}><td>{formatDate(row.date)}</td><td><strong>{row.name}</strong><span>{row.category}</span></td><td>{row.posyandu}</td><td>{row.result}</td><td>{row.notes}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
</div>;
}
