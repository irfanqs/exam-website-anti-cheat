"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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

type AnswerPayload = { textAnswer?: string; choiceIds?: string[] };

// Jawaban teks disimpan otomatis setelah peserta berhenti mengetik selama ini.
const TEXT_AUTOSAVE_MS = 1500;

type DeviceInfo = { mobile: boolean; inAppBrowser: boolean };

const NO_DEVICE_INFO: DeviceInfo = { mobile: false, inAppBrowser: false };
let cachedDeviceInfo: DeviceInfo | null = null;

function getDeviceInfo(): DeviceInfo {
  if (!cachedDeviceInfo) {
    const ua = navigator.userAgent;
    cachedDeviceInfo = {
      // iPadOS mengaku sebagai Mac, jadi dicek lewat touch point.
      mobile:
        /iPhone|iPad|iPod|Android/i.test(ua) ||
        (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
      inAppBrowser: /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|TikTok|musical_ly|BytedanceWebview/i.test(ua),
    };
  }
  return cachedDeviceInfo;
}

const noopSubscribe = () => () => {};

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
  // Antrian per soal supaya request simpan untuk soal yang sama tidak
  // saling mendahului (jawaban lama menimpa jawaban baru).
  const saveQueues = useRef(new Map<string, Promise<unknown>>());
  const textDrafts = useRef(new Map<string, string>());
  const draftTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const selectedChoices = useRef(new Map<string, Set<string>>());
  const device = useSyncExternalStore(noopSubscribe, getDeviceInfo, () => NO_DEVICE_INFO);
  const [mobileNoticeDismissed, setMobileNoticeDismissed] = useState(false);

  const saveAnswer = useCallback(
    (questionId: string, payload: AnswerPayload, keepalive = false) => {
      const previous = saveQueues.current.get(questionId) ?? Promise.resolve();
      const promise = previous
        .catch(() => {})
        .then(() =>
          fetch("/api/answers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, questionId, ...payload }),
            keepalive,
          })
        );
      saveQueues.current.set(questionId, promise);
      pendingSaves.current.push(promise);
      return promise;
    },
    [sessionId]
  );

  // Kirim semua jawaban teks yang belum tersimpan sekarang juga.
  const flushTextDrafts = useCallback(
    (keepalive = false) => {
      const saves: Promise<unknown>[] = [];
      for (const [questionId, text] of textDrafts.current) {
        clearTimeout(draftTimers.current.get(questionId));
        draftTimers.current.delete(questionId);
        saves.push(saveAnswer(questionId, { textAnswer: text }, keepalive));
      }
      textDrafts.current.clear();
      return Promise.allSettled(saves);
    },
    [saveAnswer]
  );

  function handleTextChange(questionId: string, text: string) {
    textDrafts.current.set(questionId, text);
    clearTimeout(draftTimers.current.get(questionId));
    draftTimers.current.set(
      questionId,
      setTimeout(() => {
        draftTimers.current.delete(questionId);
        const draft = textDrafts.current.get(questionId);
        if (draft === undefined) return;
        textDrafts.current.delete(questionId);
        saveAnswer(questionId, { textAnswer: draft });
      }, TEXT_AUTOSAVE_MS)
    );
  }

  function handleTextBlur(questionId: string) {
    const draft = textDrafts.current.get(questionId);
    if (draft === undefined) return;
    clearTimeout(draftTimers.current.get(questionId));
    draftTimers.current.delete(questionId);
    textDrafts.current.delete(questionId);
    saveAnswer(questionId, { textAnswer: draft });
  }

  function handleChoiceChange(
    questionId: string,
    type: Question["type"],
    choiceId: string,
    checked: boolean
  ) {
    let selected = selectedChoices.current.get(questionId);
    if (!selected || type === "SINGLE_CHOICE") {
      selected = new Set();
      selectedChoices.current.set(questionId, selected);
    }
    if (checked) selected.add(choiceId);
    else selected.delete(choiceId);
    saveAnswer(questionId, { choiceIds: [...selected] });
  }

  // iOS membekukan halaman begitu peserta meninggalkannya, jadi jawaban
  // yang sedang diketik dikirim (keepalive) tepat saat halaman disembunyikan.
  useEffect(() => {
    function handleHide() {
      if (document.visibilityState === "hidden") void flushTextDrafts(true);
    }
    function handlePageHide() {
      void flushTextDrafts(true);
    }
    document.addEventListener("visibilitychange", handleHide);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleHide);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushTextDrafts]);

  const submitExam = useCallback(
    async (reason: "manual" | "timeout" | "violation") => {
      if (submitting.current) return;
      submitting.current = true;
      setIsSubmitting(true);

      // Tunggu semua autosave jawaban yang masih berjalan supaya server
      // menilai berdasarkan jawaban terbaru, bukan state yang belum tersimpan
      // (race condition: klik jawaban lalu langsung klik submit).
      await flushTextDrafts();
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
    [sessionId, router, flushTextDrafts]
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

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg">
          {endMessage ?? "Ujian selesai. Jawaban Anda sudah terkirim."}
        </p>
        <p className="text-sm text-zinc-500">Terima kasih telah mengerjakan ujian ini.</p>
        {/* Download jawaban sisi peserta dinonaktifkan sementara — untuk saat
            ini export hanya dilakukan admin. Endpoint /api/exam-sessions/[sessionId]/export
            tetap ada kalau nanti fitur ini diaktifkan lagi.
        <a
          href={`/api/exam-sessions/${sessionId}/export`}
          className="rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
        >
          ⬇ Download Jawaban Saya (Excel)
        </a>
        */}
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
        beforeReport={flushTextDrafts}
      />

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{examTitle}</h1>
        <ExamTimer deadline={deadline} onTimeUp={() => submitExam("timeout")} />
      </div>

      {antiCheatEnabled && device.mobile && !mobileNoticeDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-blue-300 bg-white p-6 shadow-xl">
            <p className="text-center text-lg font-semibold text-blue-700">
              Sebelum Mengerjakan di HP
            </p>
            <p className="text-sm text-zinc-700">
              Ujian ini memakai deteksi kecurangan. Keluar dari halaman ujian lebih
              dari beberapa detik dihitung sebagai pelanggaran. Supaya tidak
              tercatat tanpa sengaja:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>
                Matikan kunci layar otomatis (iPhone: Pengaturan → Layar &amp;
                Kecerahan → Kunci Otomatis → Tidak Pernah) dan nonaktifkan Mode
                Daya Rendah.
              </li>
              <li>Aktifkan mode Jangan Ganggu / Fokus agar tidak ada telepon masuk.</li>
              <li>Jangan membuka Pusat Kontrol, notifikasi, atau aplikasi lain.</li>
            </ul>
            {device.inAppBrowser && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Anda membuka ujian dari dalam aplikasi lain (mis. WhatsApp atau
                Instagram). Sebaiknya salin link ujian dan buka di Safari atau Chrome.
              </p>
            )}
            <button
              onClick={() => setMobileNoticeDismissed(true)}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

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
                      onChange={(e) =>
                        handleChoiceChange(q.id, q.type, c.id, e.target.checked)
                      }
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
                onChange={(e) => handleTextChange(q.id, e.target.value)}
                onBlur={() => handleTextBlur(q.id)}
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
