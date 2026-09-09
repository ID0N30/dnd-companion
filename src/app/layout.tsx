import type { Metadata } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import MagicParticles from "@/components/MagicParticles";
import ErrorToast from "@/components/ErrorToast";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D&D Companion - Grimoire",
  description: "Una hoja de personaje interactiva y panel de DM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${ebGaramond.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-serif text-ink bg-black bg-[url('/bg.jpg')] bg-cover bg-center bg-fixed bg-no-repeat" suppressHydrationWarning>
        <AuthProvider>
          <MagicParticles />
          <ErrorToast />
          {children}
          <Footer />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
