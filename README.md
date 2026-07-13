# Ujian Online Anti-Cheat

Platform ujian online mirip Google Forms dengan tambahan: penilaian per soal, timer auto-submit, dan deteksi kecurangan saat peserta berpindah tab. Spesifikasi lengkap ada di [`PRD.md`](./PRD.md).

## Tech Stack

- **Frontend/Backend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM (driver adapter `@prisma/adapter-pg`)
- **Auth Admin**: NextAuth (Auth.js v5) dengan Credentials provider, password di-hash dengan `bcryptjs`, disimpan di tabel `Admin`
- **Anti-cheat**: Page Visibility API, `blur`/`focus`, Fullscreen API — lihat `PRD.md` Appendix A

## Setup

1. Salin environment variable:
   ```bash
   cp .env.example .env
   ```
2. Siapkan database PostgreSQL, lalu isi `DATABASE_URL` di `.env`.
   - Lokal cepat: `npx prisma dev --detach` (print connection string, salin ke `DATABASE_URL`)
   - Cloud: `npx create-db` (Prisma Postgres) atau pakai Supabase/Neon
3. Isi `AUTH_SECRET` di `.env` (dipakai NextAuth untuk menandatangani session):
   ```bash
   openssl rand -base64 32
   ```
4. Install dependencies & sinkronkan schema ke database:
   ```bash
   npm install
   npx prisma db push
   ```
   > Pakai `db push` untuk dev cepat. Kalau sudah pakai Postgres sungguhan (bukan `prisma dev`), ganti ke `npx prisma migrate dev --name init` supaya ada riwayat migrasi — `prisma dev` tidak mendukung shadow database yang dibutuhkan `migrate dev`.
5. Buat akun admin awal:
   ```bash
   npm run db:seed
   ```
   Secara default membuat `admin@example.com` / `changeme123` (ubah lewat `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` di `.env` sebelum menjalankan seed).
6. Jalankan dev server:
   ```bash
   npm run dev
   ```
7. Buka [http://localhost:3000](http://localhost:3000) → "Masuk sebagai Admin" → login pakai akun dari langkah 5.

## Deploy ke Vercel (dengan Supabase)

Vercel jalan mulus dengan PostgreSQL — tidak perlu database lain. Supabase juga PostgreSQL, jadi tinggal disambungkan.

1. Di Supabase: **Project Settings → Database → Connection string**, ambil dua URL:
   - **Transaction pooler** (port `6543`) → jadi `DATABASE_URL`. Wajib pakai yang ini di Vercel, bukan direct connection — tiap serverless function invocation buka koneksi baru, dan Postgres biasa punya limit koneksi yang kecil (Supabase free tier ~60), jadi harus lewat pooler (PgBouncer) supaya tidak cepat habis.
   - **Direct connection** (port `5432`) → jadi `DIRECT_URL`. Hanya dipakai untuk migrasi (`prisma migrate deploy`/`db push`), karena DDL (CREATE TABLE, dst) tidak didukung lewat transaction pooler.
2. Di Vercel Project Settings → Environment Variables, isi: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (generate baru khusus production, jangan pakai yang dev), dan opsional `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
3. Sebelum deploy pertama kali, jalankan migrasi dari lokal (pointing ke Supabase, pakai `DIRECT_URL`):
   ```bash
   npx prisma migrate deploy
   ```
   (Kalau belum ada migration history karena sebelumnya pakai `db push`, jalankan `npx prisma migrate dev --name init` sekali dari lokal dulu untuk membuat file migrasi awal, baru commit foldernya.)
4. Deploy seperti biasa (`vercel` CLI atau hubungkan repo GitHub ke Vercel dashboard). `postinstall` script (`prisma generate`) otomatis jalan setiap build, jadi Prisma Client selalu fresh.
5. Buat akun admin production: jalankan `npm run db:seed` dari lokal dengan `.env` yang menunjuk ke Supabase (bukan `prisma dev` lokal), atau jalankan lewat `vercel env pull` + `db:seed`.

## Struktur Project

```
prisma/schema.prisma              # Model: Admin, Exam, Question, Choice, ExamSession, Answer, ViolationLog
prisma/seed.ts                    # Buat akun admin awal (npm run db:seed)
src/proxy.ts                      # Proteksi rute /admin/* (konvensi Next.js 16, pengganti middleware.ts)
src/lib/auth.config.ts            # Konfigurasi NextAuth edge-safe (dipakai src/proxy.ts)
src/lib/auth.ts                   # Konfigurasi NextAuth penuh (Credentials provider + Prisma)
src/lib/prisma.ts                 # Prisma client singleton (driver adapter @prisma/adapter-pg)
src/types/next-auth.d.ts          # Augmentasi tipe session.user.id
src/app/page.tsx                  # Landing page (tombol Admin / Peserta)
src/app/admin/login/page.tsx      # Form login admin
src/app/admin/page.tsx            # Dashboard ujian (di-scope ke admin yang login)
src/app/admin/exams/new/page.tsx  # Form buat ujian baru
src/app/admin/exams/[examId]/     # Detail ujian: daftar soal, tambah soal, publish
src/app/join/page.tsx             # Peserta masuk pakai kode ujian
src/app/exam/[sessionId]/         # Halaman pengerjaan ujian (timer + anti-cheat)
src/app/api/auth/[...nextauth]/   # Route handler NextAuth (login/logout)
src/app/api/exams/                # Buat ujian
src/app/api/exams/[examId]/questions/  # Tambah/hapus soal pada suatu ujian
src/app/api/exams/[examId]/publish/    # Publish ujian (DRAFT -> PUBLISHED)
src/app/api/sessions/             # Peserta join ujian
src/app/api/answers/              # Autosave jawaban peserta
src/app/api/violations/           # Lapor & tindak lanjut pelanggaran anti-cheat
src/app/api/exam-sessions/submit/ # Submit ujian (manual/timeout/violation)
src/components/AntiCheatMonitor.tsx  # Deteksi tab switch / fullscreen exit
src/components/ExamTimer.tsx         # Countdown berbasis deadline server
src/components/SignOutButton.tsx     # Tombol keluar di dashboard admin
```

## Status Implementasi

Sudah ada:
- Skema database lengkap sesuai PRD §4
- Landing page, join flow, exam-taking flow dengan timer & anti-cheat (toggle aktif/nonaktif + 3 mode aksi: peringatan/catat saja/akhiri otomatis)
- Autentikasi admin (NextAuth Credentials) — `/admin/*` terlindungi middleware, ujian di-scope ke admin yang login
- Manajemen soal: tambah soal (pilihan ganda satu/multi jawaban, isian singkat, essay) + bobot nilai, hapus soal, publish ujian (butuh minimal 1 soal)
- API untuk buat ujian, join sesi, autosave jawaban, lapor pelanggaran, submit
- Edit soal yang sudah dibuat (saat ini hanya tambah/hapus)
- Export hasil ke Excel/CSV/PDF
- Auto-scoring & penilaian manual essay

Belum ada (lihat `PRD.md` §11 untuk keputusan yang diperlukan):
- Registrasi admin dari UI (saat ini hanya lewat `npm run db:seed`)
- Dashboard monitoring real-time (saat ini hanya list statis dari DB)
