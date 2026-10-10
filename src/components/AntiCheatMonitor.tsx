"use client";

import { useEffect, useRef, useState } from "react";

type ViolationType = "TAB_HIDDEN" | "WINDOW_BLUR" | "EXIT_FULLSCREEN";
type ViolationAction = "WARN" | "LOG_ONLY" | "AUTO_SUBMIT";

type ViolationResult = {
  violationCount: number;
  tolerance: number;
  action: ViolationAction;
  limitReached: boolean;
  type: ViolationType;
};

type Props = {
  sessionId: string;
  enabled: boolean; // toggle Anti Cheat admin — jika false, komponen ini tidak dipasang sama sekali
  requireFullscreen: boolean;
  onViolation: (result: ViolationResult) => void;
  // Dipanggil sebelum pelanggaran dilaporkan, supaya jawaban yang belum
  // tersimpan sempat terkirim sebelum server mungkin mengakhiri sesi.
  beforeReport?: () => Promise<unknown>;
};

/**
 * Peserta baru dianggap "meninggalkan halaman" jika pergi lebih lama dari ini.
 * Di iPhone, layar terkunci sesaat, banner telepon, atau menarik Control
 * Center memicu blur/visibilitychange walau peserta tidak berpindah aplikasi;
 * tanpa masa tenggang hal-hal ini langsung dihitung pelanggaran.
 */
const AWAY_GRACE_MS = 4000;

/**
 * Safari di iPhone tidak menyediakan Fullscreen API untuk elemen non-video
 * (requestFullscreen undefined), jadi syarat fullscreen tidak bisa
 * diberlakukan di sana.
 */
export function isFullscreenSupported() {
  if (typeof document === "undefined") return false;
  return (
    typeof document.documentElement.requestFullscreen === "function" &&
    document.fullscreenEnabled !== false
  );
}

function enterFullscreen() {
  try {
    void document.documentElement.requestFullscreen().catch(() => {
      // Browser dapat menolak fullscreen tanpa gesture pengguna.
    });
  } catch {
    // Safari dapat melempar error sinkron saat fullscreen tidak tersedia.
  }
}

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
  beforeReport,
}: Props) {
  const reporting = useRef(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  // Callback disimpan di ref supaya effect di bawah tidak dipasang ulang
  // setiap parent render (yang akan me-reset status "sedang pergi").
  const callbacks = useRef({ onViolation, beforeReport });

  useEffect(() => {
    callbacks.current = { onViolation, beforeReport };
  }, [onViolation, beforeReport]);

  useEffect(() => {
    if (!enabled) return;

    const fullscreenActive = requireFullscreen && isFullscreenSupported();
    let awaySince: number | null = null;
    let awayType: ViolationType = "WINDOW_BLUR";
    let promptTimer: ReturnType<typeof setTimeout> | undefined;

    async function reportViolation(type: ViolationType) {
      if (reporting.current) return;
      reporting.current = true;

      try {
        await callbacks.current.beforeReport?.().catch(() => {});

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
          callbacks.current.onViolation(result);
        }
      } catch {
        // Perubahan lifecycle Safari dapat membatalkan request keepalive.
        // Kegagalan pencatatan tidak boleh menjatuhkan halaman ujian.
      } finally {
        reporting.current = false;
      }
    }

    // Pelanggaran dilaporkan saat peserta kembali, bukan saat pergi: iOS
    // membekukan JavaScript halaman yang tersembunyi sehingga request yang
    // dikirim saat pergi sering tidak sampai, dan baru saat kembali kita
    // tahu berapa lama peserta pergi.
    function markAway(type: ViolationType) {
      if (awaySince === null) awaySince = Date.now();
      if (type === "TAB_HIDDEN") awayType = "TAB_HIDDEN";
    }

    function markBack() {
      if (awaySince === null) return;
      const awayMs = Date.now() - awaySince;
      const type = awayType;
      awaySince = null;
      awayType = "WINDOW_BLUR";
      if (awayMs >= AWAY_GRACE_MS) reportViolation(type);
    }

    function handleVisibilityChange() {
      if (document.hidden) markAway("TAB_HIDDEN");
      else markBack();
    }

    function handleBlur() {
      markAway("WINDOW_BLUR");
    }

    function handleFocus() {
      markBack();
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setShowFullscreenPrompt(true);
        reportViolation("EXIT_FULLSCREEN");
      } else {
        setShowFullscreenPrompt(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    if (fullscreenActive) {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      if (!document.fullscreenElement) {
        enterFullscreen();
        // Jika browser menolak karena tidak ada gesture pengguna, tombol
        // di bawah memberi peserta cara masuk fullscreen secara manual.
        promptTimer = setTimeout(() => {
          if (!document.fullscreenElement) setShowFullscreenPrompt(true);
        }, 500);
      }
    }

    return () => {
      clearTimeout(promptTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [sessionId, enabled, requireFullscreen]);

  if (!showFullscreenPrompt) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm text-zinc-700">
          Ujian ini wajib dikerjakan dalam mode layar penuh (fullscreen).
        </p>
        <button
          onClick={enterFullscreen}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200"
        >
          Masuk Mode Fullscreen
        </button>
      </div>
    </div>
  );
}
