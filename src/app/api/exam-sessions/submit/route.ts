import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSession } from "@/lib/scoring";
import { expireSession } from "@/lib/session-deadline";

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

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: { select: { durationMinutes: true } } },
  });
  if (!session || session.status !== "IN_PROGRESS") {
    // Sudah disubmit sebelumnya (mis. oleh /api/violations) — anggap idempotent.
    return NextResponse.json({ ok: true });
  }

  // Submit yang datang setelah deadline dicatat sebagai waktu habis.
  if (await expireSession(session, session.exam)) {
    return NextResponse.json({ ok: true });
  }

  // updateMany + filter status supaya submit yang bersamaan (mis. timer
  // dan tombol submit) tidak menilai sesi dua kali.
  const { count } = await prisma.examSession.updateMany({
    where: { id: sessionId, status: "IN_PROGRESS" },
    data: {
      status: STATUS_BY_REASON[reason as keyof typeof STATUS_BY_REASON],
      submittedAt: new Date(),
    },
  });

  if (count > 0) await scoreSession(sessionId);

  return NextResponse.json({ ok: true });
}
