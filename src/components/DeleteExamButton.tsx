"use client";

import { useRouter } from "next/navigation";

export function DeleteExamButton({ examId, title }: { examId: string; title: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (
      !confirm(
        `Hapus ujian "${title}" beserta seluruh soal, peserta, dan jawabannya? Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus ujian");
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
    >
      Hapus
    </button>
  );
}
