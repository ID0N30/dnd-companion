import Link from "next/link";
import { Lock, ArrowLeft, ShieldAlert, UserCheck, Database, Globe } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad — Idoneus Software",
  description: "Política de Privacidad y Tratamiento de Datos Personales para DnD Companion.",
};

export default function PrivacyPage() {
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
          Idoneus Software • Protección de Datos
        </span>
      </div>

      {/* ARTICLE BODY */}
      <article className="bg-parchment-dark/90 p-6 sm:p-10 rounded-2xl border-2 border-magic-gold/40 shadow-2xl space-y-6 text-ink">
        
        <header className="border-b border-ink/10 pb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-magic-gold/20 border border-magic-gold rounded-xl text-magic-gold">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-magic-gold">
                Política de Privacidad
              </h1>
              <p className="text-xs text-ink-light">Última actualización: Septiembre de 2026 • Versión 1.0</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 text-xs sm:text-sm leading-relaxed text-ink/90">
          
          {/* OBLIGATORY LEGAL RESPONSIBILITY NOTICE */}
          <div className="p-4 bg-magic-gold/10 border-2 border-magic-gold/50 rounded-xl space-y-2 text-ink">
            <h3 className="font-bold text-base font-cinzel text-magic-gold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-magic-gold" /> Responsable Legal del Tratamiento de Datos
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed">
              En cumplimiento de las normativas de protección de datos personales aplicables, se establece explícitamente que la recolección, almacenamiento de información de cuentas y el tratamiento de datos para <strong>DnD Companion</strong> y <strong>TeamLobby</strong> son responsabilidad legal de <strong>Julian Andrés Osorio Marín</strong>, operando como persona natural desde <strong>Colombia</strong> bajo la denominación comercial <strong>Idoneus Software</strong>.
            </p>
          </div>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-2 border-t border-ink/10">
            <UserCheck className="w-5 h-5" /> 1. Datos Recopilados
          </h2>
          <p>
            DnD Companion opera bajo el principio de minimización de datos. Solo recopilamos los siguientes elementos estrictamente necesarios:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li><strong>Autenticación de Cuenta</strong>: Dirección de correo electrónico y nombre público asociado suministrados voluntariamente mediante Google OAuth o ID temporal de invitado.</li>
            <li><strong>Datos del Sistema de Juego</strong>: Fichas de personaje (atributos, inventario, hechizos), salas creadas e historial de tiradas de dados en tiempo real.</li>
            <li><strong>Métricas de Navegación Anónimas</strong>: Datos agregados de tráfico y visitas procesados sin identificación individual mediante Vercel Analytics.</li>
          </ul>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            <Database className="w-5 h-5" /> 2. Almacenamiento y Seguridad
          </h2>
          <p>
            La información se almacena utilizando la infraestructura segura de <strong>Firebase (Google Cloud Platform)</strong> con cifrado en tránsito (TLS/SSL) y reglas de seguridad de Firestore para restringir el acceso entre campañas de juego.
          </p>

          <h2 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2 pt-4 border-t border-ink/10">
            <Globe className="w-5 h-5" /> 3. Derechos del Usuario (ARCO)
          </h2>
          <p>
            Los usuarios pueden solicitar la rectificación, eliminación o acceso a sus datos personales almacenados en la plataforma enviando una solicitud formal al correo del responsable legal:{" "}
            <a href="mailto:jaomp3@gmail.com" className="text-magic-gold font-bold underline">
              jaomp3@gmail.com
            </a>
          </p>

        </section>

      </article>

    </main>
  );
}
