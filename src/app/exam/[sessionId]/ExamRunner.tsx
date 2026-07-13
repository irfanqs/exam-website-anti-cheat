"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExamTimer } from "@/components/ExamTimer";
import { AntiCheatMonitor } from "@/components/AntiCheatMonitor";
import { Spinner } from "@/components/Spinner";
import { VIOLATION_REASON } from "@/lib/violation-labels";

type Question = {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  choices: { id: string; text: string }[];
};

type ViolationType = "TAB_HIDDEN" | "WINDOW_BLUR" | "EXIT_FULLSCREEN";

type Props = {
  sessionId: string;
  deadline: string;
  examTitle: string;
  antiCheatEnabled: boolean;
  requireFullscreen: boolean;
  questions: Question[];
};

export function ExamRunner({
  sessionId,
  deadline,
  examTitle,
  antiCheatEnabled,
  requireFullscreen,
  questions,
}: Props) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [endMessage, setEndMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const pendingSaves = useRef<Promise<unknown>[]>([]);

  const submitExam = useCallback(
    async (reason: "manual" | "timeout" | "violation") => {
      if (submitting.current) return;
      submitting.current = true;
      setIsSubmitting(true);

      // Tunggu semua autosave jawaban yang masih berjalan supaya server
      // menilai berdasarkan jawaban terbaru, bukan state yang belum tersimpan
      // (race condition: klik jawaban lalu langsung klik submit).
      await Promise.allSettled(pendingSaves.current);

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

  function handleViolation(result: {
    violationCount: number;
    tolerance: number;
    action: "WARN" | "LOG_ONLY" | "AUTO_SUBMIT";
    limitReached: boolean;
    type: ViolationType;
  }) {
    const reason = VIOLATION_REASON[result.type];

    if (result.action === "AUTO_SUBMIT" && result.limitReached) {
      // Server sudah menandai sesi sebagai auto-submitted, tinggal
      // tampilkan status akhir di client.
      setEndMessage(
        `Ujian dihentikan otomatis karena Anda terdeteksi ${reason}.`
      );
      setSubmitted(true);
      router.refresh();
      return;
    }

    if (result.action === "WARN") {
      setWarning(
        `Peringatan: Anda terdeteksi ${reason} (${result.violationCount}/${result.tolerance + 1}). ` +
          (result.violationCount > result.tolerance
            ? "Batas pelanggaran sudah tercapai."
            : "Pelanggaran berikutnya dapat berakibat pada ujian Anda.")
      );
    }
    // action === "LOG_ONLY": dicatat di server secara diam-diam, tidak ada UI yang berubah.
  }

  function saveAnswer(
    questionId: string,
    payload: { textAnswer?: string; choiceIds?: string[] }
  ) {
    const promise = fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, questionId, ...payload }),
    });
    pendingSaves.current.push(promise);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg">
          {endMessage ?? "Ujian selesai. Jawaban Anda sudah terkirim."}
        </p>
        <a
          href={`/api/exam-sessions/${sessionId}/export`}
          className="rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
        >
          ⬇ Download Jawaban Saya (CSV)
        </a>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <AntiCheatMonitor
        sessionId={sessionId}
        enabled={antiCheatEnabled}
        requireFullscreen={requireFullscreen}
        onViolation={handleViolation}
      />

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{examTitle}</h1>
        <ExamTimer deadline={deadline} onTimeUp={() => submitExam("timeout")} />
      </div>

      {warning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-amber-400 bg-white p-6 text-center shadow-xl">
            <p className="text-lg font-semibold text-amber-600">
              ⚠ Peringatan Anti Cheat
            </p>
            <p className="text-sm text-zinc-700">{warning}</p>
            <button
              onClick={() => setWarning(null)}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-black/[.08] bg-white/70 p-5 shadow-sm backdrop-blur">
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
                className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
                rows={q.type === "ESSAY" ? 6 : 2}
                onBlur={(e) => saveAnswer(q.id, { textAnswer: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => submitExam("manual")}
        disabled={isSubmitting}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-medium text-white shadow-md shadow-blue-200 transition-transform hover:scale-[1.01] disabled:opacity-70"
      >
        {isSubmitting && <Spinner className="h-4 w-4" />}
        {isSubmitting ? "Mengirim jawaban..." : "Submit Ujian"}
      </button>
    </div>
  );
}
