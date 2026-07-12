"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  choices: { id: string; text: string; isCorrect: boolean }[];
};

type Props = {
  examId: string;
  title: string;
  code: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  questions: Question[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE: "Pilihan Ganda (multi jawaban)",
  SHORT_ANSWER: "Isian Singkat",
  ESSAY: "Essay",
};

export function ExamDetail({ examId, title, code, status, questions }: Props) {
  const router = useRouter();
  const [type, setType] = useState<QuestionType>("SINGLE_CHOICE");
  const [choices, setChoices] = useState(["", ""]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0);
  const [correctChoiceIndexes, setCorrectChoiceIndexes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChoiceType = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";

  async function handleAddQuestion(e: React.FormEvent<HTMLFormElement>) {
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

    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal menambahkan soal");
      return;
    }

    formEl.reset();
    setChoices(["", ""]);
    setCorrectChoiceIndex(0);
    setCorrectChoiceIndexes([]);
    router.refresh();
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
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
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Daftar Soal ({questions.length})
        </h2>

        {questions.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada soal.</p>
        ) : (
          questions.map((q, i) => (
            <div
              key={q.id}
              className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium">
                  {i + 1}. {q.text}
                </p>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="shrink-0 text-xs text-red-600 hover:underline"
                >
                  Hapus
                </button>
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
          ))
        )}
      </div>

      {status === "DRAFT" && (
        <form
          onSubmit={handleAddQuestion}
          className="space-y-4 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]"
        >
          <h2 className="font-medium">Tambah Soal</h2>

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
              defaultValue={10}
              className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
            />
          </div>

          {isChoiceType && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Opsi Jawaban (tandai yang benar)
              </label>
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
                className="w-full rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
              />
            </div>
          )}

          {type === "ESSAY" && (
            <p className="text-xs text-zinc-500">
              Soal essay tidak punya kunci jawaban otomatis — dinilai manual oleh admin setelah peserta submit.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Tambah Soal"}
          </button>
        </form>
      )}
    </div>
  );
}
