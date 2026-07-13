import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";
import { xlsxResponse } from "@/lib/xlsx";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE: "Pilihan Ganda (multi jawaban)",
  SHORT_ANSWER: "Isian Singkat",
  ESSAY: "Essay",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId, sessionId } = await params;
  const exam = await getOwnedExam(examId, session.user.id);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { answers: { include: { choices: { include: { choice: true } } } } },
  });

  if (!examSession || examSession.examId !== examId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const questions = await prisma.question.findMany({
    where: { examId },
    orderBy: { order: "asc" },
  });

  const answerByQuestionId = new Map(examSession.answers.map((a) => [a.questionId, a]));

  const headers = ["No", "Pertanyaan", "Tipe Soal", "Jawaban Peserta", "Skor", "Total Poin"];

  const rows = questions.map((q, i) => {
    const answer = answerByQuestionId.get(q.id);
    let answerText = "Tidak dijawab";

    if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
      const chosen = answer?.choices.map((c) => c.choice.text) ?? [];
      if (chosen.length > 0) answerText = chosen.join("; ");
    } else if (answer?.textAnswer?.trim()) {
      answerText = answer.textAnswer;
    }

    return [i + 1, q.text, TYPE_LABELS[q.type] ?? q.type, answerText, answer?.score ?? 0, q.points];
  });

  return xlsxResponse(
    `jawaban-${examSession.participantName.replace(/\s+/g, "-")}.xlsx`,
    "Jawaban",
    headers,
    rows
  );
}
