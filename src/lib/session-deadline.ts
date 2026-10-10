import { prisma } from "@/lib/prisma";
import { scoreSession } from "@/lib/scoring";

/**
 * Kelonggaran setelah deadline untuk request yang sudah dikirim tepat
 * sebelum waktu habis (autosave terakhir, submit otomatis dari timer)
 * tapi baru sampai di server sedikit terlambat karena jaringan.
 */
export const DEADLINE_GRACE_MS = 15_000;

type SessionTiming = { startedAt: Date };
type ExamTiming = { durationMinutes: number };

export function getDeadline(session: SessionTiming, exam: ExamTiming) {
  return new Date(session.startedAt.getTime() + exam.durationMinutes * 60_000);
}

/** true jika sesi sudah melewati deadline + masa kelonggaran. */
export function isOverdue(session: SessionTiming, exam: ExamTiming, now = Date.now()) {
  return now > getDeadline(session, exam).getTime() + DEADLINE_GRACE_MS;
}

/**
 * Menutup sesi yang waktunya sudah habis tetapi masih IN_PROGRESS
 * (mis. peserta menutup tab atau HP mati sehingga timer di browser tidak
 * pernah mengirim submit). Timer di client bukan source of truth — server
 * yang menegakkan batas waktu.
 *
 * Aman dipanggil berulang/bersamaan: hanya pemanggil yang berhasil
 * mengubah status yang menjalankan penilaian.
 */
export async function expireSession(
  session: SessionTiming & { id: string; status: string },
  exam: ExamTiming
) {
  if (session.status !== "IN_PROGRESS" || !isOverdue(session, exam)) return false;

  const { count } = await prisma.examSession.updateMany({
    where: { id: session.id, status: "IN_PROGRESS" },
    data: { status: "AUTO_SUBMITTED_TIMEOUT", submittedAt: getDeadline(session, exam) },
  });
  if (count > 0) await scoreSession(session.id);
  return true;
}

/** Batas sesi yang ditutup per request supaya halaman admin tidak timeout. */
const EXPIRE_BATCH_LIMIT = 25;

/**
 * Menutup sesi yang sudah lewat waktu pada satu ujian, atau pada semua
 * ujian milik satu admin. Dipanggil sebelum admin melihat/mengekspor hasil
 * supaya status & nilai yang tampil sudah final.
 *
 * Best-effort: kegagalan di sini hanya dicatat ke log dan tidak boleh
 * membuat halaman admin gagal dimuat. Sisa sesi (di atas batas per request)
 * diproses pada pemuatan berikutnya.
 */
export async function expireOverdueSessions(filter: { examId: string } | { adminId: string }) {
  try {
    const sessions = await prisma.examSession.findMany({
      where: {
        status: "IN_PROGRESS",
        ...("examId" in filter ? { examId: filter.examId } : { exam: { adminId: filter.adminId } }),
      },
      select: { id: true, status: true, startedAt: true, exam: { select: { durationMinutes: true } } },
    });

    const overdue = sessions.filter((s) => isOverdue(s, s.exam)).slice(0, EXPIRE_BATCH_LIMIT);
    for (const session of overdue) {
      try {
        await expireSession(session, session.exam);
      } catch (err) {
        console.error(`[expireOverdueSessions] gagal menutup sesi ${session.id}`, err);
      }
    }
  } catch (err) {
    console.error("[expireOverdueSessions] gagal memuat sesi kedaluwarsa", err);
  }
}
