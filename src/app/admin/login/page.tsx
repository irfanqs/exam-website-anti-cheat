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
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-3 w-full max-w-sm px-2">
        <Link href="/" className="back-link">
          ← Kembali ke Beranda
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shell my-0 max-w-sm space-y-5"
      >
        <h1 className="text-2xl font-semibold">
          <span className="marker">Login Admin</span>
        </h1>

        <div className="space-y-1">
          <label className="label">Email</label>
          <input
            name="email"
            type="email"
            required
            className="input"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Password</label>
          <input
            name="password"
            type="password"
            required
            className="input"
          />
        </div>

        {error && <p className="text-sm font-medium text-brick">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <p className="text-center text-xs text-muted">
          Belum punya akun admin? Jalankan{" "}
          <code className="rounded bg-sun px-1">npm run db:seed</code>{" "}
          untuk membuat akun awal (lihat README).
        </p>
      </form>
    </div>
  );
}
