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

  if (exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Ujian tidak dalam status published" }, { status: 400 });
  }

  const sessionCount = await prisma.examSession.count({ where: { examId } });
  if (sessionCount > 0) {
    return NextResponse.json(
      { error: "Tidak bisa unpublish, sudah ada peserta yang mengerjakan ujian ini" },
      { status: 400 }
    );
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: "DRAFT" },
  });

  return NextResponse.json({ exam: updated });
}
