import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ExamDetail } from "./ExamDetail";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } },
  });

  if (!exam || exam.adminId !== session.user.id) notFound();

  return (
    <ExamDetail
      examId={exam.id}
      title={exam.title}
      code={exam.code}
      status={exam.status}
      questions={exam.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
      }))}
    />
  );
}
