import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { VIOLATION_REASON } from "@/lib/violation-labels";
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
          violations: { select: { type: true } },
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
        correctTextAnswer: q.correctTextAnswer,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
      }))}
      participants={exam.sessions.map((s) => {
        const violationCounts = s.violations.reduce<Record<string, number>>((acc, v) => {
          acc[v.type] = (acc[v.type] ?? 0) + 1;
          return acc;
        }, {});

        const violationSummary = Object.entries(violationCounts)
          .map(([type, count]) => `${count}x ${VIOLATION_REASON[type as keyof typeof VIOLATION_REASON]}`)
          .join(", ");

        return {
          id: s.id,
          participantName: s.participantName,
          status: s.status,
          violationCount: s.violations.length,
          violationSummary,
          totalScore: s.totalScore,
          totalPoints,
          pendingGrading: s.answers.filter((a) => a.needsManualGrading).length,
        };
      })}
    />
  );
}
