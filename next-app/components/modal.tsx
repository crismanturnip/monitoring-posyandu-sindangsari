'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ closeHref, labelledBy, tone = 'default', children }: { closeHref: string; labelledBy: string; tone?: 'default' | 'danger'; children: ReactNode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') router.replace(closeHref); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [closeHref, router]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) router.replace(closeHref); }}>
    <div className={`modal${tone === 'danger' ? ' modal-danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} ref={dialog}>
      {children}
    </div>
  </div>;
}
