'use client';

import { useActionState, useEffect, useState } from 'react';
import { deleteKaderAccount, type DeleteKaderState } from '@/app/(protected)/admin/kader/actions';

const initialState: DeleteKaderState = { error: null, success: null };

export function KaderPermanentDelete({ kaderId, name }: { kaderId: string; name: string }) {
  const [state, formAction, pending] = useActionState(deleteKaderAccount, initialState);
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (!confirming || secondsLeft === 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [confirming, secondsLeft]);

  function startConfirmation() {
    setSecondsLeft(5);
    setConfirming(true);
  }

  return (
    <div className="settings-kader-delete">
      {!confirming ? (
        <button type="button" className="danger" onClick={startConfirmation}>
          Hapus permanen
        </button>
      ) : (
        <>
          <p className="settings-kader-delete-warning">
            Hapus akun <strong>{name}</strong> secara permanen? Data kesehatan, jadwal, dan audit tidak akan dihapus.
            Jika masih ada riwayat yang merujuk ke kader ini, penghapusan akan dibatalkan.
          </p>
          <div className="settings-kader-delete-actions">
            <button type="button" className="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              Batal
            </button>
            <form action={formAction}>
              <input type="hidden" name="kaderId" value={kaderId} />
              <button className="danger" type="submit" disabled={secondsLeft > 0 || pending}>
                {pending ? 'Menghapus…' : secondsLeft > 0 ? `Tunggu ${secondsLeft} detik…` : 'Konfirmasi hapus permanen'}
              </button>
            </form>
          </div>
        </>
      )}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status" aria-live="polite">{state.success}</p>}
    </div>
  );
}
