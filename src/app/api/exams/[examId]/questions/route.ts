import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";

const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId } = await params;
  const exam = await getOwnedExam(examId, session.user.id);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (exam.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Soal hanya bisa ditambahkan selagi ujian berstatus draft" },
      { status: 400 }
    );
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

  const questionCount = await prisma.question.count({ where: { examId } });

  const question = await prisma.question.create({
    data: {
      examId,
      type,
      text,
      points,
      order: questionCount,
      correctTextAnswer: type === "SHORT_ANSWER" ? correctTextAnswer ?? null : null,
      choices: isChoiceType
        ? {
            create: choices.map((c: { text: string; isCorrect: boolean }, i: number) => ({
              text: c.text,
              isCorrect: !!c.isCorrect,
              order: i,
            })),
          }
        : undefined,
    },
    include: { choices: true },
  });

  return NextResponse.json({ question });
}
