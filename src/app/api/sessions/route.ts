import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { expireSession, getDeadline } from "@/lib/session-deadline";

export async function POST(req: NextRequest) {
  const { examCode, participantName, participantRef } = await req.json();

  // Identitas (NIM/NIS/email) wajib supaya satu peserta tidak bisa membuat
  // banyak sesi dan mengulang ujian dengan timer baru.
  const name = typeof participantName === "string" ? participantName.trim() : "";
  const ref =
    typeof participantRef === "string"
      ? participantRef.trim().replace(/\s+/g, "").toLowerCase()
      : "";

  if (!examCode || !name || !ref) {
    return NextResponse.json(
      { error: "Kode ujian, nama, dan NIM/NIS/email wajib diisi" },
      { status: 400 }
    );
  }

  // Kode ujian selalu digenerate huruf besar (lihat /api/exams). Normalisasi
  // di sini supaya peserta yang mengetik huruf kecil atau ada spasi nyangkut
  // (mis. copy-paste dari WhatsApp) tetap bisa join.
  const normalizedCode = String(examCode).trim().toUpperCase();

  const exam = await prisma.exam.findUnique({ where: { code: normalizedCode } });

  if (!exam || exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Ujian tidak ditemukan atau belum aktif" }, { status: 404 });
  }

  // Peserta yang sudah pernah masuk melanjutkan sesinya sendiri (mis. setelah
  // tab tertutup atau HP mati), dengan sisa waktu yang sama — bukan mulai ulang.
  const existing = await prisma.examSession.findUnique({
    where: { examId_participantRef: { examId: exam.id, participantRef: ref } },
  });
  if (existing) return resumeOrReject(existing, exam);

  const now = new Date();
  if (exam.opensAt && now < exam.opensAt) {
    return NextResponse.json({ error: "Ujian belum dibuka" }, { status: 403 });
  }
  if (exam.closesAt && now > exam.closesAt) {
    return NextResponse.json({ error: "Ujian sudah ditutup" }, { status: 403 });
  }

  try {
    const session = await prisma.examSession.create({
      data: { examId: exam.id, participantName: name, participantRef: ref },
    });
    return NextResponse.json({ sessionId: session.id, deadline: getDeadline(session, exam) });
  } catch (err) {
    // Dua request join bersamaan dengan identitas yang sama: yang kalah
    // memakai sesi yang dibuat pemenangnya.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const session = await prisma.examSession.findUniqueOrThrow({
        where: { examId_participantRef: { examId: exam.id, participantRef: ref } },
      });
      return resumeOrReject(session, exam);
    }
    throw err;
  }
}

async function resumeOrReject(
  session: { id: string; status: string; startedAt: Date },
  exam: { durationMinutes: number }
) {
  if (session.status === "IN_PROGRESS" && !(await expireSession(session, exam))) {
    return NextResponse.json({
      sessionId: session.id,
      deadline: getDeadline(session, exam),
      resumed: true,
    });
  }

  return NextResponse.json(
    { error: "NIM/NIS/email ini sudah menyelesaikan ujian ini dan tidak bisa mengulang." },
    { status: 409 }
  );
}
