import Link from 'next/link';
import { BalitaCreateModal } from '@/components/balita-create-modal';
import { BalitaDeleteModal } from '@/components/balita-delete-modal';
import { BalitaEditModal } from '@/components/balita-edit-modal';
import { PageHero } from '@/components/page-hero';
import { requireActiveProfile } from '@/lib/auth';
import { childRegisterGroup } from '@/lib/child-register';
import { reportAge, reportAgeParts } from '@/lib/report-age';
import { jakartaDate } from '@/lib/health-record-dates';

export type ChildRegisterParams = { q?: string; posyandu?: string; usia?: string; page?: string };
type Props = { searchParams: Promise<ChildRegisterParams>; group: 'bayi' | 'balita' };
type Child = {
  id: string;
  name: string;
  nik: string | null;
  mother_name: string;
  mother_nik: string | null;
  father_name: string | null;
  father_nik: string | null;
  phone_number: string | null;
  gestational_age_weeks: number | null;
  birth_date: string;
  gender: string;
  birth_place: string | null;
  delivery_type: string | null;
  birth_weight_kg: number | null;
  birth_length_cm: number | null;
  posyandu_id: string;
  kms_status: string | null;
  posyandu: { name: string } | null;
};
type Posyandu = { id: string; name: string };
type Measurement = { child_id: string; measured_at: string; created_at: string; weight_kg: number; height_cm: number; officer_notes: string | null };


const getGenderLabel = (gender: string) => (gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan');

const getStatusLabel = (kmsStatus: string | null) => {
  if (kmsStatus === 'GIZI_BAIK') return 'Gizi Baik';
  if (kmsStatus === 'PERLU_PANTAUAN') return 'Perlu Pantauan';
  return 'Belum diisi';
};

export async function ChildRegisterPage({ searchParams, group }: Props) {
  const { q = '', posyandu: posyanduFilter = 'semua', usia: usiaFilter = 'semua', page: requestedPage = '1' } = await searchParams;
  const label = group === 'bayi' ? 'Bayi' : 'Balita';
  const basePath = `/${group}`;
  const today = jakartaDate();
  const { profile, supabase } = await requireActiveProfile();

  const loadChildren = async () => {
    const rows: Child[] = [];
    while (true) {
      const { data, count, error } = await supabase.from('children')
        .select('id, name, nik, mother_name, mother_nik, father_name, father_nik, phone_number, gestational_age_weeks, birth_date, gender, birth_place, delivery_type, birth_weight_kg, birth_length_cm, posyandu_id, kms_status, posyandu!children_posyandu_id_fkey(name)', { count: 'exact' })
        .is('deleted_at', null)
        .order('name').order('id')
        .range(rows.length, rows.length + 499);
      if (error) throw new Error(`Gagal memuat data anak: ${error.message}`);
      if (!data?.length) {
        if (count && rows.length < count) throw new Error('Data anak belum termuat lengkap. Silakan muat ulang halaman.');
        break;
      }
      rows.push(...data as unknown as Child[]);
      if (count === null ? data.length < 500 : rows.length >= count) break;
    }
    return rows;
  };

  const [childrenData, { data: posyanduData, error: posyanduError }] = await Promise.all([
    loadChildren(),
    supabase.from('posyandu').select('id, name').order('name'),
  ]);
  if (posyanduError) throw new Error(`Gagal memuat Posyandu: ${posyanduError.message}`);

  const children = childrenData.filter(child => childRegisterGroup(child.birth_date, today) === group);
  const posyandu = (posyanduData ?? []) as Posyandu[];

  const normalizedQuery = q.trim().toLocaleLowerCase('id-ID');
  const filteredChildren = children.filter((child) => {
    const matchesSearch = !normalizedQuery ||
      child.name.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
      child.mother_name.toLocaleLowerCase('id-ID').includes(normalizedQuery);
    const matchesPosyandu = posyanduFilter === 'semua' || child.posyandu?.name === posyanduFilter;
    const ageMonths = reportAgeParts(child.birth_date, today)?.months ?? 0;
    const matchesUsia = usiaFilter === 'semua' ||
      (usiaFilter === '0-6' && ageMonths < 6) ||
      (usiaFilter === '6-12' && ageMonths >= 6 && ageMonths < 12) ||
      (usiaFilter === '12-24' && ageMonths >= 12 && ageMonths < 24) ||
      (usiaFilter === '24+' && ageMonths >= 24);
    return matchesSearch && matchesPosyandu && matchesUsia;
  });

  const totalBalita = filteredChildren.length;
  const sehat = filteredChildren.filter((child) => child.kms_status === 'GIZI_BAIK').length;
  const pantau = filteredChildren.filter((child) => child.kms_status === 'PERLU_PANTAUAN').length;
  const sasaranTimbang = totalBalita;
  const totalPages = Math.max(1, Math.ceil(totalBalita / 8));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(requestedPage, 10) || 1));
  const from = (page - 1) * 8;
  const tableRows = filteredChildren.slice(from, from + 8);
  const pageHref = (target: number) => {
    const search = new URLSearchParams({ q, posyandu: posyanduFilter, usia: usiaFilter, page: String(target) });
    return basePath + '?' + search;
  };
  const { data: measurementData, error: measurementError } = tableRows.length
    ? await supabase
      .from('child_measurements')
      .select('child_id, measured_at, created_at, weight_kg, height_cm, officer_notes')
      .in('child_id', tableRows.map((child) => child.id))
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false })
    : { data: [], error: null };
  if (measurementError) throw new Error(`Gagal memuat pengukuran balita: ${measurementError.message}`);
  const latestMeasurementByChild = new Map<string, Measurement>();
  for (const measurement of (measurementData ?? []) as Measurement[]) {
    if (!latestMeasurementByChild.has(measurement.child_id)) {
      latestMeasurementByChild.set(measurement.child_id, measurement);
    }
  }

  return (
    <div className="stitch-dashboard">
      <PageHero
        profile={profile}
        pageTitle={`Data ${label}`}
        pageDescription={group === 'bayi' ? 'Pencatatan kesehatan bayi sejak lahir hingga sebelum usia 1 tahun.' : 'Pencatatan kesehatan balita mulai usia 1 tahun, penimbangan, dan pemantauan status gizi.'}
      />
      <main className="stitch-content balita-content">
        <div className="balita-topbar">
          <BalitaCreateModal posyandu={posyandu} group={group} />
        </div>

        <div className="balita-stats-grid">
          <article className="balita-stat-card stat-total">
            <div className="balita-stat-header">
              <span className="balita-stat-label">Total {label}</span>
              <span className="balita-stat-icon teal" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 14c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </span>
            </div>
            <div className="balita-stat-value">{totalBalita}</div>
            <div className="balita-stat-footer">
              <span className="balita-chip"><i />{totalBalita} Terdaftar</span>
              <span className="balita-stat-note">Terdata di Register</span>
            </div>
          </article>

          <article className="balita-stat-card stat-good">
            <div className="balita-stat-header">
              <span className="balita-stat-label">Status Gizi Baik</span>
              <span className="balita-stat-icon teal" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 14c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </span>
            </div>
            <div className="balita-stat-value">{sehat}</div>
            <div className="balita-stat-footer">
              <span className="balita-chip chip-success"><i />{totalBalita ? Math.round((sehat / totalBalita) * 100) : 0}% Normal</span>
              <span className="balita-stat-note">Zona Hijau KMS</span>
            </div>
          </article>

          <article className="balita-stat-card stat-watch">
            <div className="balita-stat-header">
              <span className="balita-stat-label">Perlu Pantauan</span>
              <span className="balita-stat-icon amber" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 21 20H3L12 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
              </span>
            </div>
            <div className="balita-stat-value">{pantau}</div>
            <div className="balita-stat-footer">
              <span className="balita-chip chip-warning"><i />{pantau} {label}</span>
              <span className="balita-stat-note">Garis Kuning/Merah</span>
            </div>
          </article>

          <article className="balita-stat-card stat-target">
            <div className="balita-stat-header">
              <span className="balita-stat-label">Sasaran Timbang</span>
              <span className="balita-stat-icon blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14l-5.3 6.1v4.1l-3.4 1.7v-5.8L5 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M12 16.9v2.6m-2.2-1.1L12 16l2.2 2.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
            <div className="balita-stat-value">{sasaranTimbang}</div>
            <div className="balita-stat-footer">
              <span className="balita-chip chip-info"><i />{sasaranTimbang ? '100% Tercapai' : '0% Tercapai'}</span>
              <span className="balita-stat-note">{new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date())}</span>
            </div>
          </article>
        </div>

        <form className="balita-toolbar" action={basePath} method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={`Cari nama ${label.toLowerCase()} atau nama ibu...`}
            aria-label={`Cari nama ${label.toLowerCase()} atau nama ibu`}
            className="balita-search"
          />

          <select name="posyandu" defaultValue={posyanduFilter} className="balita-select" aria-label="Filter Posyandu">
            <option value="semua">Semua Posyandu</option>
            {posyandu.map((item) => (
              <option value={item.name} key={item.id}>{item.name}</option>
            ))}
          </select>

          <select name="usia" defaultValue={usiaFilter} className="balita-select" aria-label={`Filter usia ${label.toLowerCase()}`}>
            <option value="semua">Semua Kategori Usia</option>
            {group === 'bayi' ? <>
              <option value="0-6">Di bawah 6 bulan</option>
              <option value="6-12">6 hingga 11 bulan</option>
            </> : <>
              <option value="12-24">1 hingga sebelum 2 tahun</option>
              <option value="24+">2 tahun ke atas</option>
            </>}
          </select>

          <button type="submit" className="balita-filter-btn">Cari</button>
        </form>

        <div className="balita-table-card">
          {tableRows.length === 0 ? (
            <div className="balita-empty-state">Belum ada data {label.toLowerCase()} pada Posyandu yang dapat Anda akses.</div>
          ) : (
            <div className="balita-table-wrap horizontal-data-scroll" role="region" aria-label={`Tabel ${label.toLowerCase()}, geser untuk melihat kolom lainnya`} tabIndex={0}>
              <table className="balita-table" aria-label={`Daftar ${label.toLowerCase()}`}>
                <thead>
                  <tr>
                    <th scope="col">Nama {label}</th>
                    <th scope="col">Jenis Kelamin</th>
                    <th scope="col">Umur</th>
                    <th scope="col">Nama Ibu</th>
                    <th scope="col">Posyandu</th>
                    <th scope="col">{group === 'bayi' ? 'Berat Badan Lahir (kg)' : 'BB (kg)'}</th>
                    <th scope="col">{group === 'bayi' ? 'Panjang Badan Lahir (cm)' : 'TB (cm)'}</th>
                    <th scope="col">Status Gizi KMS</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((child) => {
                    const ageMonths = reportAgeParts(child.birth_date, today)?.months ?? 0;
                    const measurement = latestMeasurementByChild.get(child.id);
                    return (
                      <tr key={child.id}>
                        <td className="balita-name-cell" data-label="Balita">
                          <span className="balita-child-name">{child.name}</span>
                        </td>
                        <td>{getGenderLabel(child.gender)}</td>
                        <td className="balita-age-cell">{reportAge(child.birth_date, today)}</td>
                        <td data-label="Nama Ibu">{child.mother_name}</td>
                        <td data-label="Posyandu">{child.posyandu?.name ?? 'Posyandu'}</td>
                        <td className="balita-measurement">{group === 'bayi' ? child.birth_weight_kg ?? 'Belum dicatat' : measurement?.weight_kg ?? 'Belum diukur'}</td>
                        <td className="balita-measurement">{group === 'bayi' ? child.birth_length_cm ?? 'Belum dicatat' : measurement?.height_cm ?? 'Belum diukur'}</td>
                        <td data-label="Status Gizi KMS">
                          <span className="balita-kms-text">{getStatusLabel(child.kms_status)}</span>
                        </td>
                        <td className="balita-actions" data-label="Aksi">
                          <BalitaEditModal
                            child={child}
                            posyandu={posyandu}
                            measurement={measurement ?? null}
                            group={group}
                          />
                          <Link href={`${basePath}/${child.id}`} className="balita-action-btn" aria-label="Lihat detail">↗</Link>
                          <BalitaDeleteModal child={child} ageMonths={ageMonths} group={group} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="balita-pagination">
          <span>Menampilkan {totalBalita ? from + 1 : 0}–{from + tableRows.length} dari {totalBalita} data {label.toLowerCase()} terdaftar</span>
          <div className="balita-pagination-actions">
            {page > 1 ? <Link className="balita-page-btn" href={pageHref(page - 1)}>Sebelumnya</Link> : <span className="balita-page-btn disabled">Sebelumnya</span>}
            <span className="balita-page-btn active">{page} / {totalPages}</span>
            {page < totalPages ? <Link className="balita-page-btn" href={pageHref(page + 1)}>Selanjutnya</Link> : <span className="balita-page-btn disabled">Selanjutnya</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
