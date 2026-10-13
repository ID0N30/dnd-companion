"use client";

import React from "react";
import { CharacterState, CombatMonster } from "@/store/useStore";
import { ASSETS } from "@/lib/assets";
import { Shield } from "lucide-react";

export interface CombatStatusBannersProps {
  character: CharacterState;
  hpTerminology?: string;
  isCombatMode: boolean;
  isMyTurn: boolean;
  currentTurnPlayer?: CharacterState;
  currentTurnMonster?: CombatMonster;
  rollDeathSave: (
    characterId?: string,
    callback?: (modalData: {
      type: "salvation" | "death" | "moribundo";
      title: string;
      desc: string;
    }) => void
  ) => void;
  stabilizePlayer: (characterId: string, amount: number) => void;
  setSalvationModal: React.Dispatch<React.SetStateAction<{
    open: boolean;
    title: string;
    desc: string;
    type: "salvation" | "death" | "moribundo";
    onConfirm?: () => void;
  }>>;
}

export const CombatStatusBanners = React.memo(function CombatStatusBanners({
  character,
  hpTerminology,
  isCombatMode,
  isMyTurn,
  currentTurnPlayer,
  currentTurnMonster,
  rollDeathSave,
  stabilizePlayer,
  setSalvationModal,
}: CombatStatusBannersProps) {
  const currentInitiative = currentTurnMonster?.initiative?.total ?? currentTurnPlayer?.initiative?.total ?? 0;

  return (
    <>
      {/* CHARACTER DEATH BANNER */}
      {character.isDead && (
        <div className="relative overflow-hidden mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-red bg-black/90 text-white shadow-[0_0_30px_rgba(217,56,41,0.8)] font-sans flex items-center justify-between flex-wrap gap-3">
          <img
            src={ASSETS.banners.death}
            alt="Banner de Muerte"
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none rounded-sm"
          />
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={ASSETS.icons.shield}
              alt="Fallecido"
              className="w-8 h-8 object-contain shrink-0 filter invert contrast-200"
            />
            <div>
              <h3 className="font-bold text-lg text-magic-red font-cinzel tracking-wider">
                ¡HÉROE FALLECIDO!
              </h3>
              <p className="text-xs text-ink-light">
                {character.name} ha caído en combate y se encuentra sin vida. Solo el DM puede revivirlo desmarcando su muerte.
              </p>
            </div>
          </div>
          <span className="relative z-10 text-xs bg-magic-red text-white font-bold px-3 py-1 rounded uppercase tracking-wider">
            Incapaz de Actuar
          </span>
        </div>
      )}

      {/* CHARACTER MORIBUNDO BANNER */}
      {character.isDying && !character.isDead && (
        <div className="mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-red bg-red-950/90 text-white shadow-[0_0_30px_rgba(217,56,41,0.8)] font-sans flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-magic-red animate-ping shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-magic-gold font-cinzel tracking-wider flex items-center gap-2 flex-wrap">
                ¡ESTADO MORIBUNDO (0 {hpTerminology || "HP"})!{" "}
                <span className="text-xs bg-magic-red text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Inconsciente
                </span>
              </h3>
              <p className="text-xs text-red-200">
                Has caído a 0 puntos de golpe. Al inicio de cada turno debes lanzar una Salvación contra la Muerte (d20). Acumula 3 éxitos para estabilizarte o 3 fallos para morir.
              </p>

              {/* Counter tracker */}
              <div className="flex gap-4 sm:gap-6 mt-3 font-sans text-xs flex-wrap">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded border border-emerald-500/40">
                  <span className="font-bold text-emerald-400">Éxitos (3):</span>
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: 3 }).map((_, i) =>
                      i < (character.deathSaves?.successes || 0) ? (
                        <span key={i} className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                      ) : (
                        <span key={i} className="w-3.5 h-3.5 rounded-full bg-zinc-700/80 border border-white/20 inline-block" />
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded border border-magic-red/40">
                  <span className="font-bold text-magic-red">Fallos (3):</span>
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: 3 }).map((_, i) =>
                      i < (character.deathSaves?.failures || 0) ? (
                        <span key={i} className="w-3.5 h-3.5 rounded-full bg-magic-red inline-block shadow-sm" />
                      ) : (
                        <span key={i} className="w-3.5 h-3.5 rounded-full bg-zinc-700/80 border border-white/20 inline-block" />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() =>
                rollDeathSave(character.id, (modalData) => {
                  setSalvationModal({
                    open: true,
                    type: modalData.type,
                    title: modalData.title,
                    desc: modalData.desc,
                  });
                })
              }
              disabled={isCombatMode && !isMyTurn}
              className={`px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow-[0_0_15px_rgba(245,208,97,0.8)] hover:bg-yellow-500 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isCombatMode && !isMyTurn ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={isCombatMode && !isMyTurn ? "Debes esperar a tu turno de combate" : "Lanzar d20 sin modificadores contra la muerte"}
            >
              <img src={ASSETS.icons.d20} className="w-4 h-4 object-contain inline-block mr-1.5 shrink-0" alt="d20" /> Lanzar Salvación (d20)
            </button>
            <button
              onClick={() => stabilizePlayer(character.id, 1)}
              className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title={`Si un compañero te ayuda o cura, recuperas 1 ${hpTerminology || "HP"} y la consciencia`}
            >
              <img src={ASSETS.icons.potion} className="w-4 h-4 object-contain inline-block mr-1.5 shrink-0" alt="Auxilio" /> Auxilio de Compañero (+1 {hpTerminology || "HP"})
            </button>
          </div>
        </div>
      )}

      {/* CHARACTER ESTABILIZADO BANNER */}
      {character.isStable && !character.isDead && character.hp.current === 0 && (
        <div className="mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-gold bg-black/90 text-white shadow-[0_0_20px_rgba(245,208,97,0.6)] font-sans flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={ASSETS.icons.shield} className="w-8 h-8 object-contain shrink-0" alt="Estabilizado" />
            <div>
              <h3 className="font-bold text-lg text-magic-gold font-cinzel tracking-wider">
                ¡HÉROE ESTABILIZADO (0 {hpTerminology || "HP"})!
              </h3>
              <p className="text-xs text-ink-light">
                Alcanzaste 3 Éxitos o fuiste auxiliado. Estás inconsciente pero fuera de peligro mortal.
              </p>
            </div>
          </div>
          <button
            onClick={() => stabilizePlayer(character.id, 1)}
            className="px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <img src={ASSETS.icons.potion} className="w-4 h-4 object-contain inline-block mr-1.5 shrink-0" alt="Curación" /> Recibir Curación (+1 {hpTerminology || "HP"})
          </button>
        </div>
      )}

      {/* COMBAT TURN STATUS BANNER */}
      {isCombatMode && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-2 shadow-lg flex justify-between items-center flex-wrap gap-3 font-sans animate-fade-in transition-all bg-parchment border-magic-gold">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-magic-gold shrink-0" />
            <div>
              {isMyTurn ? (
                <h3 className="font-bold text-sm sm:text-lg text-magic-gold flex items-center gap-2 flex-wrap">
                  ¡ES TU TURNO DE COMBATE! <span className="text-[10px] sm:text-xs bg-magic-gold text-black px-2 py-0.5 rounded font-bold uppercase animate-pulse">Acción Requerida</span>
                </h3>
              ) : (
                <h3 className="font-bold text-sm sm:text-base text-ink flex items-center gap-2 flex-wrap">
                  Turno de:{" "}
                  {currentTurnMonster ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-magic-gold font-bold">{currentTurnMonster.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        currentTurnMonster.type === "enemy" ? "bg-magic-red text-white" : "bg-emerald-600 text-white"
                      }`}>
                        {currentTurnMonster.type === "enemy" ? "Enemigo" : "Aliado PNJ"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-magic-gold">{currentTurnPlayer?.name || "Otro Jugador"}</span>
                  )}
                </h3>
              )}
              <p className="text-xs text-ink-light">
                {isMyTurn 
                  ? 'Realiza tu acción o ataque y presiona "¡Terminar mi Turno!"' 
                  : `Iniciativa actual: ${currentInitiative}. Por favor espera tu turno.`}
              </p>
            </div>
          </div>

          {character.initiative && (
            <div className="text-xs bg-ink/10 p-2 rounded border border-ink/20 font-sans w-full sm:w-auto text-center sm:text-left">
              <span className="text-ink-light block text-[10px] sm:text-xs">Tu Iniciativa:</span>
              <span className="font-bold text-magic-gold text-sm sm:text-base">
                {character.initiative.total}{" "}
                <span className="text-[10px] text-ink-light font-normal">
                  (Dado {character.initiative.die} + Mod DEX {character.initiative.dexMod >= 0 ? "+" + character.initiative.dexMod : character.initiative.dexMod})
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
});
