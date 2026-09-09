import Link from "next/link";
import { FileText, ArrowLeft, ShieldCheck, Scale, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Términos de Servicio — Idoneus Software",
  description: "Términos y Condiciones de Uso de la plataforma DnD Companion.",
};

export default function TermsPage() {
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
          Idoneus Software • Términos Legales
        </span>
      </div>

      {/* ARTICLE BODY */}
      <article className="bg-parchment-dark/90 p-6 sm:p-10 rounded-2xl border-2 border-magic-gold/40 shadow-2xl space-y-6 text-ink">
        
        <header className="border-b border-ink/10 pb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-magic-gold/20 border border-magic-gold rounded-xl text-magic-gold">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-magic-gold">
                Términos de Servicio
              </h1>
              <p className="text-xs text-ink-light">Última actualización: Septiembre de 2026 • Versión 1.0</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 text-xs sm:text-sm leading-relaxed text-ink/90">
          
          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-2 border-t border-ink/10">
            <Scale className="w-5 h-5" /> 1. Aceptación de los Términos
          </h2>
          <p>
            Al acceder, registrarse o utilizar <strong>DnD Companion</strong> (desarrollado bajo la denominación comercial <strong>Idoneus Software</strong>), el usuario acepta estar sujeto a los presentes Términos de Servicio y a todas las leyes aplicables. Si no está de acuerdo con alguno de estos términos, debe abstenerse de utilizar la aplicación.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            <ShieldCheck className="w-5 h-5" /> 2. Descripción del Servicio y Modelo Freemium
          </h2>
          <p>
            DnD Companion es una suite de herramientas en tiempo real para apoyar partidas de rol basadas en D&D 5ª Edición (D&D 5e). El servicio ofrece acceso a hojas de personaje sincronizadas, panel de Dungeon Master y asistente de dados.
          </p>
          <p>
            Idoneus Software se reserva el derecho de establecer límites de cuotas de uso o introducir niveles de suscripción (modelo Freemium) en el futuro para mantener la escalabilidad de la infraestructura sin alterar las partidas existentes.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            <AlertCircle className="w-5 h-5" /> 3. Uso Aceptable y Cuentas de Usuario
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>Cada usuario es responsable del uso de su cuenta e identidad de Google OAuth o sesión de invitado.</li>
            <li>Queda estrictamente prohibida la suplantación de identidad, la saturación maliciosa de salas de juego o el uso de scripts automatizados que perturben el servicio en Firebase Firestore.</li>
            <li>Idoneus Software se reserva el derecho de suspender o restringir el acceso a usuarios que vulneren la estabilidad de la plataforma.</li>
          </ul>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            ⚖️ 4. Limitación de Responsabilidad
          </h2>
          <p>
            El software se proporciona "tal cual" (*as is*), sin garantías expresas o implícitas de disponibilidad ininterrumpida. Idoneus Software no se hace responsable por interrupciones temporales causadas por servicios de terceros (como Firebase, Vercel o proveedores de red).
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            📬 5. Contacto Legal y Soporte
          </h2>
          <p>
            Para consultas relacionadas con estos términos, comuníquese formalmente a través de:{" "}
            <a href="mailto:soporte@idoneus-software.dev" className="text-magic-gold font-bold underline">
              soporte@idoneus-software.dev
            </a>
          </p>

        </section>

      </article>

    </main>
  );
}
