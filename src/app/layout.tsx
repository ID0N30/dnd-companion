import type { Metadata } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import MagicParticles from "@/components/MagicParticles";
import ErrorToast from "@/components/ErrorToast";
import CustomNotificationModal from "@/components/CustomNotificationModal";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dnd-companion-chi.vercel.app"),
  title: {
    default: "D&D Companion | Grimorio Digital, Hoja 5e y Panel de DM",
    template: "%s | D&D Companion",
  },
  description:
    "Grimorio digital en tiempo real para D&D 5e. Crea tu hoja de personaje automatizada, dirige combates en el panel de DM y explora campañas de rol gratis.",
  keywords: [
    "D&D Companion",
    "grimorio digital",
    "hoja de personaje 5e",
    "panel de DM",
    "Dungeons and Dragons 5e español",
    "campañas de rol online",
    "rastreador de iniciativa 5e",
    "dados de rol d20",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://dnd-companion-chi.vercel.app/",
    siteName: "D&D Companion",
    title: "D&D Companion | Grimorio Digital, Hoja 5e y Panel de DM",
    description:
      "Grimorio digital en tiempo real para D&D 5e. Crea tu hoja de personaje automatizada, dirige combates en el panel de DM y explora campañas de rol gratis.",
    images: [
      {
        url: "/assets/banners/banner-companion.webp",
        width: 1200,
        height: 630,
        alt: "D&D Companion — Grimorio Digital, Hoja 5e y Panel de DM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D Companion | Grimorio Digital, Hoja 5e y Panel de DM",
    description:
      "Grimorio digital en tiempo real para D&D 5e. Crea tu hoja de personaje automatizada, dirige combates en el panel de DM y explora campañas de rol gratis.",
    images: ["/assets/banners/banner-companion.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/assets/icons/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
      <body className="min-h-full flex flex-col font-serif text-ink bg-black bg-[url('/bg.webp')] bg-cover bg-center bg-fixed bg-no-repeat" suppressHydrationWarning>
        <AuthProvider>
          <MagicParticles />
          <ErrorToast />
          <CustomNotificationModal />
          {children}
          <Footer />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
