# Product Requirements Document (PRD)
## Platform Ujian Online Anti-Cheat ("GForm Anti-Cheat")

**Versi:** 1.0
**Tanggal:** 10 Juli 2026
**Pemilik Produk:** Client
**Status:** Draft

---

## 1. Latar Belakang & Tujuan

Google Forms banyak dipakai untuk ujian online karena mudah, tapi tidak punya kontrol waktu otomatis yang tegas, tidak mendeteksi kecurangan (pindah tab/aplikasi lain), dan bobot nilai harus dihitung manual dengan add-on pihak ketiga.

Produk ini dibuat untuk menjadi alternatif Google Forms yang **fokus pada kebutuhan ujian**: input soal berbobot nilai, waktu pengerjaan yang mengikat (auto-submit), deteksi kecurangan dasar (tab switching), dan kemudahan ekspor hasil bagi admin/guru/dosen.

### Tujuan Produk
- Memberi admin (guru/dosen/penyelenggara) kontrol penuh atas soal, bobot nilai, dan durasi ujian.
- Memastikan integritas ujian dengan mendeteksi dan mencatat indikasi kecurangan secara otomatis.
- Menyediakan hasil ujian yang siap diekspor tanpa hitung manual.

### Bukan Tujuan (Out of Scope v1)
- Proctoring berbasis kamera/AI (deteksi wajah, deteksi suara) — bisa jadi fitur v2.
- Soal berbasis gambar/upload file jawaban dalam jumlah besar (opsional, bisa fase 2).
- Aplikasi mobile native (v1 cukup web responsif).

---

## 2. Target Pengguna & Persona

| Persona | Kebutuhan |
|---|---|
| **Admin (Guru/Dosen/HR)** | Membuat ujian, mengatur soal & bobot, mengatur waktu, memantau peserta, mengekspor hasil |
| **Peserta (Siswa/Mahasiswa/Kandidat)** | Masuk ujian dengan mudah (kode/link), mengerjakan soal dengan jelas sisa waktunya, submit tanpa hambatan teknis |

---

## 3. User Stories

### Admin
- Sebagai admin, saya bisa **login** ke dashboard admin agar hanya saya yang bisa mengelola ujian.
- Sebagai admin, saya bisa **membuat ujian baru** (judul, deskripsi, durasi pengerjaan).
- Sebagai admin, saya bisa **menambahkan soal** (pilihan ganda, essay, isian singkat) beserta **bobot nilai** masing-masing.
- Sebagai admin, saya bisa **mengatur jumlah pelanggaran tab yang ditoleransi** sebelum auto-submit (mis. 0x langsung submit, atau 3x baru submit).
- Sebagai admin, saya bisa **membagikan link/kode unik** ujian ke peserta.
- Sebagai admin, saya bisa **memantau status peserta** secara real-time (sedang mengerjakan, sudah submit, terindikasi curang).
- Sebagai admin, saya bisa **melihat hasil & skor otomatis** untuk soal objektif dan **menilai manual** untuk soal essay.
- Sebagai admin, saya bisa **mengekspor hasil ujian** (skor per peserta, jawaban lengkap, log pelanggaran) dalam format Excel/CSV/PDF.

### Peserta
- Sebagai peserta, saya bisa **masuk ujian** menggunakan link/kode yang diberikan, tanpa perlu membuat akun.
- Sebagai peserta, saya bisa **melihat sisa waktu pengerjaan** secara jelas selama ujian berlangsung.
- Sebagai peserta, jawaban saya **otomatis tersimpan** setiap kali saya menjawab (autosave), supaya tidak hilang jika koneksi putus.
- Sebagai peserta, ujian saya **otomatis terkirim** ketika waktu habis.
- Sebagai peserta, saya **diberi peringatan** jika saya berpindah tab/aplikasi, sebelum sistem menganggapnya pelanggaran.
- Sebagai peserta, saya bisa **submit manual** sebelum waktu habis jika sudah selesai.

---

## 4. Ruang Lingkup Fitur (Functional Requirements)

### 4.1 Autentikasi & Akses
- Landing page dengan 2 tombol: **"Masuk sebagai Admin"** dan **"Masuk sebagai Peserta"**.
- Admin: login dengan email/password (atau Google OAuth).
- Peserta: masuk memakai **kode ujian** atau **link unik** + isi nama/identitas (NIM/NIS/email) — tanpa akun permanen.
- Satu kode ujian bisa diatur admin: sekali pakai per peserta, atau bebas re-entry (opsional).

### 4.2 Manajemen Soal
- Admin dapat membuat bank soal per ujian dengan tipe:
  - Pilihan ganda (single/multiple answer)
  - Essay / uraian
  - Isian singkat
- Setiap soal memiliki field **bobot nilai** (numerik, admin bebas atur, total tidak harus 100).
- Admin dapat mengatur urutan soal (fixed atau diacak/random per peserta untuk kurangi contek-menyontek antar peserta).
- Admin dapat menandai kunci jawaban untuk soal objektif (dipakai untuk auto-scoring).

### 4.3 Pengaturan Waktu Ujian
- Admin set durasi ujian dalam menit (mis. 60 menit) saat membuat ujian.
- Admin dapat mengatur jadwal buka/tutup ujian (opsional: ujian hanya bisa diakses pada rentang tanggal/jam tertentu).
- Timer countdown ditampilkan di halaman peserta, dihitung dari server (bukan dari device peserta) untuk mencegah manipulasi jam lokal.
- Ketika waktu habis → sistem **otomatis submit** jawaban yang sudah terisi (partial submit diperbolehkan).

### 4.4 Anti-Cheat (Tab/Window Switch Detection)
- Sistem mendeteksi event peserta berpindah tab, minimize window, atau membuka aplikasi lain (menggunakan Page Visibility API / `blur`/`focus` events browser).
- Kebijakan yang bisa diatur admin per ujian:
  - **Toleransi 0**: sekali pindah tab → jawaban langsung disubmit otomatis + status "Terindikasi Curang".
  - **Toleransi N kali**: peserta diberi peringatan, disubmit otomatis setelah pelanggaran ke-N.
- Setiap event pelanggaran dicatat: waktu kejadian, durasi di luar tab, dan dikirim ke server secara real-time (bukan hanya disimpan di client) agar tidak bisa dimanipulasi peserta.
- Log pelanggaran per peserta bisa dilihat admin di dashboard hasil.
- Disclaimer: metode ini best-effort di level browser, bukan proctoring penuh (tidak mendeteksi HP kedua, orang lain di ruangan, dll) — akan dinyatakan jelas ke pengguna sebagai batasan produk.

### 4.5 Penilaian & Hasil
- Auto-scoring untuk soal pilihan ganda/isian singkat berdasarkan kunci jawaban × bobot nilai.
- Soal essay masuk antrian **"perlu dinilai manual"** oleh admin, dengan slider/input skor sesuai bobot soal.
- Total skor peserta dihitung otomatis setelah admin menilai semua essay (atau real-time untuk yang objektif saja).

### 4.6 Ekspor Data
- Admin bisa export:
  - Rekap nilai seluruh peserta (Excel/CSV): nama, skor total, waktu submit, status kecurangan.
  - Jawaban lengkap per peserta (PDF), termasuk log pelanggaran tab.
- Export tersedia kapan saja setelah ujian berjalan (real-time, tidak perlu menunggu ujian selesai total).

### 4.7 Dashboard Admin
- List ujian yang pernah dibuat + status (draft/aktif/selesai).
- Monitoring real-time: jumlah peserta sedang mengerjakan, sudah submit, jumlah pelanggaran terdeteksi.
- Detail per peserta: jawaban, skor, log aktivitas.

---

## 5. Non-Functional Requirements

| Aspek | Kebutuhan |
|---|---|
| **Performa** | Timer & autosave tidak boleh delay > 1 detik; mendukung minimal 100 peserta concurrent per ujian di v1 |
| **Keamanan** | Kunci jawaban tidak boleh terkirim ke client sebelum submit; validasi skor & waktu dilakukan di server, bukan percaya input client |
| **Reliabilitas** | Autosave jawaban tiap perubahan agar tahan terhadap koneksi putus/refresh browser |
| **Skalabilitas** | Arsitektur mendukung penambahan fitur proctoring (kamera) di masa depan tanpa rombak besar |
| **Aksesibilitas** | Responsif di desktop & tablet (mobile sebagai nice-to-have, karena ujian idealnya di layar besar) |
| **Kompatibilitas Browser** | Chrome, Edge, Firefox, Safari (event visibility API didukung semua browser modern) |

---

## 6. Tech Stack (Diusulkan)

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend | Next.js (React) + Tailwind CSS | 1 codebase untuk portal admin & peserta, SSR untuk halaman terproteksi |
| Backend | Next.js API Routes / Node.js (Express) | Terintegrasi dengan frontend, mudah scale terpisah bila perlu |
| Database | PostgreSQL + Prisma ORM | Relasi ujian → soal → peserta → jawaban → log pelanggaran jelas dan terstruktur |
| Auth Admin | NextAuth / Clerk | Login admin cepat diimplementasi, dukung OAuth Google |
| Auth Peserta | Token/kode ujian sekali pakai (JWT short-lived) | Tidak perlu akun permanen untuk peserta |
| Realtime | WebSocket (Socket.IO) atau polling ringan | Kirim event pelanggaran tab & progres peserta ke admin secara live |
| Export | `exceljs` (Excel/CSV), `pdf-lib` atau `puppeteer` (PDF) | Generate laporan di server side |
| Hosting | Vercel (app) + Supabase/Neon (Postgres) | Cepat deploy, biaya rendah untuk MVP |

---

## 7. Alur Kerja (User Flow)

### Alur Admin
1. Login ke dashboard admin.
2. Buat ujian baru → isi judul, deskripsi, durasi (mis. 60 menit), kebijakan anti-cheat (toleransi tab switch).
3. Tambah soal satu per satu → pilih tipe soal, isi pertanyaan, isi bobot nilai, isi kunci jawaban (jika objektif).
4. Publish ujian → sistem generate link/kode unik.
5. Bagikan link ke peserta (manual/email/grup).
6. Pantau dashboard real-time selama ujian berlangsung.
7. Setelah/selama ujian, nilai soal essay yang masuk.
8. Export hasil ke Excel/CSV/PDF.

### Alur Peserta
1. Buka link ujian / masukkan kode ujian di landing page.
2. Isi identitas (nama, NIM/NIS, dll).
3. Klik "Mulai Ujian" → timer mulai berjalan (dihitung server).
4. Mengerjakan soal, jawaban tersimpan otomatis tiap kali diisi.
5. Jika berpindah tab → muncul peringatan (atau langsung auto-submit sesuai kebijakan admin) → event terkirim ke server.
6. Submit manual (jika selesai lebih awal) **atau** auto-submit saat waktu habis.
7. Halaman konfirmasi "Ujian selesai" ditampilkan ke peserta.

---

## 8. Metrik Keberhasilan (Success Metrics)

- Admin dapat membuat & mempublikasikan ujian dalam < 10 menit untuk 20 soal.
- 0% kehilangan data jawaban akibat autosave gagal (target reliability autosave).
- Waktu submit auto-cutoff akurat dalam toleransi ±2 detik dari durasi yang diset admin.
- Deteksi tab-switch tercatat dengan akurasi 100% pada browser yang didukung.
- Waktu export laporan < 5 detik untuk ujian dengan 200 peserta.

---

## 9. Risiko & Batasan

| Risiko | Mitigasi |
|---|---|
| Peserta pakai 2 device (1 untuk contek) | Di luar scope v1; nyatakan sebagai batasan produk, roadmap proctoring kamera di v2 |
| Peserta menutup browser paksa untuk hindari log pelanggaran | Simpan event ke server secara langsung saat terjadi (bukan saat submit), pakai `beforeunload`/`visibilitychange` yang terkirim sebelum tab benar-benar tertutup |
| Server down saat ujian berlangsung | Autosave lokal (localStorage) sebagai fallback + sync ulang saat koneksi pulih |
| Manipulasi waktu di sisi client | Semua validasi waktu & submit dilakukan berdasarkan waktu server, bukan client |

---

## 10. Roadmap (Opsional, di luar v1)

- **v1.1**: Import soal massal dari Excel/CSV.
- **v1.2**: Randomisasi soal & opsi jawaban per peserta.
- **v2.0**: Proctoring kamera (deteksi wajah, deteksi lebih dari 1 orang) + fullscreen lock.
- **v2.1**: Bank soal reusable lintas ujian.

---

## Appendix A: Detail Teknis Anti-Cheat (Tab/Window Detection)

Catatan penting: browser **tidak bisa mencegah** peserta pindah tab/aplikasi lain secara mutlak — itu di luar kendali JavaScript karena alasan keamanan browser & OS. Yang bisa dilakukan sistem adalah **mendeteksi** kejadian tersebut lalu bereaksi (log, warning, auto-submit). Istilah yang akurat: *deteksi kecurangan*, bukan *blokir kecurangan*.

### A.1 Page Visibility API (deteksi utama)
```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    reportViolation('tab_hidden');
  }
});
```
Didukung semua browser modern. Trigger saat: pindah tab, minimize window, kunci layar, atau switch ke aplikasi lain.

### A.2 Window blur/focus (pelengkap)
```js
window.addEventListener('blur', () => reportViolation('window_blur'));
window.addEventListener('focus', () => reportViolation('window_focus_return'));
```
Menangkap kasus di mana `visibilitychange` tidak selalu trigger, tergantung device/browser.

### A.3 Pelaporan real-time ke server (`sendBeacon`)
```js
navigator.sendBeacon('/api/exam/violation', JSON.stringify({
  examSessionId, type: 'tab_hidden', timestamp: Date.now()
}));
```
Wajib pakai `sendBeacon`, bukan `fetch` biasa — event tetap terkirim walau peserta langsung menutup tab, sehingga peserta tidak bisa menghindari pencatatan dengan cara close tab secara cepat.

### A.4 Fullscreen API (opsional, menambah gesekan)
```js
document.documentElement.requestFullscreen();
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) reportViolation('exit_fullscreen');
});
```
Memaksa mode fullscreen sebelum ujian mulai; keluar dari fullscreen (Esc, dsb.) turut dicatat sebagai pelanggaran. Menambah hambatan bagi peserta yang ingin pindah tab, tapi tetap bukan penghalang mutlak.

### A.5 Pemblokiran shortcut tertentu (best-effort, bukan jaminan)
```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'F11' || (e.altKey && e.key === 'Tab') || e.ctrlKey) {
    e.preventDefault();
  }
});
```
⚠️ **Alt+Tab tidak bisa dicegah lewat JavaScript** karena itu shortcut level OS. `preventDefault()` di sini hanya efektif untuk sebagian shortcut level browser (mis. Ctrl+T, Ctrl+N), bukan level OS.

### A.6 Keputusan aksi harus di server, bukan client
Client hanya bertugas **mendeteksi & melaporkan** event ke server melalui endpoint violation. Server yang:
- Menghitung jumlah pelanggaran per sesi peserta.
- Membandingkan dengan kebijakan toleransi yang diset admin (§4.4).
- Menandai sesi sebagai `submitted` + `flagged: cheating` dan mengunci endpoint simpan-jawaban begitu ambang batas terlampaui.

Alasan: jika logika "pelanggaran > N → submit" hanya ada di JavaScript client, peserta yang membuka DevTools bisa menonaktifkan/memodifikasi script tersebut. Validasi & eksekusi keputusan harus tetap berada di server agar tidak bisa dimanipulasi.

### A.7 Batasan yang harus dikomunikasikan secara jujur ke pengguna produk
- Tidak dapat mencegah peserta memakai **device kedua** (mis. HP) untuk mencontek sambil laptop tetap terbuka di tab ujian.
- Tidak dapat mendeteksi screenshot atau screen sharing dari device lain.
- Peserta yang menonaktifkan JavaScript sepenuhnya bisa menghindari deteksi — namun ujian juga tidak akan bisa dikerjakan sama sekali tanpa JS, sehingga JS aktif bisa dijadikan syarat wajib.
- Metode ini tergolong *lightweight/browser-based anti-cheat*, berbeda level dengan **proctoring** penuh (kamera + AI) yang jauh lebih ketat namun juga lebih kompleks dan mahal untuk diimplementasikan (lihat roadmap v2.0 di §10).

---

## 11. Pertanyaan Terbuka (Butuh Keputusan)

1. Apakah peserta wajib fullscreen mode selama ujian (menambah lapisan deteksi keluar layar)?
2. Berapa toleransi default pelanggaran tab switch sebelum auto-submit?
3. Apakah dibutuhkan fitur "kirim ulang" bagi peserta yang submit karena error teknis (bukan kecurangan), dengan approval admin?
4. Skala peserta concurrent maksimum yang perlu didukung di v1 (100? 500? 1000+)?
