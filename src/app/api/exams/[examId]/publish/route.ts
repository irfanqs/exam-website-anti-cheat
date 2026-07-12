import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";

export async function POST(
  _req: NextRequest,
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

  const questionCount = await prisma.question.count({ where: { examId } });
  if (questionCount === 0) {
    return NextResponse.json(
      { error: "Tambahkan minimal 1 soal sebelum publish" },
      { status: 400 }
    );
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({ exam: updated });
}
