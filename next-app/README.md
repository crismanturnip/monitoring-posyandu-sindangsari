# Next.js Monitoring Posyandu

Folder ini berisi aplikasi utama Sistem Monitoring Posyandu Desa Sindangsari.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Aplikasi tersedia di [http://localhost:3000](http://localhost:3000).

Sebelum menjalankan aplikasi, salin `.env.example` menjadi `.env.local` dan isi minimal:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Perintah

- `npm run dev` — menjalankan server pengembangan
- `npm run build` — memeriksa dan membuat build produksi
- `npm run start` — menjalankan build produksi

## Folder penting

- `app/` — halaman, Server Actions, dan API laporan
- `components/` — komponen bersama dan layout aplikasi
- `lib/` — autentikasi, Supabase, laporan, serta ekspor
- `prisma/` — schema Prisma
- `supabase/migrations/` — skema database, RLS, function, dan grant

Dokumentasi lengkap tersedia pada [README repository](../README.md).
