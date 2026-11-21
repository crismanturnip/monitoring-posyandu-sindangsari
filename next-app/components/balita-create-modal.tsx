'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createChild } from '@/app/(protected)/balita/actions';
import { jakartaDate } from '@/lib/health-record-dates';
import { ChildReportIdentityFields, ChildReportMeasurementFields } from '@/components/child-report-fields';

type Posyandu = { id: string; name: string };

export function BalitaCreateModal({ posyandu, group = 'balita' }: { posyandu: Posyandu[]; group?: 'bayi' | 'balita' }) {
  const label = group === 'bayi' ? 'Bayi' : 'Balita';
  const [isOpen, setIsOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const validateMeasurement = (event: FormEvent<HTMLFormElement>) => {
    const values = new FormData(event.currentTarget);
    const weight = String(values.get('weightKg') ?? '').trim();
    const height = String(values.get('heightCm') ?? '').trim();
    const extra = ['headCircumferenceCm', 'lilaCm', 'notes'].some(key => String(values.get(key) ?? '').trim());
    if (extra && !weight && !height) {
      event.preventDefault();
      setFormError('Isi berat dan tinggi badan untuk menyimpan hasil pemeriksaan.');
      return;
    }
    if ((weight || height) && (!weight || !height || !values.get('measuredAt'))) {
      event.preventDefault();
      setFormError('Isi tanggal pengukuran, berat dan tinggi badan bersama-sama, atau kosongkan kedua hasil pengukuran.');
    } else {
      setFormError('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="balita-add-btn"
        onClick={() => setIsOpen(true)}
      >
        + Tambah Data {label}
      </button>
      {isOpen && (
        <div
          className="balita-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="balita-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="balita-create-title"
            tabIndex={-1}
          >
            <header className="balita-modal-header">
              <span className="balita-modal-icon" aria-hidden="true">♙</span>
              <div className="balita-modal-heading">
                <h2 id="balita-create-title">Tambah Data {label} Baru</h2>
                <p>Masukkan identitas {label.toLowerCase()} dan data orang tua sesuai kartu keluarga / KMS</p>
              </div>
              <button
                type="button"
                className="balita-modal-close"
                aria-label="Tutup form"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </header>

            <form action={createChild} onSubmit={validateMeasurement} className="balita-modal-form">
              <input type="hidden" name="returnPath" value={`/${group}`} />
              <div className="balita-modal-fields">
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Lengkap {label} <span>*</span></span>
                  <input name="name" required placeholder="Nama lengkap anak" />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">NIK {label} {group === 'bayi' ? '(opsional)' : <span>*</span>}</span>
                  <input name="nik" type="text" inputMode="numeric" pattern="[0-9]{16}" minLength={16} maxLength={16} required={group !== 'bayi'} placeholder="16 digit NIK" title="NIK harus terdiri dari 16 digit angka" />
                </label>

                <label className="balita-modal-field balita-modal-date">
                  <span className="balita-modal-label">Tanggal Lahir <span>*</span></span>
                  <input name="birthDate" type="date" required />
                </label>

                <fieldset className="balita-modal-field balita-modal-gender balita-gender-field">
                  <legend>Jenis Kelamin <span>*</span></legend>
                  <div className="balita-gender-options">
                    <label className="balita-gender-option">
                      <input type="radio" name="gender" value="LAKI_LAKI" required />
                      <span aria-hidden="true">♂</span> Laki-laki
                    </label>
                    <label className="balita-gender-option">
                      <input type="radio" name="gender" value="PEREMPUAN" required />
                      <span aria-hidden="true">♀</span> Perempuan
                    </label>
                  </div>
                </fieldset>

                <label className="balita-modal-field balita-modal-birthplace">
                  <span className="balita-modal-label">Tempat Lahir <span>*</span></span>
                  <input name="birthPlace" required placeholder="Contoh: Bandung" />
                </label>
                <label className="balita-modal-field balita-modal-delivery">
                  <span className="balita-modal-label">Jenis Persalinan <span>*</span></span>
                  <select name="deliveryType" required defaultValue="">
                    <option value="" disabled>Pilih jenis persalinan</option>
                    <option value="Normal">Normal</option>
                    <option value="Operasi Caesar">Operasi Caesar</option>
                    <option value="Vakum">Vakum</option>
                    <option value="Forsep">Forsep</option>
                  </select>
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Ibu Kandung <span>*</span></span>
                  <input name="motherName" required placeholder="Nama lengkap ibu" />
                </label>
                <ChildReportIdentityFields group={group} />

                <div className="balita-measurement-row">
                  <label className="balita-modal-field balita-modal-posyandu">
                    <span className="balita-modal-label">Posyandu Binaan <span>*</span></span>
                    <select name="posyanduId" required defaultValue="">
                      <option value="" disabled>Pilih Posyandu</option>
                      {posyandu.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="balita-modal-field balita-modal-weight">
                    <span className="balita-modal-label">{group === 'bayi' ? 'Berat Badan Lahir (kg)' : 'Berat Badan (kg)'}</span>
                    <input name={group === 'bayi' ? 'birthWeight' : 'weightKg'} type="number" step="0.01" min="0.01" placeholder={group === 'bayi' ? 'Contoh: 3.2' : 'Contoh: 10.5'} aria-describedby="balita-initial-measurement-help" />
                  </label>
                  <label className="balita-modal-field balita-modal-height">
                    <span className="balita-modal-label">{group === 'bayi' ? 'Panjang Badan Lahir (cm)' : 'Tinggi Badan (cm)'}</span>
                    <input name={group === 'bayi' ? 'birthLength' : 'heightCm'} type="number" step="0.01" min="0.01" placeholder={group === 'bayi' ? 'Contoh: 49' : 'Contoh: 80'} aria-describedby="balita-initial-measurement-help" />
                  </label>
                </div>
                {group === 'balita' && <>
                  <label className="balita-modal-field full">
                    <span className="balita-modal-label">Tanggal pengukuran</span>
                    <input name="measuredAt" type="date" defaultValue={jakartaDate()} aria-describedby="balita-initial-measurement-help" />
                  </label>
                  <ChildReportMeasurementFields group={group} />
                  <label className="balita-modal-field full">
                    <span className="balita-modal-label">Catatan pemeriksaan</span>
                    <textarea name="notes" rows={2} />
                  </label>
                </>}
                <p id="balita-initial-measurement-help" className="balita-modal-field full muted-copy">
                  {group === 'bayi'
                    ? 'Berat dan panjang badan lahir disimpan sebagai data lahir bayi, bukan sebagai riwayat pengukuran.'
                    : 'Opsional. Isi BB, TB dan tanggal pengukuran untuk mencatat hasil ke laporan. Pendaftaran identitas saja belum masuk rekap pemeriksaan.'}
                </p>
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Status Gizi KMS <span>*</span></span>
                  <select name="kmsStatus" required defaultValue="NONE">
                    <option value="NONE">Belum diisi</option>
                    <option value="GIZI_BAIK">Gizi Baik</option>
                    <option value="PERLU_PANTAUAN">Perlu Pantauan</option>
                  </select>
                </label>
              </div>

              {formError && <p className="balita-modal-form-error" role="alert">{formError}</p>}
              <footer className="balita-modal-footer">
                <button type="button" className="balita-modal-cancel" onClick={() => setIsOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="balita-modal-submit" disabled={posyandu.length === 0}>
                  <span aria-hidden="true">✓</span> Simpan Data {label}
                </button>
              </footer>
              {posyandu.length === 0 && (
                <p className="balita-modal-empty">Belum ada Posyandu yang tersedia untuk dipilih.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
