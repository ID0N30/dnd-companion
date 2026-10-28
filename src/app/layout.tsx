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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://arcanalobby.vercel.app"),
  title: {
    default: "ArcanaLobby | Grimorio Digital, Creador y Calculadora de Hoja de Personaje 5e",
    template: "%s | ArcanaLobby",
  },
  description:
    "ArcanaLobby es el grimorio digital y lobby en tiempo real compatible con D&D 5e. Creador y calculadora de hoja de personaje 5e online, panel de DM, rastreador de iniciativa y dados d20 gratis.",
  keywords: [
    "ArcanaLobby",
    "creador de personajes 5e",
    "calculadora hoja de personaje dnd 5e",
    "hoja de personaje 5e online español",
    "grimorio digital 5e",
    "panel de DM en tiempo real",
    "rastreador de iniciativa 5e",
    "ficha de rol D&D 5e gratis",
    "dados de rol d20 online",
  ],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://arcanalobby.vercel.app/",
    siteName: "ArcanaLobby",
    title: "ArcanaLobby | Grimorio Digital, Creador y Calculadora de Hoja de Personaje 5e",
    description:
      "ArcanaLobby es el grimorio digital y lobby en tiempo real compatible con D&D 5e. Creador y calculadora de hoja de personaje 5e online, panel de DM, rastreador de iniciativa y dados d20 gratis.",
    images: [
      {
        url: "/assets/banners/banner-companion.webp",
        width: 1200,
        height: 630,
        alt: "ArcanaLobby — Grimorio Digital, Creador de Hoja 5e y Panel de DM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArcanaLobby | Grimorio Digital, Creador y Calculadora de Hoja de Personaje 5e",
    description:
      "ArcanaLobby es el grimorio digital y lobby en tiempo real compatible con D&D 5e. Creador y calculadora de hoja de personaje 5e online, panel de DM, rastreador de iniciativa y dados d20 gratis.",
    images: ["/assets/banners/banner-companion.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon-96x96.png?v=3", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "7xj0OLiDPT57jdJYULztn5AMEEyjkoSYes72btUlgNU",
  },
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
