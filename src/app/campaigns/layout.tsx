import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salón de Campañas y Mesas de Rol 5e en Tiempo Real",
  description:
    "Explora campañas públicas o crea tu propia sala de rol en tiempo real en ArcanaLobby. Conecta hojas de personaje 5e con el panel del Dungeon Master.",
  alternates: {
    canonical: "/campaigns",
  },
};

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
