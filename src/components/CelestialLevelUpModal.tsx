"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { getClassFeaturesForLevel, calculateMaxHP } from "@/lib/dndClassFeatures";
import { Sparkles, Sun, Shield, Award, Zap, BookOpen, Star, CheckCircle } from "lucide-react";

export default function CelestialLevelUpModal({ isDM }: { isDM?: boolean }) {
  const { players, activePlayerId, lastLevelUpEvent, hpTerminology } = useStore();
  const [open, setOpen] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  const character = players.find(p => p.id === activePlayerId) || players[0];

  useEffect(() => {
    if (isDM || !lastLevelUpEvent || !character) return;

    // 1. Check if character was created AFTER the level up event occurred
    if (character.createdAt && lastLevelUpEvent.timestamp && character.createdAt > lastLevelUpEvent.timestamp) {
      return;
    }

    // 2. Check if level up event explicitly targeted specific player IDs
    if (lastLevelUpEvent.targetPlayerIds && Array.isArray(lastLevelUpEvent.targetPlayerIds)) {
      if (!lastLevelUpEvent.targetPlayerIds.includes(character.id)) {
        return;
      }
    } else if (lastLevelUpEvent.playerId && lastLevelUpEvent.playerId !== character.id) {
      return;
    }

    // 3. Check level consistency: if character level is 1 and event newLevel > 1 without individual target, character wasn't leveled up
    if (lastLevelUpEvent.newLevel && character.level < lastLevelUpEvent.newLevel && !lastLevelUpEvent.playerId) {
      return;
    }

    // 4. Check if user already dismissed this level-up event
    const seenKey = `seen_levelup_${lastLevelUpEvent.id}_${character.id}`;
    if (typeof window !== 'undefined' && localStorage.getItem(seenKey) === 'true') {
      return;
    }

    setEventData(lastLevelUpEvent);
    setOpen(true);
  }, [isDM, lastLevelUpEvent, character?.id, character?.createdAt, character?.level]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [open]);

  if (isDM || !open || !character || !eventData) return null;

  const handleAccept = () => {
    if (lastLevelUpEvent && character && typeof window !== 'undefined') {
      const seenKey = `seen_levelup_${lastLevelUpEvent.id}_${character.id}`;
      localStorage.setItem(seenKey, 'true');
    }
    setOpen(false);
  };

  const newLevel = eventData.newLevel || character.level;
  const oldLevel = Math.max(1, newLevel - 1);
  const officialHP = calculateMaxHP(character.charClass, newLevel, character.stats.con);
  const oldHP = calculateMaxHP(character.charClass, oldLevel, character.stats.con);
  const hpGain = Math.max(1, officialHP - oldHP);
  const profBonus = Math.floor((newLevel - 1) / 4) + 2;
  const newFeatures = getClassFeaturesForLevel(character.charClass, newLevel).filter(f => f.unlockedAtLevel === newLevel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-black/90 z-[100] grid place-items-center p-4 sm:p-6 backdrop-blur-md font-sans overflow-y-auto"
        >
          {/* CELESTIAL BACKGROUND & GOLDEN FLOATING PARTICLES */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
            {Array.from({ length: 24 }).map((_, i) => {
              const left = `${(i * 4.2 + (i % 5) * 3) % 96 + 2}%`;
              const size = (i % 3 === 0 ? 5 : 3);
              const duration = 2.5 + (i % 6) * 0.5;
              const delay = (i % 8) * 0.3;
              return (
                <div
                  key={i}
                  className="ember-particle"
                  style={{
                    left,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    background: i % 2 === 0 ? '#f5d061' : '#38bdf8',
                    boxShadow: i % 2 === 0 
                      ? '0 0 12px #f5d061, 0 0 25px rgba(245,208,97,0.9)' 
                      : '0 0 12px #38bdf8, 0 0 25px rgba(56,189,248,0.9)'
                  }}
                />
              );
            })}
          </div>

          {/* CELESTIAL VICTORIOUS CONTAINER */}
          <motion.div 
            initial={{ scale: 0.85, y: 30 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.85, y: 30 }} 
            className="bg-gradient-to-b from-sky-950 via-slate-900 to-amber-950 border-4 border-amber-400 shadow-[0_0_80px_rgba(250,204,21,0.95)] text-white rounded-3xl p-6 sm:p-10 max-w-xl w-full text-center relative overflow-hidden my-auto"
          >
            {/* GLOW RAYS */}
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-amber-400/25 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-sky-400/30 blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none"></div>

            {/* VICTORIOUS HEADER */}
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-amber-500 to-sky-400 rounded-full shadow-[0_0_30px_rgba(250,204,21,0.8)] border-2 border-white mb-2">
                <Award className="w-12 h-12 text-slate-950" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-bold font-cinzel text-amber-300 tracking-wider drop-shadow-[0_0_15px_rgba(245,208,97,0.8)]">
                ASCENSO CELESTIAL
              </h2>
              <p className="text-xs sm:text-sm text-sky-200 uppercase tracking-widest font-semibold border-b border-amber-400/30 pb-3">
                PODER DIVINO Y VICTORIA EN LA CAMPAÑA
              </p>

              <div className="py-3 bg-slate-950/70 rounded-xl border border-amber-400/40 shadow-inner">
                <span className="text-xs text-amber-200 uppercase tracking-wider block font-bold">Héroe Ascendido</span>
                <h3 className="text-2xl sm:text-3xl font-bold font-cinzel text-white drop-shadow">
                  {character.name}
                </h3>
                <span className="text-sm font-bold text-sky-300">
                  {character.race} {character.charClass} • Nivel {newLevel}
                </span>
              </div>

              {/* AUTOMATED STATS UPGRADE GRID */}
              <div className="grid grid-cols-2 gap-3 text-left pt-2">
                
                <div className="p-3 bg-amber-950/40 border border-amber-400/40 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                    <Zap className="w-4 h-4 text-amber-400" /> Puntos de Vida
                  </div>
                  <span className="text-lg font-bold text-white block">+ {hpGain} {hpTerminology} Máximos</span>
                  <span className="text-[10px] text-amber-200/80">Nuevo Máximo: {character.hp.max} {hpTerminology}</span>
                </div>

                <div className="p-3 bg-sky-950/40 border border-sky-400/40 rounded-xl">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase mb-1">
                    <Award className="w-4 h-4 text-sky-400" /> Competencia
                  </div>
                  <span className="text-lg font-bold text-white block">+ {profBonus} Bonificador</span>
                  <span className="text-[10px] text-sky-200/80">Aplicado a salvaciones y habilidades</span>
                </div>

              </div>

              {/* NEW CLASS FEATURES UNLOCKED */}
              {newFeatures.length > 0 && (
                <div className="p-4 bg-slate-950/80 border border-amber-400/40 rounded-xl text-left space-y-2">
                  <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5 border-b border-amber-400/20 pb-1">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Nuevos Rasgos de Clase Desbloqueados (Nivel {newLevel})
                  </span>
                  <div className="space-y-1.5">
                    {newFeatures.map((feat, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-sky-300">{feat.name}</span>
                        <p className="text-[11px] text-slate-300 leading-tight">{feat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DM INSTRUCTIONS REMINDER */}
              <div className="p-3 bg-sky-950/60 border border-sky-400/30 rounded-xl text-xs text-sky-200 leading-relaxed text-left">
                <span className="font-bold text-amber-300 block mb-0.5">Indicación del Maestro de la Mazmorra (DM):</span>
                El DM indicará los incrementos permanentes de características (Fuerza, Destreza, etc.), dotes o selección de nuevos conjuros para actualizar en la pestaña de edición.
              </div>

              {/* ACCEPT BUTTON */}
              <div className="pt-2">
                <button
                  onClick={handleAccept}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-sky-400 text-slate-950 font-bold text-base rounded-xl shadow-[0_0_25px_rgba(250,204,21,0.9)] hover:scale-[1.02] transition cursor-pointer font-cinzel tracking-wider uppercase"
                >
                  Aceptar y Celebrar Ascenso
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
