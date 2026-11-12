'use client';

import { useEffect, useRef, useState } from 'react';
import { createChild } from '@/app/(protected)/balita/actions';

type Posyandu = { id: string; name: string };

export function BalitaCreateModal({ posyandu }: { posyandu: Posyandu[] }) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="balita-add-btn"
        onClick={() => setIsOpen(true)}
      >
        + Tambah Data Balita
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
                <h2 id="balita-create-title">Tambah Data Bayi &amp; Balita Baru</h2>
                <p>Masukkan identitas balita dan data orang tua sesuai kartu keluarga / KMS</p>
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

            <form action={createChild} className="balita-modal-form">
              <div className="balita-modal-fields">
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Lengkap Balita <span>*</span></span>
                  <input name="name" required placeholder="Nama lengkap anak" />
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

                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Nama Ibu Kandung <span>*</span></span>
                  <input name="motherName" required placeholder="Nama lengkap ibu" />
                </label>

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
                    <span className="balita-modal-label">Berat Badan (kg)</span>
                    <input name="birthWeight" type="number" step="0.01" min="0.01" placeholder="Contoh: 3.1" />
                  </label>
                  <label className="balita-modal-field balita-modal-height">
                    <span className="balita-modal-label">Tinggi Badan (cm)</span>
                    <input name="birthLength" type="number" step="0.01" min="0.01" placeholder="Contoh: 49.5" />
                  </label>
                </div>
                <label className="balita-modal-field full">
                  <span className="balita-modal-label">Status Gizi KMS <span>*</span></span>
                  <select name="kmsStatus" required defaultValue="NONE">
                    <option value="NONE">Belum diisi</option>
                    <option value="GIZI_BAIK">Gizi Baik</option>
                    <option value="PERLU_PANTAUAN">Perlu Pantauan</option>
                  </select>
                </label>
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
              </div>

              <footer className="balita-modal-footer">
                <button type="button" className="balita-modal-cancel" onClick={() => setIsOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="balita-modal-submit" disabled={posyandu.length === 0}>
                  <span aria-hidden="true">✓</span> Simpan Data Balita
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
