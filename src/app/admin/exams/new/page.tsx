"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
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
    <div className="shell max-w-lg">
      <Link href="/admin" className="back-link mb-4 inline-block">
        ← Kembali ke Dashboard
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">
        <span className="marker">Buat Ujian Baru</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="label">Judul Ujian</label>
          <input
            name="title"
            required
            className="input"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Deskripsi</label>
          <textarea
            name="description"
            className="input"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Durasi Pengerjaan (menit)</label>
          <input
            name="durationMinutes"
            type="number"
            min={1}
            required
            defaultValue={60}
            className="input"
          />
        </div>

        <div className="space-y-3 card p-4">
          <label className="flex items-center justify-between text-sm font-medium">
            Anti Cheat
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={antiCheatEnabled}
              onChange={(e) => setAntiCheatEnabled(e.target.checked)}
            />
          </label>

          {antiCheatEnabled ? (
            <>
              <p className="text-xs text-muted">
                Peserta tidak diperbolehkan berpindah tab, membuka jendela lain,
                atau keluar dari halaman ujian. Pilih aksi saat peserta melanggar:
              </p>

              <div className="space-y-1">
                <select
                  name="violationAction"
                  defaultValue="AUTO_SUBMIT"
                  className="input"
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
                  defaultValue={2}
                  className="input"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input name="requireFullscreen" type="checkbox" />
                Wajibkan mode fullscreen selama ujian
              </label>
              <p className="text-xs text-muted">
                Catatan: Safari di iPhone tidak mendukung mode fullscreen untuk
                halaman web, sehingga syarat ini tidak berlaku bagi peserta iPhone.
                Keluar halaman kurang dari 4 detik (mis. layar terkunci sesaat)
                tidak dihitung sebagai pelanggaran.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">
              Anti Cheat nonaktif — peserta bebas berpindah tab, membuka aplikasi
              lain, atau keluar dari halaman ujian tanpa sanksi apa pun.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-brick">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Menyimpan..." : "Simpan Ujian"}
        </button>

        <p className="text-center text-xs text-muted">
          Setelah disimpan, Anda akan diarahkan ke halaman ujian untuk
          menambahkan soal sebelum publish.
        </p>
      </form>
    </div>
  );
}
