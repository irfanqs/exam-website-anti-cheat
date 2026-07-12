import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";
import { recomputeTotalScore } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
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

  const { answerId, score } = await req.json();
  if (!answerId || typeof score !== "number" || score < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const answer = await prisma.answer.findUnique({
    where: { id: answerId },
    include: { question: true },
  });

  if (!answer || answer.sessionId !== sessionId || answer.question.type !== "ESSAY") {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  if (score > answer.question.points) {
    return NextResponse.json(
      { error: `Skor tidak boleh melebihi bobot soal (${answer.question.points})` },
      { status: 400 }
    );
  }

  await prisma.answer.update({
    where: { id: answerId },
    data: { score, needsManualGrading: false },
  });

  const totalScore = await recomputeTotalScore(sessionId);

  return NextResponse.json({ totalScore });
}
