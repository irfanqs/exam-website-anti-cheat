export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <form className="w-full max-w-sm space-y-5 rounded-xl border border-black/[.08] p-8 dark:border-white/[.145]">
        <h1 className="text-xl font-semibold">Login Admin</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-zinc-900"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background"
        >
          Masuk
        </button>

        <p className="text-center text-xs text-zinc-500">
          Autentikasi (NextAuth/Clerk) belum terpasang — lihat PRD §6 &amp; README.
        </p>
      </form>
    </div>
  );
}
