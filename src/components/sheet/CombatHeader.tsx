"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Plus, Clock } from "lucide-react";
import { CharacterState } from "@/store/useStore";
import { ASSETS } from "@/lib/assets";

export interface CombatHeaderProps {
  character: CharacterState;
  effectiveAC: number;
  effectiveMaxHP: number;
  characterHitDice: { current: number; max: number; die: number };
  hpTerminology?: 'PG' | 'HP';
  isEditing: boolean;
  isCombatMode: boolean;
  onOpenHPModal: (type: 'current' | 'max') => void;
  onOpenStatEdit: (stat: string) => void;
  toggleInspiration: (characterId: string) => void;
  shortRest: (characterId: string) => void;
  longRest: (characterId: string) => void;
  spendHitDie: (characterId: string) => void;
  advanceTurn?: () => void;
  isMyTurn?: boolean;
  currentTurnPlayerName?: string;
}

export const CombatHeader = React.memo(function CombatHeader({
  character,
  effectiveAC,
  effectiveMaxHP,
  characterHitDice,
  hpTerminology = 'HP',
  isEditing,
  isCombatMode,
  onOpenHPModal,
  onOpenStatEdit,
  toggleInspiration,
  shortRest,
  longRest,
  spendHitDie,
  advanceTurn,
  isMyTurn = true,
  currentTurnPlayerName,
}: CombatHeaderProps) {
  const [restMenuOpen, setRestMenuOpen] = useState(false);
  const conScore = character.stats?.con ?? 10;
  const conMod = Math.floor((conScore - 10) / 2);

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 sm:border-b-4 border-ink pb-4 mb-6 sm:mb-8 gap-4">
      <div className="w-full md:w-auto">
        <div className="flex justify-between items-center md:justify-start gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-5xl font-bold text-ink drop-shadow-sm font-cinzel">
            {character.name || "Sin Nombre"}
          </h1>

          {/* Rests & Inspiration Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setRestMenuOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border-2 font-sans font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                character.inspiration
                  ? "bg-magic-gold text-black border-white shadow-[0_0_15px_rgba(245,208,97,0.8)]"
                  : "bg-parchment text-ink border-ink/20 hover:border-magic-gold"
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${
                  character.inspiration ? "fill-black text-black" : "text-magic-gold"
                }`}
              />
              <span>Descansos e Inspiración</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            <AnimatePresence>
              {restMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute left-0 mt-2 w-56 bg-parchment-dark border-2 border-magic-gold rounded-xl shadow-2xl p-2 z-40 font-sans space-y-1"
                >
                  <button
                    onClick={() => {
                      toggleInspiration(character.id);
                      setRestMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                      character.inspiration
                        ? "bg-magic-gold text-black"
                        : "hover:bg-ink/10 text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-magic-gold" /> Inspiración D&D 5e
                    </span>
                    <span className="text-[10px]">
                      {character.inspiration ? "ACTIVO" : "Inactivo"}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      shortRest(character.id);
                      setRestMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between hover:bg-ink/10 text-ink transition cursor-pointer border-t border-ink/10"
                  >
                    <span className="flex items-center gap-2">Descanso Corto (1 hora)</span>
                    <span className="text-[10px] text-ink-light font-normal">
                      Recarga Habilidades
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      spendHitDie(character.id);
                      setRestMenuOpen(false);
                    }}
                    disabled={
                      characterHitDice.current <= 0 || character.hp.current >= effectiveMaxHP
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                      characterHitDice.current <= 0 || character.hp.current >= effectiveMaxHP
                        ? "opacity-50 cursor-not-allowed text-ink-light"
                        : "hover:bg-ink/10 text-magic-gold"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <img
                        src={ASSETS.icons.d20}
                        className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                        alt="d20"
                      />{" "}
                      Gastar Dado de Golpe
                    </span>
                    <span className="text-[10px] font-mono font-bold">
                      {characterHitDice.current}/{characterHitDice.max} d{characterHitDice.die}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      longRest(character.id);
                      setRestMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between hover:bg-ink/10 text-ink transition cursor-pointer border-t border-ink/10"
                  >
                    <span className="flex items-center gap-2">Descanso Largo (8 horas)</span>
                    <span className="text-[10px] text-ink-light font-normal">
                      Restaura Todo + Dados
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {!isCombatMode && (
          <p className="text-sm sm:text-xl text-ink-light font-sans mt-1">
            Nivel {character.level} • {character.race} {character.charClass} • {character.background}
          </p>
        )}
      </div>

      <div className="flex gap-4 sm:gap-6 items-center justify-between w-full md:w-auto pt-2 md:pt-0 border-t md:border-0 border-ink/10">
        {/* Armor Class (CA) */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-parchment-dark rounded-xl border-2 border-magic-gold/60 shadow-md min-w-[85px] sm:min-w-[100px] relative">
          <div className="flex items-center gap-1 mb-0.5">
            <img
              src={ASSETS.icons.shield}
              className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block shrink-0"
              alt="CA"
            />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider font-cinzel text-ink">
              CA
            </span>
          </div>

          <span
            className={`font-bold text-2xl sm:text-3xl font-sans font-mono leading-none my-0.5 ${
              effectiveAC !== character.ac ? "text-magic-gold" : "text-ink"
            }`}
          >
            {effectiveAC}
          </span>

          <span className="text-[9px] text-ink-light font-sans font-semibold">Armadura</span>

          {isEditing && (
            <button
              onClick={() => onOpenStatEdit("ac")}
              className="absolute -top-2 -right-2 p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow"
              title="Modificar Clase de Armadura"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Puntos de Vida (HP / PG) */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-parchment-dark rounded-xl border-2 border-magic-red/60 shadow-md min-w-[130px] sm:min-w-[150px] relative">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
            <img
              src={ASSETS.icons.potion}
              className={`w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block shrink-0 ${
                character.hp.current <= 0 ? "animate-pulse" : ""
              }`}
              alt="HP"
            />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider font-cinzel text-ink">
              {hpTerminology}
            </span>
            {character.hp.temp > 0 && (
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/40 px-1.5 py-0.2 rounded">
                +{character.hp.temp} Temp
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span
              className={`font-bold text-2xl sm:text-3xl font-sans font-mono leading-none ${
                character.hp.current <= 0 ? "text-magic-red animate-pulse" : "text-ink"
              }`}
            >
              {character.hp.current}
            </span>
            <span className="text-sm sm:text-base font-bold text-ink-light">/</span>
            <span
              className={`font-bold text-lg sm:text-xl font-sans font-mono ${
                effectiveMaxHP !== character.hp.max ? "text-magic-gold" : "text-ink-light"
              }`}
            >
              {effectiveMaxHP}
            </span>
          </div>

          <div className="flex gap-1 justify-center mt-1.5 w-full">
            <button
              onClick={() => onOpenHPModal("current")}
              className="text-[10px] bg-magic-red text-white px-2 py-0.5 sm:py-1 rounded font-sans font-bold hover:bg-red-700 transition cursor-pointer shadow-sm flex-1 text-center"
              title="Ajustar HP Actual / Daño / Curación"
            >
              +/- HP
            </button>
            {isEditing && (
              <button
                onClick={() => onOpenHPModal("max")}
                className="text-[10px] bg-parchment text-ink border border-ink/30 px-2 py-0.5 sm:py-1 rounded font-sans font-bold hover:bg-ink/10 transition cursor-pointer shadow-sm flex-1 text-center"
                title="Modificar HP Máximo"
              >
                +Máx
              </button>
            )}
          </div>
        </div>

        {/* Dados de Golpe (Hit Dice - D&D 5e) */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-parchment-dark rounded-xl border-2 border-magic-gold/60 shadow-md min-w-[110px] sm:min-w-[125px] relative">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
            <img
              src={ASSETS.icons.d20}
              className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block shrink-0"
              alt="Dados"
            />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider font-cinzel text-ink">
              Dados Golpe
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span
              className={`font-bold text-2xl sm:text-3xl font-sans font-mono leading-none ${
                characterHitDice.current <= 0 ? "text-magic-red" : "text-magic-gold"
              }`}
            >
              {characterHitDice.current}
            </span>
            <span className="text-sm sm:text-base font-bold text-ink-light">/</span>
            <span className="font-bold text-lg sm:text-xl font-sans font-mono text-ink-light">
              {characterHitDice.max}
            </span>
            <span className="text-[10px] font-bold text-ink-light font-mono ml-0.5">
              (d{characterHitDice.die})
            </span>
          </div>

          <div className="flex gap-1 justify-center mt-1.5 w-full">
            <button
              onClick={() => spendHitDie(character.id)}
              disabled={characterHitDice.current <= 0 || character.hp.current >= effectiveMaxHP}
              className={`text-[10px] px-2 py-0.5 sm:py-1 rounded font-sans font-bold transition cursor-pointer shadow-sm flex-1 text-center ${
                characterHitDice.current <= 0 || character.hp.current >= effectiveMaxHP
                  ? "bg-ink/10 text-ink-light cursor-not-allowed opacity-60"
                  : "bg-magic-gold text-black hover:bg-yellow-500"
              }`}
              title={
                characterHitDice.current <= 0
                  ? "Sin dados de golpe disponibles"
                  : character.hp.current >= effectiveMaxHP
                  ? "Puntos de vida ya al máximo"
                  : `Gastar 1d${characterHitDice.die} + ${conMod} Mod CON para curarte en descanso corto`
              }
            >
              Gastar Dado
            </button>
          </div>
        </div>

        {/* Advance Turn Button (Only available in combat mode) */}
        {isCombatMode && advanceTurn && (
          <button
            onClick={() => advanceTurn()}
            disabled={character.isDead || !isMyTurn}
            className={`flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2.5 rounded shadow transition cursor-pointer font-sans min-h-[44px] ${
              character.isDead
                ? "bg-red-950 text-red-500 border border-red-800 cursor-not-allowed opacity-60"
                : isMyTurn
                ? "bg-magic-gold text-black hover:bg-yellow-500 shadow-[0_0_15px_rgba(245,208,97,0.8)]"
                : "bg-ink/20 text-ink-light border border-ink/10 cursor-not-allowed"
            }`}
            title={
              character.isDead
                ? "Tu personaje está muerto."
                : !isMyTurn
                ? `Es el turno de ${currentTurnPlayerName || "otro jugador"}.`
                : "Terminar tu turno y avanzar."
            }
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {character.isDead
                ? "Fallecido"
                : isMyTurn
                ? "¡Terminar Turno!"
                : "Esperando..."}
            </span>
          </button>
        )}
      </div>
    </header>
  );
});

export default CombatHeader;
