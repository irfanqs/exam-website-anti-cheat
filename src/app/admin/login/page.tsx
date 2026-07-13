"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email atau password salah.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-4 w-full max-w-sm">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Kembali ke Beranda
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-black/[.08] bg-white/80 p-8 shadow-lg shadow-blue-100/50 backdrop-blur"
      >
        <h1 className="text-xl font-semibold">Login Admin</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-md shadow-blue-200 transition-transform hover:scale-[1.01] disabled:opacity-70"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Belum punya akun admin? Jalankan{" "}
          <code className="rounded bg-black/5 px-1">npm run db:seed</code>{" "}
          untuk membuat akun awal (lihat README).
        </p>
      </form>
    </div>
  );
}
