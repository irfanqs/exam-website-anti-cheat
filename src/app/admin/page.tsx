import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const exams = await prisma.exam.findMany({
    where: { adminId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true, questions: true } } },
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
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
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
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="flex items-center justify-between rounded-xl border border-black/[.08] p-4 hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.03]"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-sm text-zinc-500">
                  Kode: {exam.code} · {exam._count.questions} soal ·{" "}
                  {exam._count.sessions} peserta · {exam.status}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
