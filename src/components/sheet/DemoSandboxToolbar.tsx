"use client";

import React, { useState } from "react";
import { CharacterState, isDemoPlayer, Item } from "@/store/useStore";
import { triggerDiceRoll } from "@/components/DiceRoller";
import {
  Sparkles,
  RotateCcw,
  Users,
  User,
  Shield,
  Swords,
  Crosshair,
  BookOpen,
  Dice5,
  HeartPulse,
  Skull,
  Moon,
  Gift,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface DemoSandboxToolbarProps {
  character: CharacterState;
  players: CharacterState[];
  viewMode: "sheet" | "dm";
  setViewMode: (mode: "sheet" | "dm") => void;
  setActivePlayerId: (id: string) => void;
  resetDemoSandbox: () => void;
  modifyHPCurrent: (amount: number) => void;
  longRest: () => void;
  addItem: (item: Item, isTemp: boolean, duration?: number) => void;
  toggleInspiration: (characterId: string) => void;
  showAlert: (message: string, title?: string, type?: "success" | "danger" | "warning" | "info") => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

interface HeroPresetConfig {
  icon: React.ComponentType<{ className?: string }>;
  role: string;
  name: string;
}

const getHeroConfig = (player: CharacterState): HeroPresetConfig => {
  const nameLower = player.name.toLowerCase();
  const classLower = player.charClass.toLowerCase();

  if (player.id === "drizzt_dourden_demo" || nameLower.includes("drizzt") || classLower.includes("guerrero")) {
    return { icon: Swords, role: "Guerrero Drow", name: "Drizzt Do'Urden" };
  }
  if (player.id === "demo_player_lyra" || nameLower.includes("lyra") || classLower.includes("clérig")) {
    return { icon: Sparkles, role: "Clériga", name: "Lyra Brillacero" };
  }
  if (player.id === "demo_player_varis" || nameLower.includes("varis") || classLower.includes("pícaro") || classLower.includes("picaro")) {
    return { icon: Crosshair, role: "Pícaro", name: "Varis Sombraluna" };
  }
  if (player.id === "demo_player_elidoris" || nameLower.includes("elidoris") || classLower.includes("mago")) {
    return { icon: BookOpen, role: "Mago", name: "Elidoris Vane" };
  }
  return { icon: User, role: player.charClass, name: player.name };
};

const getHPStatus = (current: number, max: number) => {
  if (current <= 0) {
    return { text: "0 HP (Agonizante)", badgeClass: "text-red-400 bg-red-950/70 border-red-500/50" };
  }
  const pct = (current / max) * 100;
  if (pct <= 30) {
    return { text: `${current}/${max} HP`, badgeClass: "text-amber-400 bg-amber-950/70 border-amber-500/50" };
  }
  return { text: `${current}/${max} HP`, badgeClass: "text-emerald-400 bg-emerald-950/70 border-emerald-500/50" };
};

const simButtonClass =
  "px-2.5 py-1.5 bg-black/60 hover:bg-magic-gold hover:text-black text-zinc-200 rounded-lg border border-magic-gold/30 hover:border-magic-gold text-xs font-semibold transition-all duration-150 shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0";

export const DemoSandboxToolbar = React.memo(function DemoSandboxToolbar({
  character,
  players,
  viewMode,
  setViewMode,
  setActivePlayerId,
  resetDemoSandbox,
  modifyHPCurrent,
  longRest,
  addItem,
  toggleInspiration,
  showAlert,
  showConfirm,
}: DemoSandboxToolbarProps) {
  const [isSimOpen, setIsSimOpen] = useState(false);

  const demoPlayers = players.filter((p) => isDemoPlayer(p.id));

  return (
    <div className="bg-gradient-to-r from-[#17100b] via-[#20160f] to-[#140e09] border border-magic-gold/40 hover:border-magic-gold/60 transition-colors rounded-xl p-3 sm:p-4 shadow-xl mb-4 relative overflow-hidden font-sans">
      {/* Insignia superior derecha */}
      <div className="absolute top-0 right-0 bg-magic-gold/15 text-magic-gold border-b border-l border-magic-gold/30 text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-bl uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        100% Local • Sin Registro
      </div>

      {/* 1. Cabecera Compacta del Sandbox */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 pb-3 mb-3 border-b border-ink/15">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-cinzel text-magic-gold tracking-wide leading-tight">
              Sala de Pruebas Interactiva
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-ink-light/85 mt-0.5 max-w-2xl leading-normal">
            Experimenta en local: selecciona héroes, prueba tiradas animadas y simula eventos de combate sin alterar partidas reales.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Indicador de perspectiva sincronizada */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-ink/20 bg-black/40">
            {viewMode === "sheet" ? (
              <span className="text-magic-gold flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Viendo: </span>
                {character.name.split(" ")[0]}
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Panel DM Activo</span>
              </span>
            )}
          </div>

          {/* Botón Restaurar Fábrica */}
          <button
            type="button"
            onClick={() => {
              showConfirm(
                "¿Deseas restablecer todos los héroes, puntos de vida, ranuras de hechizo y estado a los valores originales de fábrica?",
                () => {
                  resetDemoSandbox();
                  showAlert("Se han restablecido todos los personajes a su estado de fábrica.", "Mesa Restaurada", "success");
                },
                "Restaurar Valores de Fábrica",
                "Sí, Restaurar Todo",
                "Cancelar"
              );
            }}
            className="px-2.5 py-1.5 bg-ink/10 hover:bg-ink/20 text-ink-light hover:text-magic-gold border border-ink/20 hover:border-magic-gold/40 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Restaura la party completa al estado original de demostración"
          >
            <RotateCcw className="w-3.5 h-3.5 text-magic-gold/80" />
            <span>Restaurar Fábrica</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Personajes de Prueba (Party Showcase — Tarjetas/Píldoras Visuales) */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold text-ink-light flex items-center gap-1 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-magic-gold" /> Personajes de la Party ({demoPlayers.length}):
          </span>
          <span className="text-[10px] text-ink-light/75 hidden sm:inline">
            Haz clic en un héroe para seleccionarlo e inspeccionar su hoja
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {demoPlayers.map((p) => {
            const config = getHeroConfig(p);
            const IconComp = config.icon;
            const isActive = character.id === p.id && viewMode === "sheet";
            const hpStatus = getHPStatus(p.hp.current, p.hp.max);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePlayerId(p.id);
                  if (viewMode !== "sheet") {
                    setViewMode("sheet");
                  }
                }}
                className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1.5 relative overflow-hidden group ${
                  isActive
                    ? "bg-gradient-to-r from-amber-950/70 via-stone-900 to-black border-magic-gold shadow-[0_0_15px_rgba(245,208,97,0.35)] ring-1 ring-magic-gold"
                    : "bg-black/40 hover:bg-black/65 border-ink/20 hover:border-magic-gold/50 text-zinc-300"
                }`}
                title={`Inspeccionar a ${config.name} (${config.role})`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-magic-gold rounded-bl" />
                )}

                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isActive
                        ? "bg-magic-gold text-black shadow-xs"
                        : "bg-ink/15 text-magic-gold group-hover:scale-105 transition-transform"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate leading-tight font-cinzel ${
                        isActive ? "text-magic-gold" : "text-zinc-200 group-hover:text-white"
                      }`}
                    >
                      {config.name.split(" ")[0]}
                    </p>
                    <p className="text-[10px] text-ink-light/80 truncate">
                      {config.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5 border-t border-ink/10">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hpStatus.badgeClass}`}>
                    {hpStatus.text}
                  </span>
                  <span className="text-[9px] text-ink-light/70 uppercase tracking-widest font-mono">
                    Nv.{p.level}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Laboratorio de Simulación Rápida 5e (Colapsable / Acordeón) */}
      <div className="pt-2 border-t border-ink/15">
        <button
          type="button"
          onClick={() => setIsSimOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-ink/15 hover:border-magic-gold/40 text-xs font-semibold text-ink-light hover:text-magic-gold transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-magic-gold animate-pulse" />
            <span className="font-bold font-cinzel text-magic-gold tracking-wide">
              ⚡ Simulador de Eventos 5e
            </span>
            <span className="text-[10px] text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-ink/20">
              Probar daño, muerte, descansos, botín y dados
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-magic-gold font-bold">
            <span className="text-[11px] hidden sm:inline">
              {isSimOpen ? "Ocultar Simulador" : "Expandir Simulador (6 acciones)"}
            </span>
            {isSimOpen ? (
              <ChevronUp className="w-4 h-4 text-magic-gold" />
            ) : (
              <ChevronDown className="w-4 h-4 text-magic-gold" />
            )}
          </div>
        </button>

        {isSimOpen && (
          <div className="mt-2.5 p-3 rounded-xl bg-black/50 border border-magic-gold/25 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Grupo 1: Dados & Pruebas */}
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-ink/20 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-magic-gold/90 flex items-center gap-1">
                <Dice5 className="w-3.5 h-3.5 text-magic-gold" /> Dados & Tiradas:
              </span>
              <button
                type="button"
                onClick={() => triggerDiceRoll("d20", 3, `Prueba de Demostración (${character.name})`)}
                className={simButtonClass}
                title="Lanza un d20 animado con modificadores automáticos 5e"
              >
                <Dice5 className="w-3.5 h-3.5 text-magic-gold" />
                <span>Tirar d20 Animado (+3 Mod)</span>
              </button>
            </div>

            {/* Grupo 2: Salud y Descanso */}
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-ink/20 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-magic-gold/90 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-magic-gold" /> Salud & Descansos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    modifyHPCurrent(-15);
                    showAlert(`${character.name} recibió 15 de daño para comprobar la barra interactiva de vida.`, "Daño Simulado", "warning");
                  }}
                  className={simButtonClass}
                  title="Aplica 15 de daño al personaje activo"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-amber-400" />
                  <span>Daño (-15 HP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    modifyHPCurrent(-character.hp.current);
                    showAlert(`${character.name} ha caído a 0 HP. Ahora puedes probar el sistema de Salvaciones contra la Muerte 5e (éxitos y fallos).`, "Estado Agonizante", "danger");
                  }}
                  className={simButtonClass}
                  title="Pone los HP a 0 para probar la pantalla y salvaciones de muerte"
                >
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span>Caer a 0 HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    longRest();
                    showAlert(`${character.name} ha completado un Descanso Largo: vida máxima restaurada y ranuras de conjuro recuperadas.`, "Descanso Largo", "success");
                  }}
                  className={simButtonClass}
                  title="Restaura toda la vida y ranuras mágicas"
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Descanso Largo</span>
                </button>
              </div>
            </div>

            {/* Grupo 3: Recompensas & Buffs */}
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-ink/20 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-magic-gold/90 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-magic-gold" /> Recompensas & Buffs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    addItem(
                      {
                        id: "legendary_ring_" + Date.now(),
                        name: "Anillo de Resistencia Ígnea",
                        type: "general",
                        description: "Anillo forjado en las fraguas enanas. Otorga resistencia al daño de fuego.",
                        quantity: 1,
                        equipped: false,
                      },
                      false
                    );
                    showAlert(`¡Has recibido el "Anillo de Resistencia Ígnea"! Revisa tu pestaña de Equipamiento.`, "Botín del DM", "success");
                  }}
                  className={simButtonClass}
                  title="Simula recibir un objeto legendario otorgado por el DM"
                >
                  <Gift className="w-3.5 h-3.5 text-magic-gold" />
                  <span>Botín del DM</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleInspiration(character.id)}
                  className={simButtonClass}
                  title="Concede o gasta Inspiración 5e"
                >
                  <Award className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{character.inspiration ? "Gastar Inspiración" : "Inspiración 5e"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
