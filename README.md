# Ujian Online Anti-Cheat

Platform ujian online mirip Google Forms dengan tambahan: penilaian per soal, timer auto-submit, dan deteksi kecurangan saat peserta berpindah tab. Spesifikasi lengkap ada di [`PRD.md`](./PRD.md).

## Tech Stack

- **Frontend/Backend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM (driver adapter `@prisma/adapter-pg`)
- **Anti-cheat**: Page Visibility API, `blur`/`focus`, Fullscreen API, `sendBeacon` — lihat `PRD.md` Appendix A

## Setup

1. Salin environment variable:
   ```bash
   cp .env.example .env
   ```
2. Siapkan database PostgreSQL, lalu isi `DATABASE_URL` di `.env`.
   - Lokal cepat: `npx prisma dev`
   - Cloud: `npx create-db` (Prisma Postgres) atau pakai Supabase/Neon
3. Install dependencies & jalankan migrasi:
   ```bash
   npm install
   npx prisma migrate dev --name init
   ```
4. Jalankan dev server:
   ```bash
   npm run dev
   ```
5. Buka [http://localhost:3000](http://localhost:3000).

## Struktur Project

```
prisma/schema.prisma        # Model: Admin, Exam, Question, Choice, ExamSession, Answer, ViolationLog
src/app/page.tsx             # Landing page (tombol Admin / Peserta)
src/app/admin/               # Login admin, dashboard, buat ujian
src/app/join/                 # Peserta masuk pakai kode ujian
src/app/exam/[sessionId]/     # Halaman pengerjaan ujian (timer + anti-cheat)
src/app/api/                  # Route handlers: exams, sessions, answers, violations, submit
src/components/AntiCheatMonitor.tsx  # Deteksi tab switch / fullscreen exit
src/components/ExamTimer.tsx         # Countdown berbasis deadline server
```

## Status Implementasi (Scaffold Awal)

Sudah ada:
- Skema database lengkap sesuai PRD §4
- Landing page, join flow, exam-taking flow dengan timer & anti-cheat dasar
- API untuk buat ujian, join sesi, autosave jawaban, lapor pelanggaran, submit

Belum ada (lihat `PRD.md` §11 untuk keputusan yang diperlukan):
- Autentikasi admin sungguhan (NextAuth/Clerk) — saat ini `admin/login` hanya UI, belum terhubung
- Manajemen soal (tambah/edit soal & kunci jawaban) dari UI admin
- Auto-scoring & penilaian manual essay
- Export hasil ke Excel/CSV/PDF
- Dashboard monitoring real-time (saat ini hanya list statis dari DB)
