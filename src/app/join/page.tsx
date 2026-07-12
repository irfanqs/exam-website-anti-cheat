"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal masuk ujian");
      return;
    }

    const { sessionId } = await res.json();
    router.push(`/exam/${sessionId}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-black/[.08] p-8 dark:border-white/[.145]"
      >
        <h1 className="text-xl font-semibold">Masuk Ujian</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Kode Ujian</label>
          <input
            required
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
            placeholder="mis. UAS-2026-01"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Nama Lengkap</label>
          <input
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
            placeholder="Nama sesuai identitas"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Mulai Ujian"}
        </button>
      </form>
    </div>
  );
}
