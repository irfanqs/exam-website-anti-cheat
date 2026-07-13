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
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-mono text-lg tabular-nums text-white shadow-sm shadow-blue-200">
      {minutes}:{seconds}
    </div>
  );
}
