import { Spinner } from "@/components/Spinner";

export function PageLoading({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <Spinner className="h-8 w-8 text-blue-600" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}
