import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamRunner } from "./ExamRunner";

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
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-lg">
          Ujian ini sudah selesai dikerjakan (status: {session.status}).
        </p>
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
