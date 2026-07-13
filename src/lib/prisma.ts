import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL dipakai kalau diset manual. Kalau Vercel disambungkan ke Supabase
// lewat integrasi resmi (Marketplace), Vercel otomatis mengisi POSTGRES_PRISMA_URL
// (pooled) / POSTGRES_URL alih-alih DATABASE_URL — jadi fallback ke situ.
const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;

const adapter = new PrismaPg({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
