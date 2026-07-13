import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamRunner } from "./ExamRunner";
import { VIOLATION_REASON } from "@/lib/violation-labels";

const STATUS_MESSAGES: Record<string, string> = {
  SUBMITTED: "Ujian sudah selesai dikerjakan. Jawaban Anda sudah tersimpan.",
  AUTO_SUBMITTED_TIMEOUT:
    "Waktu pengerjaan habis. Jawaban yang sudah terisi otomatis tersimpan.",
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: { include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } } } },
  });

  if (!session) notFound();

  if (session.status !== "IN_PROGRESS") {
    let message = STATUS_MESSAGES[session.status] ?? "Ujian ini sudah selesai dikerjakan.";

    if (session.status === "AUTO_SUBMITTED_VIOLATION") {
      const lastViolation = await prisma.violationLog.findFirst({
        where: { sessionId: session.id },
        orderBy: { occurredAt: "desc" },
      });
      const reason = lastViolation ? VIOLATION_REASON[lastViolation.type] : "terdeteksi pelanggaran";
      message = `Ujian dihentikan otomatis karena Anda terdeteksi ${reason}.`;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-lg">{message}</p>
        <a
          href={`/api/exam-sessions/${session.id}/export`}
          className="rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
        >
          ⬇ Download Jawaban Saya (CSV)
        </a>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const deadline = new Date(
    session.startedAt.getTime() + session.exam.durationMinutes * 60_000
  ).toISOString();

  return (
    <ExamRunner
      sessionId={session.id}
      deadline={deadline}
      examTitle={session.exam.title}
      antiCheatEnabled={session.exam.antiCheatEnabled}
      requireFullscreen={session.exam.requireFullscreen}
      questions={session.exam.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
      }))}
    />
  );
}
