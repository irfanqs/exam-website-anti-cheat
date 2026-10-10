"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ExamTimer } from "@/components/ExamTimer";
import { AntiCheatMonitor } from "@/components/AntiCheatMonitor";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Avatar";
import { ExamEndScreen } from "@/components/ExamEndScreen";
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

type InitialAnswers = Record<string, { textAnswer: string | null; choiceIds: string[] }>;

type Props = {
  sessionId: string;
  deadline: string;
  examTitle: string;
  participantName: string;
  antiCheatEnabled: boolean;
  requireFullscreen: boolean;
  questions: Question[];
  // Jawaban yang sudah tersimpan di server, supaya tetap tampil setelah
  // halaman di-refresh atau peserta melanjutkan sesi.
  initialAnswers: InitialAnswers;
};

export function ExamRunner({
  sessionId,
  deadline,
  examTitle,
  participantName,
  antiCheatEnabled,
  requireFullscreen,
  questions,
  initialAnswers,
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
  const [selectedChoices] = useState(
    () =>
      new Map(
        Object.entries(initialAnswers).map(([questionId, a]) => [questionId, new Set(a.choiceIds)])
      )
  );
  const [answered, setAnswered] = useState(
    () =>
      new Set(
        Object.entries(initialAnswers)
          .filter(([, a]) => a.choiceIds.length > 0 || a.textAnswer?.trim())
          .map(([questionId]) => questionId)
      )
  );
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
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

  function markAnswered(questionId: string, isAnswered: boolean) {
    setAnswered((prev) => {
      if (prev.has(questionId) === isAnswered) return prev;
      const next = new Set(prev);
      if (isAnswered) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  }

  function handleTextChange(questionId: string, text: string) {
    markAnswered(questionId, text.trim() !== "");
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
    let selected = selectedChoices.get(questionId);
    if (!selected || type === "SINGLE_CHOICE") {
      selected = new Set();
      selectedChoices.set(questionId, selected);
    }
    if (checked) selected.add(choiceId);
    else selected.delete(choiceId);
    markAnswered(questionId, selected.size > 0);
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
      <ExamEndScreen
        message={endMessage ?? "Jawaban Anda sudah terkirim."}
        stopped={endMessage !== null}
      />
    );
  }

  return (
    <div className="shell max-w-2xl">
      <AntiCheatMonitor
        sessionId={sessionId}
        enabled={antiCheatEnabled}
        requireFullscreen={requireFullscreen}
        onViolation={handleViolation}
        beforeReport={flushTextDrafts}
      />

      <div className="mb-6 flex items-center gap-3">
        <Avatar name={participantName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{participantName}</p>
          <p className="text-sm text-muted">Semangat, kerjakan dengan jujur!</p>
        </div>
        <span className="pill bg-sky">
          {answered.size}/{questions.length} terjawab
        </span>
      </div>

      <div className="card mb-8 space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">{examTitle}</h1>
          {antiCheatEnabled && <span className="pill bg-sun">Anti Cheat</span>}
        </div>
        <ExamTimer deadline={deadline} onTimeUp={() => submitExam("timeout")} />
      </div>

      {antiCheatEnabled && device.mobile && !mobileNoticeDismissed && (
        <div className="modal-backdrop">
          <div className="modal space-y-4">
            <p className="text-center text-lg font-semibold">
              <span className="marker">Sebelum Mengerjakan di HP</span>
            </p>
            <p className="text-sm">
              Ujian ini memakai deteksi kecurangan. Keluar dari halaman ujian lebih
              dari beberapa detik dihitung sebagai pelanggaran. Supaya tidak
              tercatat tanpa sengaja:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                Matikan kunci layar otomatis (iPhone: Pengaturan → Layar &amp;
                Kecerahan → Kunci Otomatis → Tidak Pernah) dan nonaktifkan Mode
                Daya Rendah.
              </li>
              <li>Aktifkan mode Jangan Ganggu / Fokus agar tidak ada telepon masuk.</li>
              <li>Jangan membuka Pusat Kontrol, notifikasi, atau aplikasi lain.</li>
            </ul>
            {device.inAppBrowser && (
              <p className="rounded-xl border-2 border-ink bg-sun p-3 text-sm">
                Anda membuka ujian dari dalam aplikasi lain (mis. WhatsApp atau
                Instagram). Sebaiknya salin link ujian dan buka di Safari atau Chrome.
              </p>
            )}
            <button
              onClick={() => setMobileNoticeDismissed(true)}
              className="btn btn-primary w-full"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {warning && (
        <div className="modal-backdrop">
          <div className="modal space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-coral text-2xl font-bold text-white">
              !
            </span>
            <p className="text-lg font-semibold">Peringatan Anti Cheat</p>
            <p className="text-sm">{warning}</p>
            <button onClick={() => setWarning(null)} className="btn btn-primary w-full">
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="card p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-sm font-bold">
                {i + 1}
              </span>
              <p className="pt-0.5 font-medium whitespace-pre-wrap">{q.text}</p>
            </div>

            {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
              <div className="space-y-2.5">
                {q.type === "MULTIPLE_CHOICE" && (
                  <p className="text-xs font-medium text-muted">Boleh pilih lebih dari satu.</p>
                )}
                {q.choices.map((c) => (
                  <label key={c.id} className="choice">
                    <input
                      type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                      name={q.id}
                      onChange={(e) =>
                        handleChoiceChange(q.id, q.type, c.id, e.target.checked)
                      }
                      value={c.id}
                      defaultChecked={initialAnswers[q.id]?.choiceIds.includes(c.id)}
                    />
                    {c.text}
                  </label>
                ))}
              </div>
            )}

            {(q.type === "SHORT_ANSWER" || q.type === "ESSAY") && (
              <textarea
                className="input"
                rows={q.type === "ESSAY" ? 6 : 2}
                placeholder="Tulis jawaban Anda di sini..."
                defaultValue={initialAnswers[q.id]?.textAnswer ?? ""}
                onChange={(e) => handleTextChange(q.id, e.target.value)}
                onBlur={() => handleTextBlur(q.id)}
              />
            )}
          </div>
        ))}
      </div>

      {confirmingSubmit && (
        <div className="modal-backdrop">
          <div className="modal space-y-4 text-center">
            <p className="text-lg font-semibold">
              <span className="marker">Kirim jawaban sekarang?</span>
            </p>
            {answered.size < questions.length ? (
              <p className="rounded-xl border-2 border-ink bg-sun p-3 text-sm">
                Masih ada <strong>{questions.length - answered.size} soal</strong> yang belum
                dijawab.
              </p>
            ) : (
              <p className="text-sm">Semua soal sudah dijawab.</p>
            )}
            <p className="text-sm text-muted">
              Setelah dikirim, jawaban tidak bisa diubah lagi.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingSubmit(false)} className="btn flex-1">
                Periksa Lagi
              </button>
              <button
                onClick={() => {
                  setConfirmingSubmit(false);
                  submitExam("manual");
                }}
                className="btn btn-primary flex-1"
              >
                Ya, Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setConfirmingSubmit(true)}
        disabled={isSubmitting}
        className="btn btn-primary btn-lg mt-8 w-full"
      >
        {isSubmitting && <Spinner className="h-4 w-4" />}
        {isSubmitting ? "Mengirim jawaban..." : "Selesai & Kirim Jawaban"}
      </button>
    </div>
  );
}
