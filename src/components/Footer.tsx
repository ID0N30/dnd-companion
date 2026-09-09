"use client";

import Link from "next/link";
import { Shield, Sparkles, Mail, Github, HelpCircle, FileText, Lock, Cookie, ArrowUpRight, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-parchment-dark/90 border-t-2 border-magic-gold/30 text-ink font-sans pt-10 pb-6 px-4 sm:px-8 md:px-12 backdrop-blur-md relative z-20 mt-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* GRID LAYOUT (4 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* COLUMN 1: MARCA E IDENTIDAD */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-magic-gold/20 border border-magic-gold flex items-center justify-center text-magic-gold">
                <Sparkles className="w-5 h-5 text-magic-gold" />
              </div>
              <span className="font-cinzel font-bold text-xl tracking-wide text-ink">
                Idoneus Software
              </span>
            </div>
            <p className="text-xs text-ink-light leading-relaxed">
              Soluciones digitales para la gestión de equipos y sistemas de juego. Potenciando tus aventuras y campañas en tiempo real.
            </p>
            <div className="pt-1 text-[11px] text-ink/70 font-semibold flex items-center gap-1.5">
              <span>Desarrollado con</span>
              <Heart className="w-3.5 h-3.5 text-magic-red fill-magic-red" />
              <span>para la comunidad D&D.</span>
            </div>
          </div>

          {/* COLUMN 2: RECURSOS DEL PRODUCTO */}
          <div className="space-y-3">
            <h4 className="font-cinzel font-bold text-sm text-magic-gold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Producto & Recursos
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-ink-light">
              <li>
                <Link href="/" className="hover:text-magic-gold transition flex items-center gap-1">
                  Campañas Disponibles
                </Link>
              </li>
              <li>
                <Link href="/sheet?demo=true" className="hover:text-magic-gold transition flex items-center gap-1">
                  Mesa de Prueba (Demo)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-magic-gold transition flex items-center gap-1">
                  Notas de Actualizaciones (v1.2)
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: ASISTENCIA Y SOPORTE */}
          <div className="space-y-3">
            <h4 className="font-cinzel font-bold text-sm text-magic-gold uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Asistencia & Soporte
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-ink-light">
              <li>
                <a 
                  href="mailto:soporte@idoneus-software.dev?subject=Soporte%20DnD%20Companion" 
                  className="hover:text-magic-gold transition flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-magic-gold" /> soporte@idoneus-software.dev
                </a>
              </li>
              <li>
                <a 
                  href="mailto:soporte@idoneus-software.dev?subject=Reporte%20de%20Problema%20DnD%20Companion" 
                  className="hover:text-magic-gold transition"
                >
                  Reportar un problema
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/ID0N30/dnd-companion" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-magic-gold transition flex items-center gap-1"
                >
                  Centro de Ayuda / Docs <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: LEGAL Y NORMATIVAS */}
          <div className="space-y-3">
            <h4 className="font-cinzel font-bold text-sm text-magic-gold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Legal & Normativas
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-ink-light">
              <li>
                <Link href="/terms" className="hover:text-magic-gold transition flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-magic-gold/80" /> Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-magic-gold transition flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-magic-gold/80" /> Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-magic-gold transition flex items-center gap-1">
                  <Cookie className="w-3.5 h-3.5 text-magic-gold/80" /> Política de Cookies
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* BOTTOM BAR / FILA INFERIOR */}
        <div className="border-t border-ink/20 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans">
          
          <div className="text-ink-light text-center sm:text-left">
            <p className="font-bold font-cinzel text-ink">
              © 2026 Idoneus Software. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-ink/60 mt-0.5">
              Responsable Legal: Julian Andrés Osorio Marín • Colombia
            </p>
          </div>

          <div className="flex items-center gap-4 text-ink-light">
            <a 
              href="https://github.com/ID0N30/dnd-companion" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-magic-gold transition p-1.5 bg-ink/5 rounded-lg border border-ink/10"
              title="Repositorio GitHub de DnD Companion"
            >
              <Github className="w-4 h-4" />
            </a>
            <a 
              href="mailto:soporte@idoneus-software.dev" 
              className="hover:text-magic-gold transition p-1.5 bg-ink/5 rounded-lg border border-ink/10"
              title="Contacto Directo por Correo"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>

        </div>

      </div>
    </footer>
  );
}
