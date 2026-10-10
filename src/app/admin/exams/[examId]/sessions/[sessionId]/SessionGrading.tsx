"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Avatar";

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
    <div className="shell max-w-2xl">
      <Link
        href={`/admin/exams/${examId}`}
        className="back-link mb-4 inline-block"
      >
        ← Kembali ke Ujian
      </Link>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={participantName} />
          <div>
            <h1 className="text-xl font-semibold">{participantName}</h1>
            <p className="text-sm text-muted">Hasil &amp; penilaian jawaban</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/api/exams/${examId}/sessions/${sessionId}/export`}
            className="btn btn-sm"
          >
            ⬇ Export Excel
          </a>
          <span className="pill bg-sky px-3 py-1 text-base">
            {totalScore ?? 0} / {totalPoints}
          </span>
        </div>
      </div>

      <div className="space-y-5">
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

  const isUnanswered =
    question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE"
      ? !answer || answer.choiceIds.length === 0
      : !answer || !answer.textAnswer?.trim();

  let statusBadge: { label: string; className: string } | null = null;
  if (isUnanswered) {
    statusBadge = { label: "Tidak Dijawab", className: "bg-paper" };
  } else if (question.type === "ESSAY") {
    statusBadge = answer?.needsManualGrading
      ? { label: "Menunggu Penilaian", className: "bg-sun" }
      : { label: "Sudah Dinilai", className: "bg-leaf" };
  } else {
    statusBadge =
      answer?.score === question.points
        ? { label: "Benar", className: "bg-leaf" }
        : { label: "Salah", className: "bg-coral text-white" };
  }

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
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium">
          {index + 1}. {question.text}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm text-muted">
            {answer?.score ?? 0} / {question.points} poin
          </p>
          {statusBadge && (
            <span
              className={`pill ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
      </div>

      {(question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {question.choices.map((c) => {
            const selected = answer?.choiceIds.includes(c.id);
            return (
              <li
                key={c.id}
                className={
                  c.isCorrect
                    ? "font-medium text-forest"
                    : selected
                      ? "font-medium text-brick"
                      : ""
                }
              >
                {c.isCorrect ? "✓ " : selected ? "✗ " : "· "}
                {c.text}
                {selected && " (dipilih peserta)"}
              </li>
            );
          })}
          {isUnanswered && (
            <li className="italic text-muted">Peserta tidak memilih opsi apa pun.</li>
          )}
        </ul>
      )}

      {question.type === "SHORT_ANSWER" && (
        <div className="mt-3 space-y-1.5 text-sm">
          <p>
            Jawaban peserta:{" "}
            <span className="font-medium">
              {answer?.textAnswer?.trim() || "Tidak dijawab"}
            </span>
          </p>
          <p className="text-muted">Kunci jawaban: {question.correctTextAnswer}</p>
        </div>
      )}

      {question.type === "ESSAY" && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="rounded-xl border-2 border-ink bg-white p-3 whitespace-pre-wrap">
            {answer?.textAnswer?.trim() || "Tidak dijawab"}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={question.points}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="input w-24"
            />
            <button
              onClick={handleSaveScore}
              disabled={saving || !answer}
              className="btn btn-primary btn-sm"
            >
              {saving && <Spinner className="h-3 w-3" />}
              {saving ? "Menyimpan..." : "Simpan Nilai"}
            </button>
            {answer?.needsManualGrading && (
              <span className="text-xs text-brick font-medium">Belum dinilai</span>
            )}
          </div>
          {error && <p className="text-xs text-brick">{error}</p>}
        </div>
      )}
    </div>
  );
}
