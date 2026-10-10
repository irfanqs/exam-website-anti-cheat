"use client";

import { useEffect, useState } from "react";

type Props = {
  deadline: string; // ISO timestamp dihitung server: startedAt + durationMinutes
  onTimeUp: () => void;
};

/**
 * Timer dihitung dari deadline yang ditentukan server (bukan durasi lokal),
 * supaya tidak bisa dimanipulasi lewat jam device peserta.
 */
export function ExamTimer({ deadline, onTimeUp }: Props) {
  const [remainingMs, setRemainingMs] = useState(() =>
    new Date(deadline).getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(deadline).getTime() - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onTimeUp]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const units = [
    ...(hours > 0 ? [{ value: hours, label: "Jam" }] : []),
    { value: Math.floor((totalSeconds % 3600) / 60), label: "Menit" },
    { value: totalSeconds % 60, label: "Detik" },
  ];
  const almostOver = totalSeconds <= 60;

  return (
    <div className="flex items-start justify-center gap-2" role="timer" aria-live="off">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-start gap-2">
          {i > 0 && <span className="pt-2 text-2xl font-bold text-coral">:</span>}
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 border-ink text-3xl font-semibold tabular-nums shadow-[3px_3px_0_#1b1b1b] sm:h-16 sm:w-16 ${
                almostOver ? "bg-coral text-white" : "bg-white"
              }`}
            >
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium">
              <span className="text-coral">{unit.label[0]}</span>
              {unit.label.slice(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
