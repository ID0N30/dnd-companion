"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import TeamLobbyPromo from "@/components/TeamLobbyPromo";
import { ASSETS } from "@/lib/assets";
import { 
  Compass, Shield, Swords, LogIn, LogOut, Zap, BookOpen, Users, 
  Sparkles, UserCheck, Settings, ArrowRight, ChevronDown, CheckCircle2,
  Dice5, ScrollText, Play, HelpCircle
} from "lucide-react";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "D&D Companion",
      "alternateName": "Grimorio Digital D&D 5e",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "description":
        "Grimorio digital en tiempo real para D&D 5e. Crea tu hoja de personaje automatizada, dirige combates en el panel de DM y explora campañas de rol gratis.",
      "url": "https://dnd-companion-chi.vercel.app/",
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Qué es D&D Companion y cómo funciona este grimorio digital?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "D&D Companion es un grimorio digital web diseñado para jugadores y Dungeon Masters de Dungeons & Dragons 5ª Edición (SRD 5e). Permite gestionar fichas de personaje, seguir turnos de iniciativa en combate, sincronizar tiradas de dados d20 y coordinar campañas en tiempo real. Funciona directamente en cualquier navegador moderno sin descargas.",
          },
        },
        {
          "@type": "Question",
          "name": "¿Qué automatizaciones incluye la hoja de personaje 5e?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Cada hoja de personaje 5e calcula automáticamente modificadores de características, bonificador de competencia, tiradas de salvación, clase de armadura (CA), puntos de golpe máximos y temporales, ranuras de conjuros por nivel de lanzador y descansos cortos o largos según las reglas oficiales de D&D 5e.",
          },
        },
        {
          "@type": "Question",
          "name": "¿Qué herramientas ofrece el panel de DM para dirigir campañas?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "El panel de DM proporciona al director de juego supervisión de salud y estados de la party en tiempo real, rueda de iniciativa para combate táctico, otorgamiento de dados de inspiración, reparto dinámico de botín y tesoros monetarios, e intercambio de susurros secretos individuales con los aventureros.",
          },
        },
        {
          "@type": "Question",
          "name": "¿Es gratis usar D&D Companion en partidas presenciales o por Discord?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Sí, D&D Companion es una plataforma 100% gratuita y de libre acceso. Puedes jugar como invitado sin necesidad de registrarte, o iniciar sesión con Google para crear y guardar tus propias campañas como Dungeon Master tanto para partidas en mesa física como a distancia por Discord.",
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  const { user, isLoggedIn, isGuest, logout } = useAuth();
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 relative flex flex-col items-center overflow-x-hidden font-sans">
      
      {/* STRUCTURED DATA (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* TOP NAVIGATION BAR */}
      <header className="w-full max-w-6xl flex justify-between items-center bg-parchment-dark/80 p-3.5 sm:p-4 rounded-xl border border-magic-gold/40 mb-10 backdrop-blur-sm text-xs sm:text-sm shadow-lg">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src={ASSETS.icons.d20} className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow group-hover:rotate-12 transition-transform duration-300" alt="D20 Emblem" />
          <span className="font-cinzel font-bold text-base sm:text-lg text-magic-gold tracking-wide">D&D Companion</span>
        </Link>

        {/* Quick Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-ink-light">
          <Link href="/campaigns" className="hover:text-magic-gold transition flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-magic-gold" /> Salón de Campañas
          </Link>
          <a href="#mesa-pruebas" className="hover:text-magic-gold transition flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-magic-gold" /> Mesa de Pruebas
          </a>
          <a href="#caracteristicas" className="hover:text-magic-gold transition">
            Características
          </a>
        </nav>

        {/* User Auth Corner */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/campaigns"
            className="hidden sm:inline-flex items-center gap-1.5 bg-magic-gold/15 hover:bg-magic-gold text-magic-gold hover:text-black border border-magic-gold/40 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" /> Campañas
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-ink font-bold hidden lg:inline-flex items-center gap-1.5 bg-ink/5 px-3 py-1.5 rounded border border-ink/10 text-xs">
                <UserCheck className="w-4 h-4 text-magic-gold" /> {user?.displayName || user?.email}
              </span>
              <button
                onClick={() => setAccountSettingsOpen(true)}
                className="flex items-center gap-1.5 bg-parchment text-ink hover:text-magic-gold px-3 py-1.5 rounded border border-ink/20 transition text-xs font-bold cursor-pointer"
                title="Ajustes de Cuenta y Mis Personajes"
              >
                <Settings className="w-4 h-4 text-magic-gold" /> <span className="hidden sm:inline">Ajustes</span>
              </button>
              <button 
                onClick={logout}
                className="flex items-center gap-1.5 bg-ink/10 text-ink hover:text-magic-red p-2 rounded transition font-bold cursor-pointer text-xs"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-2">
              <span className="text-ink-light italic text-xs hidden sm:inline">Invitado</span>
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 bg-magic-gold text-black px-3 py-1.5 rounded font-bold hover:bg-yellow-500 transition shadow cursor-pointer text-xs"
              >
                <LogIn className="w-3.5 h-3.5" /> Ingresar
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-magic-gold text-black px-3.5 py-1.5 sm:px-4 sm:py-2 rounded font-bold hover:bg-yellow-500 transition shadow cursor-pointer text-xs"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION (SEO & CONVERSION OPTIMIZED) */}
      <section className="w-full max-w-5xl flex flex-col items-center text-center mb-16 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full flex flex-col items-center"
        >
          {/* Official Banner Image */}
          <div className="relative mb-8 group max-w-2xl w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-magic-gold/40 via-yellow-600/30 to-magic-gold/40 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
            <img 
              src={ASSETS.banners.companion} 
              className="relative w-full rounded-2xl border-2 border-magic-gold/50 shadow-2xl object-cover" 
              alt="D&D Companion — Grimorio Digital de Rol" 
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl text-magic-gold font-bold mb-4 font-cinzel tracking-wider drop-shadow-md leading-tight">
            D&D Companion: Grimorio Digital, Hoja 5e y Panel de DM
          </h1>
          
          <p className="text-base sm:text-xl text-ink-light mb-6 max-w-2xl italic font-serif leading-relaxed">
            D&D Companion es el grimorio digital en tiempo real para Dungeons & Dragons 5ª Edición. Sincroniza cada hoja 5e automatizada y dirige combates tácticos con el panel de DM para partidas presenciales o por Discord.
          </p>
          
          <p className="text-xs sm:text-sm text-ink-light max-w-xl mx-auto leading-relaxed mb-8">
            Diseñado para eliminar el papeleo y potenciar la narrativa. Crea tu hoja de personaje 5e en segundos como jugador invitado sin registro obligatorio, o accede con Google para forjar campañas completas desde el panel de DM.
          </p>

          {/* Call to Actions (CTA) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/campaigns"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-magic-gold via-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-cinzel font-bold text-sm sm:text-base rounded-xl transition-all shadow-[0_0_25px_rgba(245,208,97,0.4)] hover:shadow-[0_0_35px_rgba(245,208,97,0.6)] transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Compass className="w-5 h-5" /> Ingresar al Salón de Campañas <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#mesa-pruebas"
              className="w-full sm:w-auto px-6 py-4 bg-parchment-dark/90 hover:bg-parchment text-ink hover:text-magic-gold border border-magic-gold/40 font-cinzel font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-magic-gold" /> Probar Mesa de Pruebas <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </section>

      {/* CORE FEATURES & VALUE PILLARS */}
      <section id="caracteristicas" className="w-full max-w-6xl mb-20 scroll-mt-12 font-sans">
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase tracking-widest text-magic-gold font-bold font-mono block mb-2">
            Plataforma Integral para D&D 5ª Edición
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-cinzel text-ink">
            Todo lo que tu Mesa Necesita en un Solo Lugar
          </h2>
          <p className="text-xs sm:text-sm text-ink-light max-w-2xl mx-auto mt-2">
            Herramientas intuitivas diseñadas para agilizar cada fase del juego, desde el combate táctico hasta el rol narrativo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pilar 1: Sincronización Realtime */}
          <div className="bg-parchment-dark p-6 rounded-xl border border-magic-gold/30 shadow-lg hover:border-magic-gold transition flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-magic-gold/15 border border-magic-gold/40 flex items-center justify-center text-magic-gold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-cinzel text-magic-gold">
                Sincronización en Tiempo Real
              </h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Tiradas de dados d20, rueda de turnos de iniciativa y puntos de golpe compartidos al instante con D&D Companion. La sincronización en la nube conecta cada hoja 5e con el panel de DM en partidas presenciales o por Discord.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 text-[11px] text-ink font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-magic-gold shrink-0" /> Turnos y tiradas al instante
            </div>
          </div>

          {/* Pilar 2: Hojas Automatizadas */}
          <div className="bg-parchment-dark p-6 rounded-xl border border-magic-gold/30 shadow-lg hover:border-magic-gold transition flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-magic-gold/15 border border-magic-gold/40 flex items-center justify-center text-magic-gold">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-cinzel text-magic-gold">
                Hoja de Personaje 5e Automatizada
              </h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Fórmulas oficiales del SRD de D&D 5e calculadas al vuelo: bonificadores de competencia, ranuras de conjuros, descansos cortos y largos, equipamiento dinámico y notas en tu grimorio digital.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 text-[11px] text-ink font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-magic-gold shrink-0" /> Modificadores automáticos
            </div>
          </div>

          {/* Pilar 3: Panel Maestro DM */}
          <div className="bg-parchment-dark p-6 rounded-xl border border-magic-gold/30 shadow-lg hover:border-magic-gold transition flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-magic-gold/15 border border-magic-gold/40 flex items-center justify-center text-magic-gold">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-cinzel text-magic-gold">
                Panel de DM & Control Maestro
              </h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Supervisión centralizada de la party completa: inspección en vivo de cada hoja 5e, reparto instantáneo de botín y tesoros, gestión de iniciativa y estados de salud desde el panel de DM.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 text-[11px] text-ink font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-magic-gold shrink-0" /> Control total de la aventura
            </div>
          </div>

          {/* Pilar 4: Sin Barreras */}
          <div className="bg-parchment-dark p-6 rounded-xl border border-magic-gold/30 shadow-lg hover:border-magic-gold transition flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-magic-gold/15 border border-magic-gold/40 flex items-center justify-center text-magic-gold">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-cinzel text-magic-gold">
                Acceso Inmediato & Sin Registro
              </h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Juega de inmediato en D&D Companion como invitado sin crear cuenta ni perder tiempo, o inicia sesión con Google para desbloquear el panel de DM y crear campañas privadas ilimitadas.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 text-[11px] text-ink font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-magic-gold shrink-0" /> Modo invitado & Google
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS / 3 STEPS SECTION */}
      <section className="w-full max-w-5xl mb-20 font-sans">
        <div className="bg-parchment-dark/60 rounded-2xl border border-ink/20 p-6 sm:p-10 shadow-xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold">
              ¿Cómo Comenzar a Jugar en D&D Companion?
            </h2>
            <p className="text-xs sm:text-sm text-ink-light mt-1">
              En tres pasos sencillos estarás explorando mazmorras con tu grupo:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-magic-gold text-black font-cinzel font-bold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold font-cinzel text-base text-ink">Entra al Salón de Campañas</h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Accede al Salón de Campañas. Únete a una sala pública activa o pide la clave de la campaña privada a tu Dungeon Master.
              </p>
            </div>

            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-magic-gold text-black font-cinzel font-bold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold font-cinzel text-base text-ink">Crea tu Héroe y Hoja 5e</h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Elige tu raza, clase y trasfondo. Los atributos, modificadores, puntos de golpe y ranuras mágicas se configurarán de forma automática en tu grimorio digital.
              </p>
            </div>

            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-magic-gold text-black font-cinzel font-bold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold font-cinzel text-base text-ink">Lanza los Dados y Disfruta</h3>
              <p className="text-xs text-ink-light leading-relaxed">
                Disfruta de tiradas animadas en vivo, sincronización de combate turno por turno y recompensas directas otorgadas por el DM desde su panel de DM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL SECTION: TEST CAMPAIGN / SANDBOX DEMO SHOWCASE */}
      <section id="mesa-pruebas" className="w-full max-w-5xl mb-16 scroll-mt-12 font-sans">
        <div className="bg-gradient-to-br from-[#1c140e] via-[#241a12] to-[#120d09] border-2 border-magic-gold/60 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="absolute top-0 right-0 bg-magic-gold text-black text-[9px] font-extrabold px-3.5 py-1 rounded-bl uppercase tracking-wider font-sans">
            DEMOSTRACIÓN INTERACTIVA
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-magic-gold/20 border border-magic-gold/40 flex items-center justify-center text-magic-gold shrink-0">
                <Play className="w-5 h-5 fill-magic-gold" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-magic-gold font-cinzel">
                Mesa de Pruebas & Explorador de Funciones
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
              ¿Deseas probar este grimorio digital antes de organizar tu próxima sesión? Ingresa a la <strong>Mesa de Pruebas</strong>: un sandbox 100% interactivo y local precargado con una <strong>party de 4 héroes legendarios</strong> (Guerrero, Clériga, Pícaro y Mago). Prueba cada hoja 5e con tiradas animadas de dados d20, simulaciones de daño y combate, y el <strong>panel de DM</strong> en vivo sin necesidad de registro ni conexión a base de datos.
            </p>

            <div className="flex gap-2 flex-wrap text-xs pt-1">
              <span className="bg-magic-gold/10 text-magic-gold border border-magic-gold/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-magic-gold" /> Party de 4 Aventureros
              </span>
              <span className="bg-magic-gold/10 text-magic-gold border border-magic-gold/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Dice5 className="w-3.5 h-3.5 text-magic-gold" /> Tiradas Animadas 5e
              </span>
              <span className="bg-magic-gold/10 text-magic-gold border border-magic-gold/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-magic-gold" /> Panel de DM en Vivo
              </span>
              <span className="bg-magic-gold/10 text-magic-gold border border-magic-gold/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-magic-gold" /> Entorno 100% Local
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 items-center">
            <Link 
              href="/demo" 
              className="w-full text-center px-8 py-4 bg-gradient-to-r from-magic-gold via-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-cinzel font-bold text-sm sm:text-base rounded-xl transition-all shadow-[0_0_20px_rgba(245,208,97,0.35)] hover:scale-[1.03] cursor-pointer block"
            >
              Entrar a la Campaña de Prueba →
            </Link>
            <span className="text-[11px] text-center text-ink-light italic">
              Sin registro ni base de datos requerida
            </span>
          </div>
        </div>
      </section>

      {/* SEO FAQ SECTION */}
      <section id="preguntas-frecuentes" className="w-full max-w-5xl mb-16 scroll-mt-12 font-sans">
        <div className="bg-parchment-dark/70 rounded-2xl border border-magic-gold/40 p-6 sm:p-10 shadow-xl space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-widest text-magic-gold font-bold font-mono block">
              Respuestas Clave para tu Mesa de Rol
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold flex items-center justify-center gap-2.5">
              <HelpCircle className="w-6 h-6 text-magic-gold" /> Preguntas Frecuentes sobre nuestro Grimorio Digital 5e
            </h2>
            <p className="text-xs sm:text-sm text-ink-light max-w-2xl mx-auto">
              Todo lo que necesitas saber sobre cómo aprovechar al máximo tu hoja 5e, la coordinación de party y las funciones maestras del panel de DM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <h3 className="font-bold font-cinzel text-sm sm:text-base text-magic-gold">
                ¿Qué es D&D Companion y cómo funciona este grimorio digital?
              </h3>
              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                D&D Companion es un grimorio digital web diseñado para jugadores y Dungeon Masters de Dungeons & Dragons 5ª Edición (SRD 5e). Permite gestionar fichas de personaje, seguir turnos de iniciativa en combate, sincronizar tiradas de dados d20 y coordinar campañas en tiempo real. No requiere descargas ni instalaciones pesadas; funciona directamente en cualquier navegador moderno tanto en dispositivos móviles como en ordenadores.
              </p>
            </div>

            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <h3 className="font-bold font-cinzel text-sm sm:text-base text-magic-gold">
                ¿Qué automatizaciones incluye la hoja de personaje 5e?
              </h3>
              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                Cada hoja de personaje 5e calcula automáticamente los modificadores de características (Fuerza, Destreza, Constitución, Inteligencia, Sabiduría, Carisma), bonificadores de competencia por nivel, tiradas de salvación, clase de armadura (CA) y puntos de golpe máximos y temporales. Además, automatiza el seguimiento de ranuras de conjuros por nivel de lanzador, tiradas de salvación contra la muerte y la gestión de descansos cortos y largos según las reglas oficiales.
              </p>
            </div>

            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <h3 className="font-bold font-cinzel text-sm sm:text-base text-magic-gold">
                ¿Qué herramientas ofrece el panel de DM para dirigir campañas?
              </h3>
              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                El panel de DM proporciona al director de juego una visión panorámica instantánea de toda la party aventurera. Permite supervisar la vida y estados de cada héroe en vivo, ordenar la iniciativa de combate por turnos, otorgar dados de inspiración, repartir botín o tesoros monetarios en monedas de oro, plata y cobre, e intercambiar susurros secretos individuales con los aventureros.
              </p>
            </div>

            <div className="p-5 bg-parchment rounded-xl border border-ink/15 space-y-2.5">
              <h3 className="font-bold font-cinzel text-sm sm:text-base text-magic-gold">
                ¿Es gratis usar D&D Companion en partidas presenciales o por Discord?
              </h3>
              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                Sí, D&D Companion es una plataforma 100% gratuita y de acceso libre creada para la comunidad de rol. Puedes jugar como invitado sin necesidad de registrarte, o iniciar sesión con Google para crear y guardar tus propias campañas como DM. Es el complemento ideal tanto para partidas presenciales alrededor de la mesa física como para sesiones de rol en línea a través de canales de voz en Discord.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROMO / ALLIANCE: TeamLobby Gamer Platform */}
      <div className="w-full max-w-5xl mb-12">
        <TeamLobbyPromo targetUrl="https://team-lobby.vercel.app/" />
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AccountSettingsModal open={accountSettingsOpen} onClose={() => setAccountSettingsOpen(false)} />

    </main>
  );
}
