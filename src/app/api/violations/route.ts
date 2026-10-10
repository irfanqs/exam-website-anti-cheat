import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSession } from "@/lib/scoring";
import { expireSession } from "@/lib/session-deadline";

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
  if (await expireSession(session, session.exam)) {
    return NextResponse.json({ error: "Waktu ujian sudah habis" }, { status: 409 });
  }

  // Jika admin menonaktifkan Anti Cheat untuk ujian ini, peserta bebas
  // berpindah tab tanpa sanksi — event tidak dicatat maupun ditindak.
  if (!session.exam.antiCheatEnabled) {
    return NextResponse.json({
      violationCount: 0,
      tolerance: session.exam.tabViolationTolerance,
      action: "LOG_ONLY",
      limitReached: false,
      type,
    });
  }

  await prisma.violationLog.create({
    data: { sessionId, type: type as (typeof VIOLATION_TYPES)[number] },
  });

  const violationCount = session.violations.length + 1;
  const tolerance = session.exam.tabViolationTolerance;
  const action = session.exam.violationAction;
  const limitReached = action === "AUTO_SUBMIT" && violationCount > tolerance;

  if (limitReached) {
    const { count } = await prisma.examSession.updateMany({
      where: { id: sessionId, status: "IN_PROGRESS" },
      data: { status: "AUTO_SUBMITTED_VIOLATION", submittedAt: new Date() },
    });
    if (count > 0) await scoreSession(sessionId);
  }

  return NextResponse.json({ violationCount, tolerance, action, limitReached, type });
}
