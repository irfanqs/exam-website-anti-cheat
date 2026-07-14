import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { examCode, participantName, participantRef } = await req.json();

  if (!examCode || !participantName) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Kode ujian selalu digenerate huruf besar (lihat /api/exams). Normalisasi
  // di sini supaya peserta yang mengetik huruf kecil atau ada spasi nyangkut
  // (mis. copy-paste dari WhatsApp) tetap bisa join.
  const normalizedCode = examCode.trim().toUpperCase();

  const exam = await prisma.exam.findUnique({ where: { code: normalizedCode } });

  if (!exam || exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Ujian tidak ditemukan atau belum aktif" }, { status: 404 });
  }

  const now = new Date();
  if (exam.opensAt && now < exam.opensAt) {
    return NextResponse.json({ error: "Ujian belum dibuka" }, { status: 403 });
  }
  if (exam.closesAt && now > exam.closesAt) {
    return NextResponse.json({ error: "Ujian sudah ditutup" }, { status: 403 });
  }

  const session = await prisma.examSession.create({
    data: { examId: exam.id, participantName, participantRef },
  });

  const deadline = new Date(session.startedAt.getTime() + exam.durationMinutes * 60_000);

  return NextResponse.json({ sessionId: session.id, deadline });
}
