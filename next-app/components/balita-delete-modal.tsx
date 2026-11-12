'use client';

import { useEffect, useRef, useState } from 'react';
import { softDeleteChild } from '@/app/(protected)/balita/actions';

type Child = {
  id: string;
  name: string;
  gender: string;
  mother_name: string;
  posyandu: { name: string } | null;
  kms_status: string | null;
};

const getStatusLabel = (status: string | null) => {
  if (status === 'GIZI_BAIK') return 'Gizi Baik';
  if (status === 'PERLU_PANTAUAN') return 'Perlu Pantauan';
  return 'Belum diisi';
};

export function BalitaDeleteModal({ child, ageMonths }: { child: Child; ageMonths: number }) {
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
        className="balita-action-btn delete"
        aria-label={`Hapus data ${child.name}`}
        onClick={() => setIsOpen(true)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.5H6.1L5.5 6m3 2.5v4.5m3-4.5v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
            className="balita-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`balita-delete-title-${child.id}`}
            tabIndex={-1}
          >
            <header className="balita-delete-header">
              <span className="balita-delete-icon" aria-hidden="true">⚠</span>
              <div className="balita-delete-heading">
                <h2 id={`balita-delete-title-${child.id}`}>Hapus Data Balita?</h2>
                <p>Konfirmasi penghapusan data pasien balita</p>
              </div>
              <button
                type="button"
                className="balita-modal-close"
                aria-label="Tutup konfirmasi"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="balita-delete-body">
              <p>
                Apakah Anda yakin ingin menghapus data balita ini? Data akan dikeluarkan dari daftar aktif.
                Riwayat pemeriksaan tetap tersimpan.
              </p>
              <div className="balita-delete-summary">
                <span className="balita-delete-avatar" aria-hidden="true">
                  {child.name.trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="balita-delete-child">
                  <div className="balita-delete-name">
                    <strong>{child.name}</strong>
                    <span className={`balita-status ${child.kms_status === 'PERLU_PANTAUAN' ? 'warning' : child.kms_status === 'GIZI_BAIK' ? 'good' : 'unknown'}`}>
                      {getStatusLabel(child.kms_status)}
                    </span>
                  </div>
                  <div className="balita-delete-meta">
                    {child.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} ({ageMonths} Bulan)
                    <i>•</i> Ibu: {child.mother_name}
                    <i>•</i> <strong>{child.posyandu?.name ?? 'Posyandu'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <footer className="balita-delete-footer">
              <button type="button" className="balita-modal-cancel" onClick={() => setIsOpen(false)}>
                Batal
              </button>
              <form action={softDeleteChild}>
                <input type="hidden" name="id" value={child.id} />
                <button type="submit" className="balita-delete-confirm">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.5H6.1L5.5 6m3 2.5v4.5m3-4.5v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Ya, Hapus Data
                </button>
              </form>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
