import { Spinner } from "@/components/Spinner";

export function PageLoading({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-sun shadow-[4px_4px_0_#1b1b1b]">
        <Spinner className="h-7 w-7 text-ink" />
      </span>
      <p className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-medium">{label}</p>
    </div>
  );
}
