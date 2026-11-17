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
- `npm run check:report-schema` — memastikan kolom formulir bayi, balita, dan ibu hamil tersedia di Supabase yang terhubung

## Urutan rilis perubahan formulir dan laporan

1. Jalankan migrasi SQL terbaru di `supabase/migrations/` pada proyek Supabase yang dipakai aplikasi.
2. Pastikan Supabase CLI sudah login dan tertaut ke proyek yang benar, lalu jalankan `npm run check:report-schema`. Lanjutkan hanya jika ketiga tabel dinyatakan siap.
3. Jalankan pengujian dan rilis kode aplikasi. Setelah rilis, isi satu data contoh per kategori dan pastikan nilainya muncul di laporan pada tanggal serta Posyandu yang sama.

Laporan memakai tanggal pendaftaran untuk warga tanpa pemeriksaan, atau tanggal pemeriksaan untuk riwayat. Sesuaikan filter periode laporan dengan tanggal yang dipakai saat mengisi formulir.

## Folder penting

- `app/` — halaman, Server Actions, dan API laporan
- `components/` — komponen bersama dan layout aplikasi
- `lib/` — autentikasi, Supabase, laporan, serta ekspor
- `prisma/` — schema Prisma
- `supabase/migrations/` — skema database, RLS, function, dan grant

Dokumentasi lengkap tersedia pada [README repository](../README.md).
