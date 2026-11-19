'use client';

import { useEffect, useRef, useState } from 'react';
import { updateChildFromModal } from '@/app/(protected)/balita/actions';
import { ChildReportIdentityFields } from '@/components/child-report-fields';

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
  posyandu_id: string;
  kms_status: string | null;
};
type Posyandu = { id: string; name: string };

export function BalitaEditModal({
  child,
  posyandu,
  group = 'balita',
}: {
  child: Child;
  posyandu: Posyandu[];
  measurement?: unknown;
  group?: 'bayi' | 'balita';
}) {
  const label = group === 'bayi' ? 'Bayi' : 'Balita';
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        className="balita-action-btn edit"
        aria-label={`Edit data ${child.name}`}
        onClick={() => setIsOpen(true)}
      >
        ✎
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
            className="balita-create-modal balita-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`balita-edit-title-${child.id}`}
            tabIndex={-1}
          >
            <header className="balita-modal-header">
              <span className="balita-modal-icon" aria-hidden="true">☷</span>
              <div className="balita-modal-heading">
                <h2 id={`balita-edit-title-${child.id}`}>Edit Data {label}</h2>
                <p>Perbarui informasi data {label.toLowerCase()} dan orang tua</p>
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

            <form action={updateChildFromModal} className="balita-modal-form">
              <input type="hidden" name="id" value={child.id} />
              <input type="hidden" name="returnPath" value={`/${group}`} />
              <div className="balita-edit-fields">
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Lengkap {label} <span>*</span></span>
                  <input name="name" required defaultValue={child.name} />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">NIK {label} <span>*</span></span>
                  <input name="nik" type="text" inputMode="numeric" pattern="[0-9]{16}" minLength={16} maxLength={16} required defaultValue={child.nik ?? ''} placeholder="16 digit NIK" title="NIK harus terdiri dari 16 digit angka" />
                </label>

                <label className="balita-modal-field">
                  <span className="balita-modal-label">Tanggal Lahir <span>*</span></span>
                  <input name="birthDate" type="date" required defaultValue={child.birth_date} />
                </label>

                <fieldset className="balita-modal-field balita-gender-field">
                  <legend>Jenis Kelamin <span>*</span></legend>
                  <div className="balita-gender-options">
                    <label className="balita-gender-option">
                      <input type="radio" name="gender" value="LAKI_LAKI" required defaultChecked={child.gender === 'LAKI_LAKI'} />
                      <span aria-hidden="true">♂</span> Laki-laki
                    </label>
                    <label className="balita-gender-option">
                      <input type="radio" name="gender" value="PEREMPUAN" required defaultChecked={child.gender === 'PEREMPUAN'} />
                      <span aria-hidden="true">♀</span> Perempuan
                    </label>
                  </div>
                </fieldset>

                <label className="balita-modal-field">
                  <span className="balita-modal-label">Tempat Lahir <span>*</span></span>
                  <input name="birthPlace" required defaultValue={child.birth_place ?? ''} />
                </label>
                <label className="balita-modal-field">
                  <span className="balita-modal-label">Jenis Persalinan</span>
                  <select name="deliveryType" defaultValue={child.delivery_type ?? ''}>
                    <option value="">Belum dicatat</option>
                    <option value="Normal">Normal</option>
                    <option value="Operasi Caesar">Operasi Caesar</option>
                    <option value="Vakum">Vakum</option>
                    <option value="Forsep">Forsep</option>
                  </select>
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Ibu Kandung <span>*</span></span>
                  <input name="motherName" required defaultValue={child.mother_name} />
                </label>
                <ChildReportIdentityFields child={child} group={group} />

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Posyandu Binaan <span>*</span></span>
                  <select name="posyanduId" required defaultValue={child.posyandu_id}>
                    <option value="" disabled>Pilih Posyandu</option>
                    {posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Status Gizi KMS</span>
                  <select name="kmsStatus" defaultValue={child.kms_status ?? 'NONE'}>
                    <option value="NONE">Belum diisi</option>
                    <option value="GIZI_BAIK">Gizi Baik</option>
                    <option value="PERLU_PANTAUAN">Perlu Pantauan</option>
                  </select>
                </label>


              </div>


              <footer className="balita-modal-footer">
                <button type="button" className="balita-modal-cancel" onClick={() => setIsOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="balita-modal-submit">
                  <span aria-hidden="true">✓</span> Simpan Perubahan
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
