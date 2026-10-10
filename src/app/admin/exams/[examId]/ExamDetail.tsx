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
  violationSummary: string;
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
  const [publishing, setPublishing] = useState(false);

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
    if (!confirm("Hapus soal ini? Tindakan ini tidak bisa dibatalkan.")) return;

    setError(null);
    const res = await fetch(`/api/exams/${examId}/questions/${questionId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menghapus soal");
      return;
    }

    router.refresh();
  }

  async function handlePublish() {
    setError(null);
    setPublishing(true);
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST" });
    setPublishing(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal publish ujian");
      return;
    }
    router.refresh();
  }

  async function handleUnpublish() {
    setError(null);
    setPublishing(true);
    const res = await fetch(`/api/exams/${examId}/unpublish`, { method: "POST" });
    setPublishing(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal unpublish ujian");
      return;
    }
    router.refresh();
  }

  return (
    <div className="shell max-w-2xl">
      <Link
        href="/admin"
        className="back-link mb-4 inline-block"
      >
        ← Kembali ke Dashboard
      </Link>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={title} />
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="pill bg-sun">Kode {code}</span>
              <span className="pill bg-paper">{status}</span>
            </div>
          </div>
        </div>
        {status === "DRAFT" && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="btn btn-primary"
          >
            {publishing && <Spinner className="h-4 w-4" />}
            Publish Ujian
          </button>
        )}
        {status === "PUBLISHED" && participants.length === 0 && (
          <button
            onClick={handleUnpublish}
            disabled={publishing}
            className="btn"
          >
            {publishing && <Spinner className="h-4 w-4" />}
            Unpublish (kembalikan ke Draft)
          </button>
        )}
      </div>

      {error && <p className="mb-6 text-sm text-brick">{error}</p>}

      <div className="mb-10 space-y-4">
        <h2 className="text-lg font-semibold">
          <span className="marker">Daftar Soal</span>{" "}
          <span className="pill bg-sky align-middle">{questions.length}</span>
        </h2>

        {questions.length === 0 ? (
          <p className="text-sm text-muted">Belum ada soal.</p>
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
                className="card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">
                    {i + 1}. {q.text}
                  </p>
                  {status === "DRAFT" && (
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => setEditingQuestionId(q.id)}
                        className="btn btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {TYPE_LABELS[q.type]} · {q.points} poin
                </p>
                {q.choices.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.choices.map((c) => (
                      <li key={c.id} className={c.isCorrect ? "font-medium text-forest" : ""}>
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

      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            <span className="marker">Daftar Peserta</span>{" "}
            <span className="pill bg-sky align-middle">{participants.length}</span>
          </h2>
          {participants.length > 0 && (
            <a
              href={`/api/exams/${examId}/export/participants`}
              className="btn btn-sm"
            >
              ⬇ Export Rekap Nilai (Excel)
            </a>
          )}
        </div>

        {participants.length === 0 ? (
          <p className="text-sm text-muted">Belum ada peserta yang mengerjakan.</p>
        ) : (
          participants.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Avatar name={p.participantName} className="h-11 w-11 text-base" />
                <div className="space-y-1">
                <p className="font-semibold">{p.participantName}</p>
                <p className="text-sm text-muted">
                  {SESSION_STATUS_LABELS[p.status]}
                  {p.pendingGrading > 0 && ` · ${p.pendingGrading} soal essay perlu dinilai`}
                </p>
                {p.violationCount > 0 && (
                  <p className="text-sm text-brick font-medium">
                    ⚠ {p.violationCount} pelanggaran terdeteksi: {p.violationSummary}
                  </p>
                )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="pill bg-sky">
                  {p.totalScore ?? 0} / {p.totalPoints}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/exams/${examId}/sessions/${p.id}/export`}
                    className="btn btn-sm"
                  >
                    Export Excel
                  </a>
                  <Link
                    href={`/admin/exams/${examId}/sessions/${p.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </div>
            </div>
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
      className="space-y-4 card p-5"
    >
      <h2 className="text-lg font-semibold">
        <span className="marker">{initial ? "Edit Soal" : "Tambah Soal"}</span>
      </h2>

      <div className="space-y-1">
        <label className="label">Tipe Soal</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="input"
        >
          <option value="SINGLE_CHOICE">Pilihan Ganda (1 jawaban)</option>
          <option value="MULTIPLE_CHOICE">Pilihan Ganda (multi jawaban)</option>
          <option value="SHORT_ANSWER">Isian Singkat</option>
          <option value="ESSAY">Essay</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="label">Pertanyaan</label>
        <textarea
          name="text"
          required
          defaultValue={initial?.text}
          className="input"
        />
      </div>

      <div className="space-y-1">
        <label className="label">Bobot Nilai</label>
        <input
          name="points"
          type="number"
          min={1}
          required
          defaultValue={initial?.points ?? 10}
          className="input"
        />
      </div>

      {isChoiceType && (
        <div className="space-y-2">
          <label className="label">Opsi Jawaban (tandai yang benar)</label>
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
                className="input flex-1"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => setChoices(choices.filter((_, idx) => idx !== i))}
                  className="text-xs text-brick"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setChoices([...choices, ""])}
            className="text-xs text-muted hover:underline"
          >
            + Tambah opsi
          </button>
        </div>
      )}

      {type === "SHORT_ANSWER" && (
        <div className="space-y-1">
          <label className="label">Kunci Jawaban</label>
          <input
            name="correctTextAnswer"
            required
            defaultValue={initial?.correctTextAnswer ?? ""}
            className="input"
          />
        </div>
      )}

      {type === "ESSAY" && (
        <p className="text-xs text-muted">
          Soal essay tidak punya kunci jawaban otomatis — dinilai manual oleh admin setelah
          peserta submit.
        </p>
      )}

      {error && <p className="text-sm text-brick">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving && <Spinner className="h-4 w-4" />}
          {saving ? "Menyimpan..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
