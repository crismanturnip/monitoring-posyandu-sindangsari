'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { updateChildFromModal } from '@/app/(protected)/balita/actions';

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
};
type Posyandu = { id: string; name: string };
type Measurement = { measured_at: string; weight_kg: number; height_cm: number; officer_notes: string | null };

export function BalitaEditModal({
  child,
  posyandu,
  measurement,
}: {
  child: Child;
  posyandu: Posyandu[];
  measurement: Measurement | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const validateMeasurements = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const weight = String(formData.get('weightKg') ?? '').trim();
    const height = String(formData.get('heightCm') ?? '').trim();
    if (Boolean(weight) !== Boolean(height)) {
      event.preventDefault();
      setFormError('Isi berat dan tinggi badan bersama-sama, atau kosongkan keduanya jika tidak mencatat pengukuran.');
      return;
    }
    setFormError('');
  };

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
                <h2 id={`balita-edit-title-${child.id}`}>Edit Data Balita</h2>
                <p>Perbarui informasi data balita dan orang tua</p>
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

            <form action={updateChildFromModal} className="balita-modal-form" onSubmit={validateMeasurements}>
              <input type="hidden" name="id" value={child.id} />
              <div className="balita-edit-fields">
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Lengkap Balita <span>*</span></span>
                  <input name="name" required defaultValue={child.name} />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">NIK Balita <span>*</span></span>
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

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Ibu Kandung <span>*</span></span>
                  <input name="motherName" required defaultValue={child.mother_name} />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Posyandu Binaan <span>*</span></span>
                  <select name="posyanduId" required defaultValue={child.posyandu_id}>
                    <option value="" disabled>Pilih Posyandu</option>
                    {posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>

                <label className="balita-modal-field">
                  <span className="balita-modal-label">Berat Badan (kg)</span>
                  <input name="weightKg" type="number" step="0.1" min="0.1" defaultValue={measurement?.weight_kg ?? ''} />
                </label>
                <label className="balita-modal-field">
                  <span className="balita-modal-label">Tinggi Badan (cm)</span>
                  <input name="heightCm" type="number" step="0.1" min="0.1" defaultValue={measurement?.height_cm ?? ''} />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Status Gizi KMS</span>
                  <select name="kmsStatus" defaultValue={child.kms_status ?? 'NONE'}>
                    <option value="NONE">Belum diisi</option>
                    <option value="GIZI_BAIK">Gizi Baik</option>
                    <option value="PERLU_PANTAUAN">Perlu Pantauan</option>
                  </select>
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Tempat Lahir <span>*</span></span>
                  <input name="birthPlace" required defaultValue={child.birth_place ?? ''} />
                </label>

                <label className="balita-modal-field full">
                  <span className="balita-modal-label balita-notes-label">
                    Catatan Petugas <span>(Opsional)</span>
                  </span>
                  <textarea name="notes" rows={3} defaultValue={measurement?.officer_notes ?? ''} />
                </label>
              </div>

              {formError && <p className="balita-modal-form-error" role="alert">{formError}</p>}

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
