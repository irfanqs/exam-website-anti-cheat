"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        durationMinutes: Number(form.get("durationMinutes")),
        tabViolationTolerance: Number(form.get("tabViolationTolerance")),
        requireFullscreen: form.get("requireFullscreen") === "on",
      }),
    });

    setLoading(false);
    router.push("/admin");
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
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Deskripsi</label>
          <textarea
            name="description"
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
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
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Toleransi Pindah Tab (kali, sebelum auto-submit)
          </label>
          <input
            name="tabViolationTolerance"
            type="number"
            min={0}
            required
            defaultValue={0}
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="requireFullscreen" type="checkbox" />
          Wajibkan mode fullscreen selama ujian
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Ujian"}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Setelah dibuat, tambahkan soal dari halaman dashboard sebelum publish.
          Manajemen soal (§4.2) belum diimplementasi di scaffold ini.
        </p>
      </form>
    </div>
  );
}
