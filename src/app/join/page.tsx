"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

const JOIN_RETRY_DELAYS_MS = [1000, 2500];

export default function JoinPage() {
  const router = useRouter();
  const [examCode, setExamCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantRef, setParticipantRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDebugError(null);
    setLoading(true);

    try {
      // Aman diulang: server mengembalikan sesi yang sama untuk identitas yang
      // sama (lihat /api/sessions), jadi retry tidak membuat sesi ganda.
      const res = await fetchWithRetry(
        "/api/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examCode, participantName, participantRef }),
        },
        JOIN_RETRY_DELAYS_MS
      );

      let data: { sessionId?: string; deadline?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Server merespons dengan format tak terduga (HTTP ${res.status}). Isi respons: ${
            text.slice(0, 300) || "(kosong)"
          }`
        );
      }

      if (!res.ok) {
        setLoading(false);
        setError(data.error ?? "Gagal masuk ujian");
        setDebugError(`HTTP ${res.status} — ${JSON.stringify(data)}`);
        return;
      }

      router.push(`/exam/${data.sessionId}`);
      // loading tetap true — halaman /exam/[sessionId] akan menampilkan
      // loading.tsx sendiri sambil query database berjalan.
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      // fetch() hanya reject (TypeError "Failed to fetch") kalau request tidak
      // sampai ke server sama sekali — biasanya sinyal HP putus/lemah.
      if (err instanceof TypeError) {
        setError(
          "Koneksi internet terputus atau tidak stabil. Periksa sinyal/Wi-Fi lalu tekan Mulai Ujian lagi."
        );
        setDebugError(
          `${message} (tidak ada respons dari server, online: ${navigator.onLine ? "ya" : "tidak"})`
        );
        return;
      }
      setError("Terjadi kesalahan saat mencoba masuk ujian.");
      setDebugError(message);
    }
  }

  async function handleCopyDebugError() {
    if (debugError) await navigator.clipboard.writeText(debugError);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-3 w-full max-w-sm px-2">
        <Link href="/" className="back-link">
          ← Kembali ke Beranda
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shell my-0 max-w-sm space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            <span className="marker">Masuk Ujian</span>
          </h1>
          <p className="text-sm text-muted">Masukkan kode dari pengawas dan identitas Anda.</p>
        </div>

        <div className="space-y-1">
          <label className="label">Kode Ujian</label>
          <input
            required
            value={examCode}
            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
            className="input text-center text-lg font-semibold tracking-[0.3em] uppercase"
            placeholder="mis. 16HKR4"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Nama Lengkap</label>
          <input
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="input"
            placeholder="Nama sesuai identitas"
          />
        </div>

        <div className="space-y-1">
          <label className="label">NIM / NIS / Email</label>
          <input
            required
            value={participantRef}
            onChange={(e) => setParticipantRef(e.target.value)}
            className="input"
            placeholder="mis. 2023010045"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="text-xs text-muted">
            Dipakai untuk melanjutkan ujian jika halaman tertutup. Satu identitas hanya
            bisa mengerjakan ujian ini sekali.
          </p>
        </div>

        {error && <p className="text-sm font-medium text-brick">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Memproses..." : "Mulai Ujian"}
        </button>
      </form>

      {debugError && (
        <div className="modal-backdrop">
          <div className="modal max-w-md space-y-4">
            <p className="text-lg font-semibold text-coral">⚠ Detail Error</p>
            <p className="max-h-60 overflow-y-auto rounded-xl border-2 border-ink bg-white p-3 text-left text-xs break-words whitespace-pre-wrap">
              {debugError}
            </p>
            <p className="text-xs text-muted">
              Screenshot atau salin teks di atas dan kirim ke admin/penyelenggara ujian
              supaya bisa ditelusuri penyebabnya.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyDebugError}
                className="btn flex-1 text-sm"
              >
                Salin Detail
              </button>
              <button
                onClick={() => setDebugError(null)}
                className="btn btn-primary flex-1 text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
