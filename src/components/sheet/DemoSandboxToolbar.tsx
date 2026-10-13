"use client";

import React from "react";
import Link from "next/link";
import { CharacterState, isDemoPlayer, Item } from "@/store/useStore";
import { triggerDiceRoll } from "@/components/DiceRoller";
import {
  Sparkles,
  RotateCcw,
  Compass,
  Home,
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

const simButtonClass =
  "px-2.5 py-1 bg-parchment-dark/70 hover:bg-parchment-dark text-ink hover:text-magic-gold rounded-lg border border-ink/20 hover:border-magic-gold/40 text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0";

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
  return (
    <div className="bg-gradient-to-r from-[#17100b] via-[#20160f] to-[#140e09] border border-magic-gold/40 hover:border-magic-gold/60 transition-colors rounded-xl p-3 sm:p-4 shadow-xl mb-4 relative overflow-hidden font-sans">
      {/* Insignia superior derecha */}
      <div className="absolute top-0 right-0 bg-magic-gold/15 text-magic-gold border-b border-l border-magic-gold/30 text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-bl uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Modo Local • 100% Desconectado
      </div>

      {/* Cabecera Unificada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pt-2 sm:pt-0.5 pb-2.5 mb-2.5 border-b border-ink/15">
        <div className="pr-2 sm:pr-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-cinzel text-magic-gold tracking-wide leading-tight">
              Mesa de Pruebas Interactiva
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-ink-light/85 mt-0.5 max-w-2xl leading-normal">
            Experimenta libremente en local: prueba hojas 5e, tiradas y el panel del DM sin registro ni base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
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
            className="px-2.5 py-1.5 bg-ink/10 hover:bg-ink/20 text-ink-light hover:text-magic-gold border border-ink/20 hover:border-ink/40 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Restaura la party completa al estado original de demostración"
          >
            <RotateCcw className="w-3.5 h-3.5 text-magic-gold/80" />
            <span>Restaurar Fábrica</span>
          </button>

          <Link
            href="/"
            className="px-2.5 py-1.5 bg-ink/10 hover:bg-ink/20 text-ink-light hover:text-magic-gold border border-ink/20 hover:border-ink/40 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Volver al Menú Principal / Inicio"
          >
            <Home className="w-3.5 h-3.5 text-magic-gold/80" />
            <span>Inicio</span>
          </Link>

          <Link
            href="/campaigns"
            className="px-3 py-1.5 bg-gradient-to-r from-magic-gold to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-magic-gold/15 hover:shadow-magic-gold/30 cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Salón de Campañas →</span>
          </Link>
        </div>
      </div>

      {/* Sub-bar: Selector de Party Aventurera & Conmutador de Perspectiva */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2.5">
        {/* Selector de Party Aventurera */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-ink-light flex items-center gap-1 mr-1 uppercase tracking-wider shrink-0">
            <Users className="w-3.5 h-3.5 text-magic-gold" /> Aventurero:
          </span>
          {players.filter(p => isDemoPlayer(p.id)).map(p => {
            const config = getHeroConfig(p);
            const IconComp = config.icon;
            const isActive = character.id === p.id && viewMode === "sheet";

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePlayerId(p.id);
                  if (viewMode !== "sheet") setViewMode("sheet");
                }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-magic-gold text-black border border-magic-gold shadow-[0_0_12px_rgba(245,208,97,0.3)] font-bold"
                    : "bg-parchment-dark/80 hover:bg-parchment-dark text-ink hover:text-magic-gold border border-ink/20 hover:border-magic-gold/40"
                }`}
                title={`Seleccionar a ${config.name} (${config.role})`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-magic-gold"}`} />
                <span>{config.name.split(" ")[0]}</span>
                <span className={`text-[10px] hidden sm:inline ${isActive ? "text-black/85 font-medium" : "text-ink-light/75"}`}>
                  ({config.role})
                </span>
              </button>
            );
          })}
        </div>

        {/* Conmutador de Perspectiva Premium (Segmented Control) */}
        <div
          className="flex items-center bg-black/40 p-0.5 rounded-lg border border-ink/20 text-xs shrink-0"
          title="Alterna entre la visión del jugador y el panel maestro del DM"
        >
          <button
            type="button"
            onClick={() => setViewMode("sheet")}
            className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
              viewMode === "sheet"
                ? "bg-magic-gold text-black shadow-xs font-bold"
                : "text-ink-light hover:text-ink hover:bg-white/5"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perspectiva Jugador</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("dm")}
            className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
              viewMode === "dm"
                ? "bg-magic-gold text-black shadow-xs font-bold"
                : "text-ink-light hover:text-ink hover:bg-white/5"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Panel del DM</span>
          </button>
        </div>
      </div>

      {/* Simulador Interactivo 5e */}
      <div className="mt-2.5 pt-2.5 border-t border-ink/15 flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
        <span className="text-magic-gold/90 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider shrink-0 mr-0.5">
          <Sparkles className="w-3 h-3 text-magic-gold" /> Simulación 5e:
        </span>

        <button
          type="button"
          onClick={() => triggerDiceRoll("d20", 3, `Prueba de Demostración (${character.name})`)}
          className={simButtonClass}
          title="Lanza un d20 animado con modificadores automáticos 5e"
        >
          <Dice5 className="w-3.5 h-3.5 text-magic-gold" />
          <span>Tirar d20 Animado</span>
        </button>

        <button
          type="button"
          onClick={() => {
            modifyHPCurrent(-15);
            showAlert(`${character.name} recibió 15 de daño para comprobar la barra interactiva de vida.`, "Daño Simulado", "warning");
          }}
          className={simButtonClass}
          title="Aplica 15 de daño al personaje activo"
        >
          <HeartPulse className="w-3.5 h-3.5 text-magic-gold" />
          <span>Simular Daño (-15 HP)</span>
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
          <Skull className="w-3.5 h-3.5 text-magic-gold" />
          <span>Caer a 0 HP (Death Saves)</span>
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
          <Moon className="w-3.5 h-3.5 text-magic-gold" />
          <span>Descanso Largo</span>
        </button>

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
          <Award className="w-3.5 h-3.5 text-magic-gold" />
          <span>{character.inspiration ? "Gastar Inspiración" : "Inspiración 5e"}</span>
        </button>
      </div>
    </div>
  );
});
