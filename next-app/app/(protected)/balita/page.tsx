import Link from 'next/link';
import { BalitaCreateModal } from '@/components/balita-create-modal';
import { BalitaDeleteModal } from '@/components/balita-delete-modal';
import { BalitaEditModal } from '@/components/balita-edit-modal';
import { PageHero } from '@/components/page-hero';
import { requireActiveProfile } from '@/lib/auth';

type Props = { searchParams: Promise<{ q?: string; posyandu?: string; usia?: string }> };
type Child = {
  id: string;
  name: string;
  nik: string | null;
  mother_name: string;
  birth_date: string;
  gender: string;
  birth_place: string | null;
  delivery_type: string | null;
  posyandu_id: string;
  kms_status: string | null;
  posyandu: { name: string } | null;
};
type Posyandu = { id: string; name: string };
type Measurement = { child_id: string; measured_at: string; created_at: string; weight_kg: number; height_cm: number; officer_notes: string | null };

const getAgeInMonths = (birthDate: string) => {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const diffMs = Date.now() - birth.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)));
};

const getGenderLabel = (gender: string) => (gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan');

const getStatusLabel = (kmsStatus: string | null) => {
  if (kmsStatus === 'GIZI_BAIK') return 'Gizi Baik';
  if (kmsStatus === 'PERLU_PANTAUAN') return 'Perlu Pantauan';
  return 'Belum diisi';
};

export default async function BalitaPage({ searchParams }: Props) {
  const { q = '', posyandu: posyanduFilter = 'semua', usia: usiaFilter = 'semua' } = await searchParams;
  const { profile, supabase } = await requireActiveProfile();

  const childQuery = supabase.from('children')
    .select('id, name, nik, mother_name, birth_date, gender, birth_place, delivery_type, posyandu_id, kms_status, posyandu(name)')
    .is('deleted_at', null)
    .order('name');

  const [{ data: childrenData }, { data: posyanduData }] = await Promise.all([
    childQuery,
    supabase.from('posyandu').select('id, name').order('name'),
  ]);

  const children = (childrenData ?? []) as unknown as Child[];
  const posyandu = (posyanduData ?? []) as Posyandu[];

  const normalizedQuery = q.trim().toLocaleLowerCase('id-ID');
  const filteredChildren = children.filter((child) => {
    const matchesSearch = !normalizedQuery ||
      child.name.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
      child.mother_name.toLocaleLowerCase('id-ID').includes(normalizedQuery);
    const matchesPosyandu = posyanduFilter === 'semua' || child.posyandu?.name === posyanduFilter;
    const ageMonths = getAgeInMonths(child.birth_date);
    const matchesUsia = usiaFilter === 'semua' ||
      (usiaFilter === '0-12' && ageMonths <= 12) ||
      (usiaFilter === '12-24' && ageMonths > 12 && ageMonths <= 24) ||
      (usiaFilter === '24+' && ageMonths > 24);
    return matchesSearch && matchesPosyandu && matchesUsia;
  });

  const totalBalita = filteredChildren.length;
  const sehat = filteredChildren.filter((child) => child.kms_status === 'GIZI_BAIK').length;
  const pantau = filteredChildren.filter((child) => child.kms_status === 'PERLU_PANTAUAN').length;
  const sasaranTimbang = totalBalita;
  const tableRows = filteredChildren.slice(0, 8);
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
        pageTitle="Data Bayi & Balita"
        pageDescription="Pencatatan data antropometri, penimbangan bulanan, status gizi, dan pemantauan kurva KMS balita di wilayah kerja Desa Sindang Sari."
      />
      <main className="balita-page-shell balita-page-wrap">
        <div className="balita-topbar">
          <BalitaCreateModal posyandu={posyandu} />
        </div>

        <div className="balita-stats-grid">
          <article className="balita-stat-card stat-total">
            <div className="balita-stat-header">
              <span className="balita-stat-label">Total Balita</span>
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
              <span className="balita-chip chip-warning"><i />{pantau} Balita</span>
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

        <form className="balita-toolbar" action="/balita" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama balita atau nama ibu..."
            aria-label="Cari nama balita atau nama ibu"
            className="balita-search"
          />

          <select name="posyandu" defaultValue={posyanduFilter} className="balita-select" aria-label="Filter Posyandu">
            <option value="semua">Semua Posyandu</option>
            {posyandu.map((item) => (
              <option value={item.name} key={item.id}>{item.name}</option>
            ))}
          </select>

          <select name="usia" defaultValue={usiaFilter} className="balita-select" aria-label="Filter usia balita">
            <option value="semua">Semua Kategori Usia</option>
            <option value="0-12">0 - 12 bulan</option>
            <option value="12-24">12 - 24 bulan</option>
            <option value="24+">24 bulan ke atas</option>
          </select>

          <button type="submit" className="balita-filter-btn">Cari</button>
        </form>

        <div className="balita-table-card">
          {tableRows.length === 0 ? (
            <div className="balita-empty-state">Belum ada data bayi/balita pada Posyandu yang dapat Anda akses.</div>
          ) : (
            <div className="balita-table-wrap">
              <table className="balita-table">
                <thead>
                  <tr>
                    <th>Nama Balita</th>
                    <th>JK &amp; Usia</th>
                    <th>Nama Ibu</th>
                    <th>Posyandu</th>
                    <th>BB / TB</th>
                    <th>Status Gizi KMS</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((child) => {
                    const ageMonths = getAgeInMonths(child.birth_date);
                    const measurement = latestMeasurementByChild.get(child.id);
                    return (
                      <tr key={child.id}>
                        <td className="balita-name-cell" data-label="Balita">
                          <span className="balita-child-name">{child.name}</span>
                        </td>
                        <td className="balita-minor-cell" data-label="JK &amp; Usia">
                          <div className="balita-gender-stack">
                            <span className="balita-gender">{getGenderLabel(child.gender)}</span>
                            <span className="balita-age">{ageMonths} bulan</span>
                          </div>
                        </td>
                        <td data-label="Nama Ibu">{child.mother_name}</td>
                        <td data-label="Posyandu">{child.posyandu?.name ?? 'Posyandu'}</td>
                        <td className="balita-measurement" data-label="BB / TB">
                          {measurement ? `${measurement.weight_kg} kg / ${measurement.height_cm} cm` : 'Belum diukur'}
                        </td>
                        <td data-label="Status Gizi KMS">
                          <span className="balita-kms-text">{getStatusLabel(child.kms_status)}</span>
                        </td>
                        <td className="balita-actions" data-label="Aksi">
                          <BalitaEditModal
                            child={child}
                            posyandu={posyandu}
                            measurement={measurement ?? null}
                          />
                          <Link href={`/balita/${child.id}`} className="balita-action-btn" aria-label="Lihat detail">↗</Link>
                          {profile.role === 'BIDAN' && (
                            <BalitaDeleteModal child={child} ageMonths={ageMonths} />
                          )}
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
          <span>Menampilkan {Math.min(tableRows.length, totalBalita || 0)} dari {totalBalita || 0} data balita terdaftar</span>
          <div className="balita-pagination-actions">
            <button type="button" className="balita-page-btn disabled">Sebelumnya</button>
            <button type="button" className="balita-page-btn active">1</button>
            <button type="button" className="balita-page-btn">Selanjutnya</button>
          </div>
        </div>
      </main>
    </div>
  );
}
