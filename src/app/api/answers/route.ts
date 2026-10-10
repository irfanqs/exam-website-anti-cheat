import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireSession } from "@/lib/session-deadline";

export async function POST(req: NextRequest) {
  const { sessionId, questionId, textAnswer, choiceIds } = await req.json();

  if (!sessionId || !questionId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: { select: { durationMinutes: true } } },
  });
  if (!session || session.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
  }
  // Batas waktu ditegakkan di server: jawaban yang datang setelah waktu
  // habis ditolak walau timer di browser peserta dimanipulasi.
  if (await expireSession(session, session.exam)) {
    return NextResponse.json({ error: "Waktu ujian sudah habis" }, { status: 409 });
  }

  const answer = await prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      textAnswer: textAnswer ?? null,
      choices: choiceIds
        ? { create: choiceIds.map((choiceId: string) => ({ choiceId })) }
        : undefined,
    },
    update: {
      textAnswer: textAnswer ?? null,
      ...(choiceIds
        ? {
            choices: {
              deleteMany: {},
              create: choiceIds.map((choiceId: string) => ({ choiceId })),
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ answer });
}
