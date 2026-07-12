"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  correctTextAnswer: string | null;
  choices: { id: string; text: string; isCorrect: boolean }[];
  answer: {
    id: string;
    textAnswer: string | null;
    choiceIds: string[];
    score: number | null;
    needsManualGrading: boolean;
  } | null;
};

type Props = {
  examId: string;
  sessionId: string;
  participantName: string;
  totalScore: number | null;
  totalPoints: number;
  questions: Question[];
};

export function SessionGrading({
  examId,
  sessionId,
  participantName,
  totalScore,
  totalPoints,
  questions,
}: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/admin/exams/${examId}`}
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Kembali ke Ujian
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{participantName}</h1>
        <p className="text-lg font-medium">
          {totalScore ?? 0} / {totalPoints}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionAnswer
            key={q.id}
            index={i}
            question={q}
            examId={examId}
            sessionId={sessionId}
            onGraded={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionAnswer({
  index,
  question,
  examId,
  sessionId,
  onGraded,
}: {
  index: number;
  question: Question;
  examId: string;
  sessionId: string;
  onGraded: () => void;
}) {
  const { answer } = question;
  const [score, setScore] = useState(answer?.score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveScore() {
    if (!answer) return;
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/exams/${examId}/sessions/${sessionId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId: answer.id, score: Number(score) }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan skor");
      return;
    }

    onGraded();
  }

  return (
    <div className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium">
          {index + 1}. {question.text}
        </p>
        <p className="shrink-0 text-sm text-zinc-500">
          {answer?.score ?? 0} / {question.points} poin
        </p>
      </div>

      {(question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") && (
        <ul className="mt-2 space-y-1 text-sm">
          {question.choices.map((c) => {
            const selected = answer?.choiceIds.includes(c.id);
            return (
              <li
                key={c.id}
                className={
                  c.isCorrect
                    ? "font-medium text-emerald-600"
                    : selected
                      ? "font-medium text-red-600"
                      : ""
                }
              >
                {c.isCorrect ? "✓ " : selected ? "✗ " : "· "}
                {c.text}
                {selected && " (dipilih peserta)"}
              </li>
            );
          })}
        </ul>
      )}

      {question.type === "SHORT_ANSWER" && (
        <div className="mt-2 space-y-1 text-sm">
          <p>
            Jawaban peserta:{" "}
            <span className="font-medium">{answer?.textAnswer || "(kosong)"}</span>
          </p>
          <p className="text-zinc-500">Kunci jawaban: {question.correctTextAnswer}</p>
        </div>
      )}

      {question.type === "ESSAY" && (
        <div className="mt-2 space-y-2 text-sm">
          <p className="whitespace-pre-wrap rounded-lg bg-black/[.03] p-3 dark:bg-white/[.05]">
            {answer?.textAnswer || "(kosong)"}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={question.points}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-24 rounded-lg border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145] dark:bg-zinc-900"
            />
            <button
              onClick={handleSaveScore}
              disabled={saving || !answer}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Nilai"}
            </button>
            {answer?.needsManualGrading && (
              <span className="text-xs text-amber-600">Belum dinilai</span>
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
