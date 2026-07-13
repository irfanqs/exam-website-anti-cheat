import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { CopyCodeButton } from "@/components/CopyCodeButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const exams = await prisma.exam.findMany({
    where: { adminId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true, questions: true } },
      sessions: { select: { status: true, _count: { select: { violations: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Ujian</h1>
          <p className="text-sm text-zinc-500">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/exams/new"
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-transform hover:scale-[1.02]"
          >
            + Buat Ujian
          </Link>
          <SignOutButton />
        </div>
      </div>

      {exams.length === 0 ? (
        <p className="text-zinc-500">Belum ada ujian. Buat ujian pertama Anda.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const flaggedCount = exam.sessions.filter(
              (s) => s.status === "AUTO_SUBMITTED_VIOLATION"
            ).length;
            const violatedCount = exam.sessions.filter(
              (s) => s._count.violations > 0
            ).length;

            return (
            <div
              key={exam.id}
              className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-sm text-zinc-500">
                  Kode: {exam.code} · {exam._count.questions} soal ·{" "}
                  {exam._count.sessions} peserta · {exam.status}
                </p>
                {violatedCount > 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    ⚠ {violatedCount} peserta terdeteksi berpindah tab
                    {flaggedCount > 0 &&
                      ` · ${flaggedCount} di antaranya dihentikan otomatis karena melebihi batas pelanggaran`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CopyCodeButton
                  code={exam.code}
                  className="rounded-lg border border-black/[.08] bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                />
                <Link
                  href={`/admin/exams/${exam.id}`}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-transform hover:scale-[1.02]"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
