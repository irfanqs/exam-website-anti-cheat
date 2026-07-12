import { prisma } from "@/lib/prisma";

/**
 * Auto-scoring untuk soal objektif (PRD §4.5). Soal ESSAY tidak
 * punya kunci jawaban otomatis — ditandai needsManualGrading dan
 * dinilai admin lewat endpoint grade terpisah.
 */
export async function scoreSession(sessionId: string) {
  const answers = await prisma.answer.findMany({
    where: { sessionId },
    include: {
      question: { include: { choices: true } },
      choices: true,
    },
  });

  for (const answer of answers) {
    const { question } = answer;

    if (question.type === "ESSAY") {
      if (answer.score === null) {
        await prisma.answer.update({
          where: { id: answer.id },
          data: { needsManualGrading: true },
        });
      }
      continue;
    }

    let isCorrect = false;

    if (question.type === "SINGLE_CHOICE") {
      const selected = answer.choices[0]?.choiceId;
      const correct = question.choices.find((c) => c.isCorrect)?.id;
      isCorrect = !!selected && selected === correct;
    } else if (question.type === "MULTIPLE_CHOICE") {
      const selectedIds = new Set(answer.choices.map((c) => c.choiceId));
      const correctIds = new Set(
        question.choices.filter((c) => c.isCorrect).map((c) => c.id)
      );
      isCorrect =
        selectedIds.size === correctIds.size &&
        [...selectedIds].every((id) => correctIds.has(id));
    } else if (question.type === "SHORT_ANSWER") {
      const given = answer.textAnswer?.trim().toLowerCase() ?? "";
      const correct = question.correctTextAnswer?.trim().toLowerCase() ?? "";
      isCorrect = given.length > 0 && given === correct;
    }

    await prisma.answer.update({
      where: { id: answer.id },
      data: { score: isCorrect ? question.points : 0, needsManualGrading: false },
    });
  }

  await recomputeTotalScore(sessionId);
}

export async function recomputeTotalScore(sessionId: string) {
  const answers = await prisma.answer.findMany({ where: { sessionId } });
  const total = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { totalScore: total },
  });

  return total;
}
