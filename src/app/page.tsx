import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="shell relative max-w-lg overflow-hidden text-center">
        <Decorations />

        <div className="relative flex flex-col items-center gap-8 pt-40 pb-24 sm:pt-44">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              Ujian online yang <span className="text-coral">jujur</span>{" "}
              &amp; adil<span className="text-coral">!</span>
            </h1>
            <p className="mx-auto max-w-sm text-base leading-7 text-muted">
              Buat dan kerjakan ujian dengan waktu otomatis, penilaian per soal, dan
              deteksi kecurangan saat peserta berpindah tab.
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Link href="/join" className="btn btn-primary btn-lg flex-1">
              Masuk sebagai Peserta
            </Link>
            <Link href="/admin/login" className="btn btn-lg flex-1">
              Masuk sebagai Admin
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Ornamen geometris ala kanvas desain: grid, kotak terpilih, segitiga. */
function Decorations() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Grid kuning di kiri atas */}
      <div className="absolute top-6 left-0 h-14 w-28 bg-sun" />
      <svg className="absolute top-2 left-2 h-24 w-28" viewBox="0 0 112 96">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`v${i}`} x1={8 + i * 22} y1="0" x2={8 + i * 22} y2="96" stroke="#1b1b1b" strokeWidth="1.5" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="0" y1={12 + i * 22} x2="112" y2={12 + i * 22} stroke="#1b1b1b" strokeWidth="1.5" />
        ))}
      </svg>

      {/* Segitiga biru + kotak hijau dengan handle seleksi */}
      <svg className="absolute top-8 left-1/2 h-32 w-44 -translate-x-1/4" viewBox="0 0 176 128">
        <polygon points="20,110 70,30 120,110" fill="#6f86f0" />
        <rect x="70" y="8" width="72" height="72" fill="#6cbf4b" stroke="#1b1b1b" strokeWidth="2" />
        {[
          [70, 8], [106, 8], [142, 8], [70, 44], [142, 44], [70, 80], [106, 80], [142, 80],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" fill="#fffcf6" stroke="#1b1b1b" strokeWidth="1.5" />
        ))}
      </svg>

      {/* Batang merah vertikal di kanan */}
      <div className="absolute top-10 right-6 h-36 w-6 border-2 border-ink bg-coral" />

      {/* Bagian bawah: titik, persegi biru, setengah lingkaran merah, segitiga outline */}
      <svg className="absolute bottom-3 left-4 h-16 w-24" viewBox="0 0 96 64">
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={6 + (i % 8) * 12} cy={8 + Math.floor(i / 8) * 16} r="1.8" fill="#1b1b1b" />
        ))}
      </svg>
      <div className="absolute bottom-6 left-1/3 h-12 w-28 bg-sky" />
      <svg className="absolute right-20 bottom-4 h-16 w-20" viewBox="0 0 80 64">
        <polygon points="40,4 76,60 4,60" fill="none" stroke="#1b1b1b" strokeWidth="2.5" />
      </svg>
      <div className="absolute right-0 bottom-6 h-16 w-8 rounded-l-full bg-coral" />
    </div>
  );
}
