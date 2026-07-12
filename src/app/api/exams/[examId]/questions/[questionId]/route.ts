import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";

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

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.examId !== examId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ ok: true });
}
