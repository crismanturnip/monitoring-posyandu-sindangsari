'use client';

import { useState } from 'react';

type PasswordInputProps = {
  name: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
};

export function PasswordInput({ name, autoComplete, minLength, required = false }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <span className="password-field">
    <input
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      minLength={minLength}
      required={required}
    />
    <button
      className="password-toggle"
      type="button"
      aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      aria-pressed={visible}
      onClick={() => setVisible((current) => !current)}
    >
      {visible ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.5 9 5.5a17.8 17.8 0 0 1-2.2 2.8M6.6 6.6A18.2 18.2 0 0 0 3 9.5S6.5 15 12 15a10 10 0 0 0 3.4-.6" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5S6.5 4 12 4s9 5.5 9 5.5S17.5 15 12 15 3 9.5 3 9.5Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
      )}
    </button>
  </span>;
}
