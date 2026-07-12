import { prisma } from "@/lib/prisma";

export async function getOwnedExam(examId: string, adminId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.adminId !== adminId) return null;
  return exam;
}
