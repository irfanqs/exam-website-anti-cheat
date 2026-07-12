import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSession } from "@/lib/scoring";

const STATUS_BY_REASON = {
  manual: "SUBMITTED",
  timeout: "AUTO_SUBMITTED_TIMEOUT",
  violation: "AUTO_SUBMITTED_VIOLATION",
} as const;

export async function POST(req: NextRequest) {
  const { sessionId, reason } = await req.json();

  if (!sessionId || !(reason in STATUS_BY_REASON)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "IN_PROGRESS") {
    // Sudah disubmit sebelumnya (mis. oleh /api/violations) — anggap idempotent.
    return NextResponse.json({ ok: true });
  }

  await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: STATUS_BY_REASON[reason as keyof typeof STATUS_BY_REASON],
      submittedAt: new Date(),
    },
  });

  await scoreSession(sessionId);

  return NextResponse.json({ ok: true });
}
