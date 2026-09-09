import Link from "next/link";
import { Cookie, ArrowLeft, Database, BarChart3, HardDrive } from "lucide-react";

export const metadata = {
  title: "Política de Cookies — Idoneus Software",
  description: "Información sobre el uso de cookies y almacenamiento local en DnD Companion.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 max-w-4xl mx-auto font-sans space-y-8 relative z-10">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-ink/20 pb-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-ink hover:text-magic-gold bg-parchment-dark px-3 py-1.5 rounded-lg border border-ink/20 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-magic-gold" /> Volver al Inicio
        </Link>
        <span className="text-xs font-bold text-magic-gold bg-magic-gold/10 border border-magic-gold/30 px-3 py-1 rounded">
          Idoneus Software • Uso de Cookies
        </span>
      </div>

      {/* ARTICLE BODY */}
      <article className="bg-parchment-dark/90 p-6 sm:p-10 rounded-2xl border-2 border-magic-gold/40 shadow-2xl space-y-6 text-ink">
        
        <header className="border-b border-ink/10 pb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-magic-gold/20 border border-magic-gold rounded-xl text-magic-gold">
              <Cookie className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-magic-gold">
                Política de Cookies & Almacenamiento
              </h1>
              <p className="text-xs text-ink-light">Última actualización: Septiembre de 2026 • Versión 1.0</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 text-xs sm:text-sm leading-relaxed text-ink/90">
          
          <p>
            Esta política explica cómo <strong>DnD Companion</strong> (publicado bajo la denominación comercial <strong>Idoneus Software</strong>) utiliza cookies y tecnologías de almacenamiento local en el navegador del usuario para garantizar el correcto funcionamiento de las salas de juego en tiempo real.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-2 border-t border-ink/10">
            <HardDrive className="w-5 h-5" /> 1. Almacenamiento Local (LocalStorage & SessionStorage)
          </h2>
          <p>
            DnD Companion emplea <strong>LocalStorage</strong> para conservar preferencias locales y asegurar que las fichas de personaje no se pierdan en caso de desconexiones temporales:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li><strong>Sesión de Autenticación</strong>: Mantiene el token de sesión de Google Firebase Auth o de invitado.</li>
            <li><strong>Notas Privadas</strong>: Guarda las notas personales del jugador de forma local en el navegador.</li>
            <li><strong>Sincronización Inter-pestañas</strong>: Uso de <code>BroadcastChannel</code> para transmitir dados y turnos entre pestañas abiertas del mismo usuario.</li>
          </ul>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            <BarChart3 className="w-5 h-5" /> 2. Cookies de Analítica (Vercel Analytics)
          </h2>
          <p>
            Utilizamos <strong>Vercel Analytics</strong> para recopilar métricas anónimas de rendimiento, tiempos de carga y visitas de página. Estas cookies no rastrean información personal ni identifican de forma individual al usuario.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            ⚙️ 3. Control y Desactivación de Cookies
          </h2>
          <p>
            El usuario puede deshabilitar las cookies o borrar el almacenamiento local a través de la configuración de su navegador. Tenga en cuenta que deshabilitar el almacenamiento local afectará la capacidad de mantener sesiones de juego activas o conservar notas locales en la aplicación.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            📬 4. Consultas
          </h2>
          <p>
            Si tiene dudas sobre el almacenamiento de datos en la aplicación, contáctenos en:{" "}
            <a href="mailto:jaomp3@gmail.com" className="text-magic-gold font-bold underline">
              jaomp3@gmail.com
            </a>
          </p>

        </section>

      </article>

    </main>
  );
}
