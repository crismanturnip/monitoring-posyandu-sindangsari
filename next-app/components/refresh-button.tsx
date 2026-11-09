'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      className={`dash-refresh-btn ${isPending ? 'is-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={isPending}
      title="Segarkan data terbaru"
      aria-label="Segarkan data"
    >
      <svg
        className={`dash-refresh-icon ${isPending ? 'spin' : ''}`}
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
      </svg>
      <span>{isPending ? 'Menyegarkan...' : 'Segarkan'}</span>
    </button>
  );
}
