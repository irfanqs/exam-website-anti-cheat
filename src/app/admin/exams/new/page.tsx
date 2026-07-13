"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";

export default function NewExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        durationMinutes: Number(form.get("durationMinutes")),
        antiCheatEnabled,
        violationAction: antiCheatEnabled ? form.get("violationAction") : "LOG_ONLY",
        tabViolationTolerance: Number(form.get("tabViolationTolerance")),
        requireFullscreen: antiCheatEnabled && form.get("requireFullscreen") === "on",
      }),
    });

    if (!res.ok) {
      setLoading(false);
      const data = await res.json();
      setError(data.error ?? "Gagal membuat ujian");
      return;
    }

    const { exam } = await res.json();
    router.push(`/admin/exams/${exam.id}`);
    // loading tetap true — halaman tujuan punya loading.tsx sendiri
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold">Buat Ujian Baru</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium">Judul Ujian</label>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Deskripsi</label>
          <textarea
            name="description"
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Durasi Pengerjaan (menit)</label>
          <input
            name="durationMinutes"
            type="number"
            min={1}
            required
            defaultValue={60}
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-black/[.08] bg-white/70 p-4 shadow-sm backdrop-blur">
          <label className="flex items-center justify-between text-sm font-medium">
            Anti Cheat
            <input
              type="checkbox"
              checked={antiCheatEnabled}
              onChange={(e) => setAntiCheatEnabled(e.target.checked)}
            />
          </label>

          {antiCheatEnabled ? (
            <>
              <p className="text-xs text-zinc-500">
                Peserta tidak diperbolehkan berpindah tab, membuka jendela lain,
                atau keluar dari halaman ujian. Pilih aksi saat peserta melanggar:
              </p>

              <div className="space-y-1">
                <select
                  name="violationAction"
                  defaultValue="AUTO_SUBMIT"
                  className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm"
                >
                  <option value="WARN">Beri peringatan ke peserta</option>
                  <option value="LOG_ONLY">Catat pelanggaran saja (diam-diam)</option>
                  <option value="AUTO_SUBMIT">Akhiri ujian otomatis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Toleransi pelanggaran sebelum aksi dijalankan (kali)
                </label>
                <input
                  name="tabViolationTolerance"
                  type="number"
                  min={0}
                  required
                  defaultValue={0}
                  className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input name="requireFullscreen" type="checkbox" />
                Wajibkan mode fullscreen selama ujian
              </label>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              Anti Cheat nonaktif — peserta bebas berpindah tab, membuka aplikasi
              lain, atau keluar dari halaman ujian tanpa sanksi apa pun.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-sm shadow-blue-200 transition-transform hover:scale-[1.01] disabled:opacity-70"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Menyimpan..." : "Simpan Ujian"}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Setelah disimpan, Anda akan diarahkan ke halaman ujian untuk
          menambahkan soal sebelum publish.
        </p>
      </form>
    </div>
  );
}
