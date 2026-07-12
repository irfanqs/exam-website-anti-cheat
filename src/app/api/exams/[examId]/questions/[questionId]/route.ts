import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";

const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId, questionId } = await params;
  const exam = await getOwnedExam(examId, session.user.id);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (exam.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Soal hanya bisa diedit selagi ujian berstatus draft" },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.examId !== examId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { type, text, points, choices, correctTextAnswer } = await req.json();

  if (!text || !points || !QUESTION_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const isChoiceType = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
  if (isChoiceType && (!Array.isArray(choices) || choices.length < 2)) {
    return NextResponse.json(
      { error: "Soal pilihan ganda butuh minimal 2 opsi" },
      { status: 400 }
    );
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      type,
      text,
      points,
      correctTextAnswer: type === "SHORT_ANSWER" ? correctTextAnswer ?? null : null,
      choices: isChoiceType
        ? {
            deleteMany: {},
            create: choices.map((c: { text: string; isCorrect: boolean }, i: number) => ({
              text: c.text,
              isCorrect: !!c.isCorrect,
              order: i,
            })),
          }
        : { deleteMany: {} },
    },
    include: { choices: true },
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId, questionId } = await params;
  const exam = await getOwnedExam(examId, session.user.id);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (exam.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Soal hanya bisa dihapus selagi ujian berstatus draft" },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.examId !== examId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ ok: true });
}
