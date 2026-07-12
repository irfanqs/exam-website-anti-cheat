import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { sessionId, questionId, textAnswer, choiceIds } = await req.json();

  if (!sessionId || !questionId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
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
