# Monitoring Posyandu Desa Sindangsari

Sistem informasi berbasis web untuk membantu bidan dan kader mengelola kegiatan serta riwayat monitoring Posyandu Desa Sindangsari.

Aplikasi aktif menggunakan Next.js dan berada di folder `next-app`.

## Struktur repository

```text
monitoring-posyandu-sindangsari/
├── next-app/
│   ├── app/                  # Halaman, Server Actions, dan Route Handlers
│   ├── components/           # Komponen antarmuka bersama
│   ├── lib/                  # Autentikasi, Supabase, dan laporan
│   ├── prisma/               # Konfigurasi schema Prisma
│   ├── supabase/migrations/  # Migration, RLS, function, dan grant database
│   ├── .env.example          # Contoh environment variables
│   ├── package.json
│   └── proxy.ts              # Perlindungan sesi dan status akun
├── .editorconfig
├── .gitattributes
├── .gitignore
└── README.md
```

## Teknologi

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth dan SSR
- Row Level Security (RLS)
- Prisma
- PDF-Lib
- Vercel

## Fitur saat ini

- Registrasi, login, logout, reset, dan penggantian kata sandi
- Persetujuan atau penolakan akun kader
- Penetapan Posyandu ketika akun kader disetujui
- Pengelolaan data Posyandu
- Data bayi/balita dan riwayat pengukuran
- Data ibu hamil dan riwayat kunjungan
- Data lansia dan riwayat pemeriksaan
- Jadwal kegiatan internal dan publik
- Dashboard berbasis data Supabase
- Laporan berdasarkan kategori, Posyandu, dan rentang tanggal
- Ekspor laporan ke CSV dan PDF
- Pembatasan akses Bidan dan Kader melalui backend serta RLS
- Log aktivitas database

## Menjalankan aplikasi

Masuk ke folder aplikasi:

```bash
cd next-app
```

Instal dependency:

```bash
npm install
```

Salin `.env.example` menjadi `.env.local`, kemudian isi konfigurasi Supabase. Setelah itu jalankan:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Status | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Wajib | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Wajib | Publishable/anon key Supabase |
| `NEXT_PUBLIC_SITE_URL` | Disarankan | `http://localhost:3000` untuk lokal dan domain Vercel untuk produksi |
| `DATABASE_URL` | Cadangan | Disiapkan untuk koneksi Prisma |
| `DIRECT_URL` | Cadangan | Disiapkan untuk migration atau koneksi langsung Prisma |
| `SMTP_*` | Opsional | Diperlukan ketika memakai SMTP kustom; email autentikasi saat ini dikelola Supabase Auth |

Jangan memasukkan `.env.local`, password database, secret key, atau service-role key ke repository.

## Database Supabase

Migration berada di:

```text
next-app/supabase/migrations/
```

Migration mencakup tabel aplikasi, relasi, trigger log aktivitas, function profil, RLS, dan grant akses. Metadata CLI di `supabase/.temp` tidak boleh di-commit.

## Pemeriksaan produksi

```bash
cd next-app
npm run build
```

Build harus berhasil sebelum perubahan dipush atau dideploy.

## Deployment Vercel

Gunakan konfigurasi berikut ketika mengimpor repository:

- Root Directory: `next-app`
- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: gunakan default Next.js

Tambahkan environment variables melalui pengaturan Vercel. Untuk reset kata sandi, tambahkan URL callback produksi pada Supabase Authentication URL Configuration:

```text
https://domain-anda.vercel.app/auth/callback
```

## Keamanan

- Akses data dibatasi dengan autentikasi server dan RLS.
- Kader hanya dapat mengakses Posyandu sesuai penugasannya.
- Akun yang belum aktif tidak dapat membuka halaman internal.
- Halaman jadwal publik tidak menampilkan data pribadi atau kesehatan.
- Kredensial lokal tidak disimpan di Git.
