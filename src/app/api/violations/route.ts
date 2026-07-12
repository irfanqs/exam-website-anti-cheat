import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VIOLATION_TYPES = ["TAB_HIDDEN", "WINDOW_BLUR", "EXIT_FULLSCREEN"] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, type } = body as { sessionId?: string; type?: string };

  if (!sessionId || !VIOLATION_TYPES.includes(type as (typeof VIOLATION_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: true, violations: true },
  });

  if (!session || session.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
  }

  await prisma.violationLog.create({
    data: { sessionId, type: type as (typeof VIOLATION_TYPES)[number] },
  });

  const violationCount = session.violations.length + 1;
  const limitReached = violationCount > session.exam.tabViolationTolerance;

  if (limitReached) {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "AUTO_SUBMITTED_VIOLATION", submittedAt: new Date() },
    });
  }

  return NextResponse.json({ violationCount, limitReached });
}
