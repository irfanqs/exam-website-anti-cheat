"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";

export default function JoinPage() {
  const router = useRouter();
  const [examCode, setExamCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDebugError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examCode, participantName }),
      });

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
      setError("Terjadi kesalahan saat mencoba masuk ujian.");
      setDebugError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCopyDebugError() {
    if (debugError) await navigator.clipboard.writeText(debugError);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-4 w-full max-w-sm">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Kembali ke Beranda
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-black/[.08] bg-white/80 p-8 shadow-lg shadow-blue-100/50 backdrop-blur"
      >
        <h1 className="text-xl font-semibold">Masuk Ujian</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Kode Ujian</label>
          <input
            required
            value={examCode}
            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 uppercase"
            placeholder="mis. 16HKR4"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Nama Lengkap</label>
          <input
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
            placeholder="Nama sesuai identitas"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-md shadow-blue-200 transition-transform hover:scale-[1.01] disabled:opacity-70"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Memproses..." : "Mulai Ujian"}
        </button>
      </form>

      {debugError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-red-300 bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-red-600">⚠ Detail Error</p>
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-left text-xs text-zinc-700">
              {debugError}
            </p>
            <p className="text-xs text-zinc-500">
              Screenshot atau salin teks di atas dan kirim ke admin/penyelenggara ujian
              supaya bisa ditelusuri penyebabnya.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyDebugError}
                className="flex-1 rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Salin Detail
              </button>
              <button
                onClick={() => setDebugError(null)}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200"
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
