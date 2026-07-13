import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 font-sans">
      <main className="flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <div className="space-y-3">
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            Ujian Online Anti-Cheat
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Buat dan kerjakan ujian dengan waktu otomatis, penilaian per soal,
            dan deteksi kecurangan saat peserta berpindah tab.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Link
            href="/admin/login"
            className="flex h-14 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-base font-medium text-white shadow-md shadow-blue-200 transition-transform hover:scale-[1.02] hover:shadow-lg"
          >
            Masuk sebagai Admin
          </Link>
          <Link
            href="/join"
            className="flex h-14 flex-1 items-center justify-center rounded-xl border border-black/[.08] bg-white/70 px-5 text-base font-medium shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            Masuk sebagai Peserta
          </Link>
        </div>
      </main>
    </div>
  );
}
