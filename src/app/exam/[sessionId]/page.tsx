import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamRunner } from "./ExamRunner";
import { ExamEndScreen } from "@/components/ExamEndScreen";
import { VIOLATION_REASON } from "@/lib/violation-labels";
import { expireSession, getDeadline } from "@/lib/session-deadline";

const STATUS_MESSAGES: Record<string, string> = {
  SUBMITTED: "Jawaban Anda sudah tersimpan.",
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
    include: {
      exam: { include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } } },
      answers: { include: { choices: { select: { choiceId: true } } } },
    },
  });

  if (!session) notFound();

  // Waktu habis saat peserta tidak membuka halaman (tab tertutup, HP mati):
  // tutup & nilai sesinya sekarang, lalu tampilkan layar akhir.
  if (await expireSession(session, session.exam)) {
    session.status = "AUTO_SUBMITTED_TIMEOUT";
  }

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
      <ExamEndScreen
        message={message}
        stopped={session.status === "AUTO_SUBMITTED_VIOLATION"}
      />
    );
  }

  const deadline = getDeadline(session, session.exam).toISOString();

  return (
    <ExamRunner
      sessionId={session.id}
      deadline={deadline}
      examTitle={session.exam.title}
      participantName={session.participantName}
      initialAnswers={Object.fromEntries(
        session.answers.map((a) => [
          a.questionId,
          { textAnswer: a.textAnswer, choiceIds: a.choices.map((c) => c.choiceId) },
        ])
      )}
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
