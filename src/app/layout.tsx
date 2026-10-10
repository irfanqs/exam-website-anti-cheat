import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ujian Online Anti-Cheat",
  description: "Platform ujian online dengan timer otomatis, penilaian per soal, dan deteksi kecurangan.",
  // Google Translate mengganti teks halaman dengan elemen <font> miliknya,
  // sehingga React gagal memperbarui DOM ("Failed to execute 'insertBefore'")
  // dan halaman crash. Konten sudah berbahasa Indonesia, jadi terjemahan dimatikan.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      translate="no"
      className={`${outfit.variable} notranslate h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
