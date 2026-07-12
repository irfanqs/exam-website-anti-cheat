"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExamTimer } from "@/components/ExamTimer";
import { AntiCheatMonitor } from "@/components/AntiCheatMonitor";

type Question = {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  choices: { id: string; text: string }[];
};

type Props = {
  sessionId: string;
  deadline: string;
  examTitle: string;
  tolerance: number;
  requireFullscreen: boolean;
  questions: Question[];
};

export function ExamRunner({
  sessionId,
  deadline,
  examTitle,
  tolerance,
  requireFullscreen,
  questions,
}: Props) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const submitting = useRef(false);

  const submitExam = useCallback(
    async (reason: "manual" | "timeout" | "violation") => {
      if (submitting.current) return;
      submitting.current = true;

      await fetch("/api/exam-sessions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason }),
      }).catch(() => {
        // Sesi mungkin sudah ditandai submitted oleh /api/violations;
        // kegagalan di sini tidak fatal karena server adalah source of truth.
      });

      setSubmitted(true);
      router.refresh();
    },
    [sessionId, router]
  );

  async function saveAnswer(
    questionId: string,
    payload: { textAnswer?: string; choiceIds?: string[] }
  ) {
    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, questionId, ...payload }),
    });
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-lg">Ujian selesai. Jawaban Anda sudah terkirim.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <AntiCheatMonitor
        sessionId={sessionId}
        tolerance={tolerance}
        requireFullscreen={requireFullscreen}
        onLimitReached={() => submitExam("violation")}
      />

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{examTitle}</h1>
        <ExamTimer deadline={deadline} onTimeUp={() => submitExam("timeout")} />
      </div>

      <div className="space-y-8">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
            <p className="mb-3 font-medium">
              {i + 1}. {q.text}
            </p>

            {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
              <div className="space-y-2">
                {q.choices.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                      name={q.id}
                      onChange={(e) => saveAnswer(q.id, { choiceIds: [e.target.value] })}
                      value={c.id}
                    />
                    {c.text}
                  </label>
                ))}
              </div>
            )}

            {(q.type === "SHORT_ANSWER" || q.type === "ESSAY") && (
              <textarea
                className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
                rows={q.type === "ESSAY" ? 6 : 2}
                onBlur={(e) => saveAnswer(q.id, { textAnswer: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => submitExam("manual")}
        className="mt-8 w-full rounded-lg bg-foreground px-4 py-3 font-medium text-background"
      >
        Submit Ujian
      </button>
    </div>
  );
}
