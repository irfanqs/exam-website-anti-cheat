import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi edge-safe: dipakai oleh middleware.ts. Tidak boleh
 * mengimpor Prisma/bcrypt di sini karena keduanya bergantung pada
 * Node.js API (fs/net) yang tidak tersedia di Edge runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      const isAdminRoot = request.nextUrl.pathname === "/admin";

      if (isLoginPage) {
        return isLoggedIn ? Response.redirect(new URL("/admin", request.nextUrl)) : true;
      }

      if (isAdminRoot && !isLoggedIn) {
        return Response.redirect(new URL("/admin/login", request.nextUrl));
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
