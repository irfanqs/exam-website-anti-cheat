"use client";

import { useState } from "react";

const DEFAULT_CLASSES =
  "rounded border border-black/[.08] px-2 py-0.5 text-xs hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.05]";

export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleCopy} className={className ?? DEFAULT_CLASSES}>
      {copied ? "Tersalin!" : "Salin Kode"}
    </button>
  );
}
