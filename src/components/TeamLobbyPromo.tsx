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
      className={`relative group cursor-pointer overflow-hidden transition-all duration-500 active:scale-[0.99] ${className}`}
    >
      {/* Glow ambiental exterior místico estilo D&D Companion con tinte dorado/ámbar */}
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 via-yellow-600/15 to-amber-700/20 rounded-[2.2rem] blur-xl opacity-50 group-hover:opacity-90 transition duration-500 pointer-events-none" />

      {/* CONTENEDOR EXTERIOR: Guía de Estilo Grimorio & Fantasía D&D Companion */}
      <div className="relative bg-[#17100b] border border-amber-500/30 group-hover:border-amber-400/60 rounded-[2rem] p-6 sm:p-7 shadow-2xl transition-all duration-300">
        
        {/* Cabecera D&D: Sello de Alianza de Reinos / Ecosistema */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f5d061]" />
            <span className="text-[10px] font-serif font-bold uppercase tracking-[0.25em] text-[#f5d061]">
              Gremio Recomendado • Idoneus Software
            </span>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-amber-200/50 group-hover:text-amber-300 transition-colors">
            team-lobby.app <ExternalLink size={11} />
          </span>
        </div>

        {/* NÚCLEO INTERIOR: Estilo Cyber / Gamer TeamLobby */}
        <div className="relative rounded-2xl bg-[#0d0d11] border border-violet-500/30 group-hover:border-violet-500/50 p-5 sm:p-6 overflow-hidden shadow-inner transition-colors">
          
          {/* Marca de agua / Icono Gamer de fondo */}
          <div className="absolute -right-6 -bottom-6 text-violet-500/5 group-hover:text-violet-500/10 transition-colors pointer-events-none -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <Gamepad2 size={140} strokeWidth={1} />
          </div>

          <div className="relative z-10 space-y-4">
            {/* Título e Icono Gamer Neón */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/40 rounded-xl text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.25)] shrink-0">
                <Gamepad2 size={24} className="group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase text-white leading-tight flex items-center gap-2">
                  <span>TEAM<span className="text-[#8b5cf6]">LOBBY</span></span>
                  <Sparkles size={16} className="text-violet-400 animate-pulse shrink-0" />
                </h3>
                <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-violet-300/70 mt-0.5">
                  Centro de Mando Gamer • Lobbies & Ruleta de Escuadra
                </p>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-xs text-gray-300/90 leading-relaxed font-sans">
              ¿Descanso entre campañas de rol? Coordina las noches de juego con tu escuadra: <strong className="text-violet-300">votación democrática</strong> con autocompletado de Steam, ruleta del destino para desempates, soundboard interactivo y galería para registrar tus trofeos platinados.
            </p>

            {/* Badges de Características TeamLobby */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-violet-500/30 text-[10px] font-bold text-violet-300">
                <Users size={11} className="text-violet-400" /> Salas Públicas & Privadas
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-violet-500/30 text-[10px] font-bold text-violet-300">
                <Dices size={11} className="text-emerald-400" /> Ruleta del Destino Steam
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-violet-500/30 text-[10px] font-bold text-violet-300">
                <Trophy size={11} className="text-yellow-400" /> Galería Gamer & Retos
              </span>
            </div>

            {/* Botón Call to Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:brightness-110 active:scale-95 transition-all"
              >
                <span>Entrar a TeamLobby</span>
                <ExternalLink size={13} strokeWidth={2.5} />
              </button>

              <span className="text-[10px] text-gray-400 font-mono text-center sm:text-right">
                ¡100% Gratuito en la web!
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default TeamLobbyPromo;
