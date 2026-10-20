import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creador y Calculadora de Personajes 5e Paso a Paso",
  description:
    "Generador y calculadora automática de hojas de personaje para 5ª Edición (SRD 5e). Calcula atributos, puntos de golpe, CA, hechizos y equipo inicial.",
  alternates: {
    canonical: "/create",
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
