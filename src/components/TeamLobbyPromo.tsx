"use client";

import React from 'react';
import { Gamepad2, ExternalLink, Sparkles, Trophy, Users, Dices } from 'lucide-react';

interface TeamLobbyPromoProps {
  className?: string;
  targetUrl?: string;
}

export const TeamLobbyPromo: React.FC<TeamLobbyPromoProps> = ({
  className = '',
  targetUrl = 'https://team-lobby.vercel.app/'
}) => {
  return (
    <div
      onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
      className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-magic-gold/40 hover:border-magic-gold bg-parchment-dark shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-[0.995] ${className}`}
    >
      {/* Sello de Alianza en la esquina superior derecha al estilo de las tarjetas de D&D */}
      <div className="absolute top-0 right-0 bg-magic-gold/20 text-magic-gold border-b border-l border-magic-gold/40 text-[9px] font-bold px-3 py-1 rounded-bl uppercase font-cinzel flex items-center gap-1.5 z-20">
        <Sparkles className="w-3 h-3 text-magic-gold" />
        <span>Gremio Aliado • Ecosistema Gamer</span>
      </div>

      {/* Marca de agua sutil en el fondo: Gamepad arcano */}
      <div className="absolute -right-6 -bottom-8 text-ink/[0.04] group-hover:text-magic-gold/[0.08] transition-all duration-700 pointer-events-none -rotate-12 group-hover:rotate-0">
        <Gamepad2 size={160} strokeWidth={1} />
      </div>

      {/* Degradado sutil cálido/arcano que armoniza el cuero oscuro con tintes místicos amatista */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-950/10 to-amber-950/20 pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Contenido Principal */}
        <div className="space-y-3 max-w-2xl">
          
          {/* Encabezado con Icono y Título */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-ink/10 border border-ink/20 rounded-lg text-magic-gold group-hover:text-yellow-400 shadow-inner shrink-0 transition-colors">
              <Gamepad2 className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-cinzel text-ink tracking-wide flex items-center gap-2">
                <span>TEAM</span>
                <span className="text-magic-gold">LOBBY</span>
                <span className="text-xs px-2 py-0.5 rounded border border-purple-400/40 bg-purple-900/30 text-purple-300 font-sans font-bold tracking-normal uppercase">
                  Squad Hub
                </span>
              </h3>
              <p className="text-xs text-ink-light font-serif italic">
                Centro de Mando Gamer • Lobbies de Escuadra, Votación Steam & Trofeos
              </p>
            </div>
          </div>

          {/* Descripción en tono de gremio/taberna */}
          <p className="text-xs sm:text-sm text-ink/85 leading-relaxed font-sans">
            ¿Una pausa entre mazmorras y dragones? Reúne a tu grupo para la noche de videojuegos: <strong className="text-magic-gold">votación democrática</strong> con catálogo de Steam, ruleta del destino para desempates épicos, soundboard interactivo y vitrina para registrar tus trofeos platinados.
          </p>

          {/* Chips temáticos armonizados con la paleta de D&D Companion */}
          <div className="flex flex-wrap gap-2 pt-1 text-[10px] sm:text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ink/10 border border-ink/20 text-ink font-bold">
              <Users className="w-3.5 h-3.5 text-magic-gold" /> Salas Públicas & Privadas
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ink/10 border border-ink/20 text-ink font-bold">
              <Dices className="w-3.5 h-3.5 text-magic-gold" /> Ruleta del Destino Steam
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-ink/10 border border-ink/20 text-ink font-bold">
              <Trophy className="w-3.5 h-3.5 text-magic-gold" /> Vitrina de Trofeos Gamer
            </span>
          </div>

        </div>

        {/* Sección de Acción / CTA armonizada */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 lg:border-l border-ink/15 pt-4 lg:pt-0 lg:pl-6">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2.5 bg-magic-gold text-black font-cinzel font-bold rounded hover:bg-yellow-500 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
          >
            <span>Explorar TeamLobby</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[11px] text-ink-light font-mono">
            <span>team-lobby.vercel.app</span>
            <span className="text-magic-gold">•</span>
            <span className="text-emerald-400 font-bold">100% Web</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeamLobbyPromo;
