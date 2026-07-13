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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examCode, participantName }),
    });

    if (!res.ok) {
      setLoading(false);
      const data = await res.json();
      setError(data.error ?? "Gagal masuk ujian");
      return;
    }

    const { sessionId } = await res.json();
    router.push(`/exam/${sessionId}`);
    // loading tetap true — halaman /exam/[sessionId] akan menampilkan
    // loading.tsx sendiri sambil query database berjalan.
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
            onChange={(e) => setExamCode(e.target.value)}
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
            placeholder="mis. UAS-2026-01"
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
    </div>
  );
}
