"use client";

import { useEffect, useRef } from "react";

type ViolationType = "TAB_HIDDEN" | "WINDOW_BLUR" | "EXIT_FULLSCREEN";

type Props = {
  sessionId: string;
  tolerance: number; // jumlah pelanggaran yang ditoleransi sebelum auto-submit
  requireFullscreen: boolean;
  onLimitReached: () => void; // dipanggil saat server konfirmasi ambang batas terlampaui
};

/**
 * Implementasi PRD Appendix A: mendeteksi (bukan mencegah) peserta
 * berpindah tab/window, lalu melaporkannya ke server via sendBeacon.
 * Keputusan auto-submit selalu diambil server, bukan client ini.
 */
export function AntiCheatMonitor({
  sessionId,
  tolerance,
  requireFullscreen,
  onLimitReached,
}: Props) {
  const violationCount = useRef(0);

  useEffect(() => {
    function reportViolation(type: ViolationType) {
      const payload = JSON.stringify({ sessionId, type, timestamp: Date.now() });
      const sent = navigator.sendBeacon(
        "/api/violations",
        new Blob([payload], { type: "application/json" })
      );

      violationCount.current += 1;

      // Fallback client-side check untuk UX cepat; keputusan final tetap
      // divalidasi ulang oleh server saat menerima request /api/violations.
      if (!sent || violationCount.current > tolerance) {
        onLimitReached();
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
  }, [sessionId, tolerance, requireFullscreen, onLimitReached]);

  return null;
}
