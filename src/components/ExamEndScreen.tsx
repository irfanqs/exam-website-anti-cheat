import Link from "next/link";

/**
 * Layar akhir ujian (selesai, waktu habis, atau dihentikan karena
 * pelanggaran). `stopped` menampilkan varian merah untuk penghentian paksa.
 */
export function ExamEndScreen({ message, stopped = false }: { message: string; stopped?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="shell flex max-w-md flex-col items-center gap-5 text-center">
        <span
          className={`flex h-24 w-24 items-center justify-center rounded-full border-[2.5px] border-ink text-5xl shadow-[4px_4px_0_#1b1b1b] ${
            stopped ? "bg-coral text-white" : "bg-leaf"
          }`}
          aria-hidden
        >
          {stopped ? "!" : "✓"}
        </span>
        <h1 className="text-2xl font-semibold">
          {stopped ? (
            <>
              Ujian <span className="text-coral">dihentikan</span>
            </>
          ) : (
            <>
              Ujian <span className="text-coral">selesai</span>!
            </>
          )}
        </h1>
        <p className="text-base leading-7">{message}</p>
        <p className="text-sm text-muted">Terima kasih telah mengerjakan ujian ini.</p>
        <Link href="/" className="btn btn-primary">
          ← Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
