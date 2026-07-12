import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VIOLATION_ACTIONS = ["WARN", "LOG_ONLY", "AUTO_SUBMIT"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    title,
    description,
    durationMinutes,
    antiCheatEnabled,
    violationAction,
    tabViolationTolerance,
    requireFullscreen,
  } = await req.json();

  if (!title || !durationMinutes) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (violationAction && !VIOLATION_ACTIONS.includes(violationAction)) {
    return NextResponse.json({ error: "Invalid violationAction" }, { status: 400 });
  }

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();

  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      code,
      durationMinutes,
      antiCheatEnabled: antiCheatEnabled ?? true,
      violationAction: violationAction ?? "AUTO_SUBMIT",
      tabViolationTolerance: tabViolationTolerance ?? 0,
      requireFullscreen: requireFullscreen ?? false,
      adminId: session.user.id,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ exam });
}
