"use client";

import { useEffect, useRef } from "react";

type ViolationType = "TAB_HIDDEN" | "WINDOW_BLUR" | "EXIT_FULLSCREEN";
type ViolationAction = "WARN" | "LOG_ONLY" | "AUTO_SUBMIT";

type ViolationResult = {
  violationCount: number;
  tolerance: number;
  action: ViolationAction;
  limitReached: boolean;
};

type Props = {
  sessionId: string;
  enabled: boolean; // toggle Anti Cheat admin — jika false, komponen ini tidak dipasang sama sekali
  requireFullscreen: boolean;
  onViolation: (result: ViolationResult) => void;
};

/**
 * Implementasi PRD Appendix A: mendeteksi (bukan mencegah) peserta
 * berpindah tab/window, lalu melaporkan ke server. Keputusan aksi
 * (warn / log / auto-submit) selalu diambil & divalidasi server,
 * bukan client ini — lihat /api/violations.
 */
export function AntiCheatMonitor({
  sessionId,
  enabled,
  requireFullscreen,
  onViolation,
}: Props) {
  const reporting = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    async function reportViolation(type: ViolationType) {
      if (reporting.current) return;
      reporting.current = true;

      try {
        // fetch + keepalive dipakai (bukan sendBeacon) supaya kita tetap bisa
        // membaca keputusan server (warn/log/auto-submit) selama tab masih
        // terbuka; keepalive membuat request tetap terkirim walau tab ditutup.
        const res = await fetch("/api/violations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, type, timestamp: Date.now() }),
          keepalive: true,
        });

        if (res.ok) {
          const result: ViolationResult = await res.json();
          onViolation(result);
        }
      } finally {
        reporting.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) reportViolation("TAB_HIDDEN");
    }

    function handleBlur() {
      reportViolation("WINDOW_BLUR");
    }

    function handleFullscreenChange() {
      if (requireFullscreen && !document.fullscreenElement) {
        reportViolation("EXIT_FULLSCREEN");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (requireFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Browser mungkin menolak permintaan fullscreen tanpa gesture user;
        // ini bukan kegagalan fatal, hanya mengurangi lapisan deteksi.
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [sessionId, enabled, requireFullscreen, onViolation]);

  return null;
}
