import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true, questions: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard Ujian</h1>
        <Link
          href="/admin/exams/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          + Buat Ujian
        </Link>
      </div>

      {exams.length === 0 ? (
        <p className="text-zinc-500">Belum ada ujian. Buat ujian pertama Anda.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-sm text-zinc-500">
                  Kode: {exam.code} · {exam._count.questions} soal ·{" "}
                  {exam._count.sessions} peserta · {exam.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
