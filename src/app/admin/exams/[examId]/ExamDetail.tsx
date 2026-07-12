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
};

type SessionStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "AUTO_SUBMITTED_TIMEOUT"
  | "AUTO_SUBMITTED_VIOLATION";

type Participant = {
  id: string;
  participantName: string;
  status: SessionStatus;
  violationCount: number;
  totalScore: number | null;
  totalPoints: number;
  pendingGrading: number;
};

type Props = {
  examId: string;
  title: string;
  code: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  questions: Question[];
  participants: Participant[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE: "Pilihan Ganda (multi jawaban)",
  SHORT_ANSWER: "Isian Singkat",
  ESSAY: "Essay",
};

const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  IN_PROGRESS: "Sedang mengerjakan",
  SUBMITTED: "Selesai",
  AUTO_SUBMITTED_TIMEOUT: "Waktu habis",
  AUTO_SUBMITTED_VIOLATION: "Terindikasi curang",
};

export function ExamDetail({ examId, title, code, status, questions, participants }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  async function handleAddQuestion(payload: Record<string, unknown>) {
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      return data.error ?? "Gagal menambahkan soal";
    }

    router.refresh();
    return null;
  }

  async function handleEditQuestion(questionId: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/exams/${examId}/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      return data.error ?? "Gagal menyimpan perubahan soal";
    }

    setEditingQuestionId(null);
    router.refresh();
    return null;
  }

  async function handleDeleteQuestion(questionId: string) {
    await fetch(`/api/exams/${examId}/questions/${questionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handlePublish() {
    setError(null);
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal publish ujian");
      return;
    }
    router.refresh();
  }

  async function handleUnpublish() {
    setError(null);
    const res = await fetch(`/api/exams/${examId}/unpublish`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal unpublish ujian");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Kembali ke Dashboard
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-500">
            Kode: {code} · Status: {status}
          </p>
        </div>
        {status === "DRAFT" && (
          <button
            onClick={handlePublish}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Publish Ujian
          </button>
        )}
        {status === "PUBLISHED" && participants.length === 0 && (
          <button
            onClick={handleUnpublish}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.05]"
          >
            Unpublish (kembalikan ke Draft)
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Daftar Soal ({questions.length})
        </h2>

        {questions.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada soal.</p>
        ) : (
          questions.map((q, i) =>
            editingQuestionId === q.id ? (
              <QuestionForm
                key={q.id}
                initial={q}
                submitLabel="Simpan Perubahan"
                onCancel={() => setEditingQuestionId(null)}
                onSubmit={(payload) => handleEditQuestion(q.id, payload)}
              />
            ) : (
              <div
                key={q.id}
                className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">
                    {i + 1}. {q.text}
                  </p>
                  {status === "DRAFT" && (
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => setEditingQuestionId(q.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {TYPE_LABELS[q.type]} · {q.points} poin
                </p>
                {q.choices.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.choices.map((c) => (
                      <li key={c.id} className={c.isCorrect ? "font-medium text-emerald-600" : ""}>
                        {c.isCorrect ? "✓ " : "· "}
                        {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )
        )}
      </div>

      <div className="mb-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Daftar Peserta ({participants.length})
        </h2>

        {participants.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada peserta yang mengerjakan.</p>
        ) : (
          participants.map((p) => (
            <Link
              key={p.id}
              href={`/admin/exams/${examId}/sessions/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-black/[.08] p-4 hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.03]"
            >
              <div>
                <p className="font-medium">{p.participantName}</p>
                <p className="text-sm text-zinc-500">
                  {SESSION_STATUS_LABELS[p.status]}
                  {p.violationCount > 0 && ` · ${p.violationCount} pelanggaran`}
                  {p.pendingGrading > 0 && ` · ${p.pendingGrading} soal essay perlu dinilai`}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">
                {p.totalScore ?? 0} / {p.totalPoints}
              </p>
            </Link>
          ))
        )}
      </div>

      {status === "DRAFT" && editingQuestionId === null && (
        <QuestionForm submitLabel="Tambah Soal" onSubmit={handleAddQuestion} />
      )}
    </div>
  );
}

function QuestionForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: Question;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<string | null>;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SINGLE_CHOICE");
  const [choices, setChoices] = useState<string[]>(
    initial && initial.choices.length > 0 ? initial.choices.map((c) => c.text) : ["", ""]
  );
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(() => {
    const i = initial?.choices.findIndex((c) => c.isCorrect) ?? -1;
    return i >= 0 ? i : 0;
  });
  const [correctChoiceIndexes, setCorrectChoiceIndexes] = useState<number[]>(
    initial?.choices.flatMap((c, i) => (c.isCorrect ? [i] : [])) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChoiceType = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const payload: Record<string, unknown> = {
      type,
      text: form.get("text"),
      points: Number(form.get("points")),
    };

    if (isChoiceType) {
      payload.choices = choices
        .filter((c) => c.trim() !== "")
        .map((c, i) => ({
          text: c,
          isCorrect:
            type === "SINGLE_CHOICE"
              ? i === correctChoiceIndex
              : correctChoiceIndexes.includes(i),
        }));
    } else if (type === "SHORT_ANSWER") {
      payload.correctTextAnswer = form.get("correctTextAnswer");
    }

    const errorMessage = await onSubmit(payload);
    setSaving(false);

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    if (!initial) {
      formEl.reset();
      setChoices(["", ""]);
      setCorrectChoiceIndex(0);
      setCorrectChoiceIndexes([]);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]"
    >
      <h2 className="font-medium">{initial ? "Edit Soal" : "Tambah Soal"}</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium">Tipe Soal</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
        >
          <option value="SINGLE_CHOICE">Pilihan Ganda (1 jawaban)</option>
          <option value="MULTIPLE_CHOICE">Pilihan Ganda (multi jawaban)</option>
          <option value="SHORT_ANSWER">Isian Singkat</option>
          <option value="ESSAY">Essay</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Pertanyaan</label>
        <textarea
          name="text"
          required
          defaultValue={initial?.text}
          className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Bobot Nilai</label>
        <input
          name="points"
          type="number"
          min={1}
          required
          defaultValue={initial?.points ?? 10}
          className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
        />
      </div>

      {isChoiceType && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Opsi Jawaban (tandai yang benar)</label>
          {choices.map((choice, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                name="correctChoice"
                checked={
                  type === "SINGLE_CHOICE"
                    ? correctChoiceIndex === i
                    : correctChoiceIndexes.includes(i)
                }
                onChange={() => {
                  if (type === "SINGLE_CHOICE") {
                    setCorrectChoiceIndex(i);
                  } else {
                    setCorrectChoiceIndexes((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                    );
                  }
                }}
              />
              <input
                value={choice}
                onChange={(e) => {
                  const next = [...choices];
                  next[i] = e.target.value;
                  setChoices(next);
                }}
                placeholder={`Opsi ${i + 1}`}
                className="flex-1 rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => setChoices(choices.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-600"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setChoices([...choices, ""])}
            className="text-xs text-zinc-500 hover:underline"
          >
            + Tambah opsi
          </button>
        </div>
      )}

      {type === "SHORT_ANSWER" && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Kunci Jawaban</label>
          <input
            name="correctTextAnswer"
            required
            defaultValue={initial?.correctTextAnswer ?? ""}
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>
      )}

      {type === "ESSAY" && (
        <p className="text-xs text-zinc-500">
          Soal essay tidak punya kunci jawaban otomatis — dinilai manual oleh admin setelah
          peserta submit.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.05]"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
