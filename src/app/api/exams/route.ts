import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TODO: ganti dengan admin dari session auth setelah NextAuth/Clerk terpasang (PRD §6).
async function getOrCreateDemoAdmin() {
  return prisma.admin.upsert({
    where: { email: "demo-admin@example.com" },
    create: {
      email: "demo-admin@example.com",
      name: "Demo Admin",
      passwordHash: "unset",
    },
    update: {},
  });
}

export async function POST(req: NextRequest) {
  const { title, description, durationMinutes, tabViolationTolerance, requireFullscreen } =
    await req.json();

  if (!title || !durationMinutes) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = await getOrCreateDemoAdmin();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();

  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      code,
      durationMinutes,
      tabViolationTolerance: tabViolationTolerance ?? 0,
      requireFullscreen: requireFullscreen ?? false,
      adminId: admin.id,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ exam });
}
