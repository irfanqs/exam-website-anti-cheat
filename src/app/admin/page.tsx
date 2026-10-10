import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { expireOverdueSessions } from "@/lib/session-deadline";
import { SignOutButton } from "@/components/SignOutButton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { DeleteExamButton } from "@/components/DeleteExamButton";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  await expireOverdueSessions({ adminId: session.user.id });

  const exams = await prisma.exam.findMany({
    where: { adminId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true, questions: true } },
      sessions: { select: { status: true, _count: { select: { violations: true } } } },
    },
  });

  const STATUS_PILL: Record<string, string> = {
    DRAFT: "bg-paper",
    PUBLISHED: "bg-leaf",
    CLOSED: "bg-coral text-white",
  };

  return (
    <div className="shell max-w-3xl pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Avatar name={session.user.name ?? session.user.email ?? "Admin"} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">Dashboard Ujian</h1>
          <p className="truncate text-sm text-muted">{session.user.email}</p>
        </div>
        <span className="pill hidden bg-sky sm:inline-flex">{exams.length} ujian</span>
        <SignOutButton />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span className="marker">Ujian Saya</span>
        </h2>
        <Link href="/admin/exams/new" className="btn btn-primary btn-sm hidden sm:inline-flex">
          + Buat Ujian
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted">Belum ada ujian. Buat ujian pertama Anda.</p>
        </div>
      ) : (
        <div className="card divide-y-2 divide-ink overflow-hidden">
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
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={exam.title} className="h-11 w-11 text-base" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{exam.title}</p>
                    <span className={`pill ${STATUS_PILL[exam.status] ?? "bg-paper"}`}>
                      {exam.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    Kode <span className="font-semibold text-ink">{exam.code}</span> ·{" "}
                    {exam._count.questions} soal · {exam._count.sessions} peserta
                  </p>
                  {violatedCount > 0 && (
                    <p className="mt-1 text-sm font-medium text-brick">
                      ⚠ {violatedCount} peserta terdeteksi berpindah tab
                      {flaggedCount > 0 &&
                        ` · ${flaggedCount} di antaranya dihentikan otomatis karena melebihi batas pelanggaran`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <CopyCodeButton code={exam.code} />
                <Link href={`/admin/exams/${exam.id}`} className="btn btn-primary btn-sm">
                  Lihat Detail
                </Link>
                <DeleteExamButton examId={exam.id} title={exam.title} />
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Link href="/admin/exams/new" className="fab" aria-label="Buat ujian baru">
        +
      </Link>
    </div>
  );
}
