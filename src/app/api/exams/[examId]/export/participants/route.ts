import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOwnedExam } from "@/lib/exam-ownership";
import { xlsxResponse } from "@/lib/xlsx";
import { VIOLATION_REASON } from "@/lib/violation-labels";

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "Sedang mengerjakan",
  SUBMITTED: "Selesai",
  AUTO_SUBMITTED_TIMEOUT: "Waktu habis",
  AUTO_SUBMITTED_VIOLATION: "Terindikasi curang",
};

export async function GET(
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

  const [sessions, pointsAgg] = await Promise.all([
    prisma.examSession.findMany({
      where: { examId },
      orderBy: { createdAt: "asc" },
      include: { violations: true },
    }),
    prisma.question.aggregate({ where: { examId }, _sum: { points: true } }),
  ]);

  const totalPoints = pointsAgg._sum.points ?? 0;

  const headers = [
    "Nama",
    "Referensi",
    "Status",
    "Skor",
    "Total Poin",
    "Waktu Mulai",
    "Waktu Submit",
    "Jumlah Pelanggaran",
    "Ringkasan Pelanggaran",
  ];

  const rows = sessions.map((s) => {
    const violationCounts = s.violations.reduce<Record<string, number>>((acc, v) => {
      acc[v.type] = (acc[v.type] ?? 0) + 1;
      return acc;
    }, {});
    const violationSummary = Object.entries(violationCounts)
      .map(
        ([type, count]) =>
          `${count}x ${VIOLATION_REASON[type as keyof typeof VIOLATION_REASON]}`
      )
      .join("; ");

    return [
      s.participantName,
      s.participantRef ?? "",
      STATUS_LABELS[s.status] ?? s.status,
      s.totalScore ?? 0,
      totalPoints,
      s.startedAt.toISOString(),
      s.submittedAt ? s.submittedAt.toISOString() : "",
      s.violations.length,
      violationSummary,
    ];
  });

  return xlsxResponse(`rekap-${exam.code}.xlsx`, "Rekap Nilai", headers, rows);
}
