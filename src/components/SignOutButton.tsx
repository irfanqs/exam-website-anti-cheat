"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      Keluar
    </button>
  );
}
