import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ExamDetail } from "./ExamDetail";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { include: { choices: true }, orderBy: { order: "asc" } },
      sessions: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { violations: true } },
          answers: { select: { needsManualGrading: true } },
        },
      },
    },
  });

  if (!exam || exam.adminId !== session.user.id) notFound();

  const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <ExamDetail
      examId={exam.id}
      title={exam.title}
      code={exam.code}
      status={exam.status}
      questions={exam.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
      }))}
      participants={exam.sessions.map((s) => ({
        id: s.id,
        participantName: s.participantName,
        status: s.status,
        violationCount: s._count.violations,
        totalScore: s.totalScore,
        totalPoints,
        pendingGrading: s.answers.filter((a) => a.needsManualGrading).length,
      }))}
    />
  );
}
