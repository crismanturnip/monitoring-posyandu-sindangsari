# Monitoring Posyandu Desa Sindangsari

Sistem informasi berbasis web untuk membantu bidan dan kader mengelola kegiatan serta riwayat monitoring Posyandu Desa Sindangsari.

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
- Ekspor laporan ke Excel (.xlsx) dan PDF
- Pembatasan akses Bidan dan Kader melalui backend serta RLS
- Log aktivitas database

## Keamanan

- Akses data dibatasi dengan autentikasi server dan RLS.
- Kader hanya dapat mengakses Posyandu sesuai penugasannya.
- Akun yang belum aktif tidak dapat membuka halaman internal.
- Halaman jadwal publik tidak menampilkan data pribadi atau kesehatan.
- Kredensial lokal tidak disimpan di Git.
