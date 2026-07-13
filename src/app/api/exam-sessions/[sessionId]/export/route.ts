import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { xlsxResponse } from "@/lib/xlsx";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE: "Pilihan Ganda (multi jawaban)",
  SHORT_ANSWER: "Isian Singkat",
  ESSAY: "Essay",
};

/**
 * Export jawaban milik sendiri untuk peserta. Tidak perlu login terpisah —
 * sessionId sudah berfungsi sebagai bearer token untuk seluruh alur peserta
 * (sama seperti /exam/[sessionId]). Hanya bisa diakses setelah ujian selesai
 * agar tidak membocorkan progres jawaban saat masih berlangsung.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: { include: { questions: { orderBy: { order: "asc" } } } },
      answers: { include: { choices: { include: { choice: true } } } },
    },
  });

  if (!examSession || examSession.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "Belum bisa diekspor" }, { status: 404 });
  }

  const answerByQuestionId = new Map(examSession.answers.map((a) => [a.questionId, a]));

  const headers = ["No", "Pertanyaan", "Tipe Soal", "Jawaban Saya", "Skor Diperoleh", "Total Poin"];

  const rows = examSession.exam.questions.map((q, i) => {
    const answer = answerByQuestionId.get(q.id);
    let answerText = "Tidak dijawab";

    if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
      const chosen = answer?.choices.map((c) => c.choice.text) ?? [];
      if (chosen.length > 0) answerText = chosen.join("; ");
    } else if (answer?.textAnswer?.trim()) {
      answerText = answer.textAnswer;
    }

    const scoreLabel =
      q.type === "ESSAY" && answer?.needsManualGrading
        ? "Menunggu penilaian"
        : String(answer?.score ?? 0);

    return [i + 1, q.text, TYPE_LABELS[q.type] ?? q.type, answerText, scoreLabel, q.points];
  });

  return xlsxResponse(`jawaban-saya-${examSession.exam.code}.xlsx`, "Jawaban Saya", headers, rows);
}
