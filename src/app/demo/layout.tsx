import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesa de Pruebas y Calculadora Interactiva de Hoja 5e (Sin Registro)",
  description:
    "Prueba gratis la calculadora de hoja de personaje 5e, el rastreador de combate e iniciativa y el panel de DM en el sandbox interactivo de ArcanaLobby.",
  alternates: {
    canonical: "/demo",
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
