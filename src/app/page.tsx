import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Ujian Online Anti-Cheat
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Buat dan kerjakan ujian dengan waktu otomatis, penilaian per soal,
            dan deteksi kecurangan saat peserta berpindah tab.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Link
            href="/admin/login"
            className="flex h-14 flex-1 items-center justify-center rounded-xl bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Masuk sebagai Admin
          </Link>
          <Link
            href="/join"
            className="flex h-14 flex-1 items-center justify-center rounded-xl border border-solid border-black/[.08] px-5 text-base font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Masuk sebagai Peserta
          </Link>
        </div>
      </main>
    </div>
  );
}
