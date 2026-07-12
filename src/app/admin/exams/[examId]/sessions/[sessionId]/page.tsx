import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SessionGrading } from "./SessionGrading";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ examId: string; sessionId: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/admin/login");

  const { examId, sessionId } = await params;

  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: { include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } } },
      answers: { include: { choices: true } },
    },
  });

  if (
    !examSession ||
    examSession.examId !== examId ||
    examSession.exam.adminId !== authSession.user.id
  ) {
    notFound();
  }

  const answerByQuestionId = new Map(examSession.answers.map((a) => [a.questionId, a]));

  return (
    <SessionGrading
      examId={examId}
      sessionId={sessionId}
      participantName={examSession.participantName}
      totalScore={examSession.totalScore}
      totalPoints={examSession.exam.questions.reduce((sum, q) => sum + q.points, 0)}
      questions={examSession.exam.questions.map((q) => {
        const answer = answerByQuestionId.get(q.id);
        return {
          id: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          correctTextAnswer: q.correctTextAnswer,
          choices: q.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
          answer: answer
            ? {
                id: answer.id,
                textAnswer: answer.textAnswer,
                choiceIds: answer.choices.map((c) => c.choiceId),
                score: answer.score,
                needsManualGrading: answer.needsManualGrading,
              }
            : null,
        };
      })}
    />
  );
}
