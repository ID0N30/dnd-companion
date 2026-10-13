"use client";

import React from "react";
import Link from "next/link";
import { CharacterState, isDemoPlayer, Item } from "@/store/useStore";
import { ASSETS } from "@/lib/assets";
import { triggerDiceRoll } from "@/components/DiceRoller";
import { Sparkles, RotateCcw, Users, User, Shield } from "lucide-react";

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
    <div className="bg-gradient-to-r from-[#1c140e] via-[#241a12] to-[#120d09] border-2 border-magic-gold/60 rounded-2xl p-4 sm:p-5 shadow-2xl mb-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 bg-magic-gold text-black text-[9px] font-extrabold px-3 py-0.5 rounded-bl uppercase tracking-wider">
        MESA DE PRUEBAS • SANDBOX AISLADO
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-ink/20 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
              Mesa de Pruebas & Explorador de Funciones
            </h2>
          </div>
          <p className="text-xs text-ink-light mt-1 max-w-3xl leading-relaxed">
            Carta de presentación interactiva de <strong>D&D Companion</strong>: sin registro ni base de datos.
            Todas las modificaciones ocurren en local. Experimenta libremente con la party y restaura los valores iniciales cuando quieras.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
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
            className="px-3 py-1.5 bg-ink/20 hover:bg-ink/30 text-ink hover:text-magic-gold border border-ink/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Restaura la party completa al estado original de demostración"
          >
            <RotateCcw className="w-3.5 h-3.5 text-magic-gold" /> Restaurar Fábrica
          </button>

          <Link
            href="/campaigns"
            className="px-3.5 py-1.5 bg-gradient-to-r from-magic-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Salón de Campañas →
          </Link>
        </div>
      </div>

      {/* Sub-bar: Hero Selector & View Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Hero Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-ink-light flex items-center gap-1 mr-1 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-magic-gold" /> Personaje:
          </span>
          {players.filter(p => isDemoPlayer(p.id)).map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActivePlayerId(p.id);
                if (viewMode !== "sheet") setViewMode("sheet");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                character.id === p.id && viewMode === "sheet"
                  ? "bg-magic-gold text-black shadow-md border border-white/40" 
                  : "bg-parchment-dark text-ink hover:text-magic-gold border border-ink/20"
              }`}
            >
              <span>{p.charClass === "Guerrero" ? "G" : p.charClass === "Clérigo" ? "C" : p.charClass === "Pícaro" ? "P" : "M"}</span>
              <span>{p.name.split(" ")[0]}</span>
              <span className="text-[10px] opacity-75">({p.charClass})</span>
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex bg-parchment-dark p-1 rounded-lg border border-ink/20 text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode("sheet")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === "sheet" ? "bg-magic-gold text-black shadow" : "text-ink hover:text-magic-gold"}`}
          >
            <User className="w-3.5 h-3.5" /> Vista Héroe
          </button>
          <button
            onClick={() => setViewMode("dm")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === "dm" ? "bg-magic-gold text-black shadow" : "text-ink hover:text-magic-gold"}`}
          >
            <Shield className="w-3.5 h-3.5" /> Vista DM (Party Completa)
          </button>
        </div>
      </div>

      {/* Quick Event Simulation Toolbar */}
      <div className="mt-3 pt-3 border-t border-ink/10 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-magic-gold font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
          Pruebas Rápidas:
        </span>
        <button
          onClick={() => triggerDiceRoll("d20", 3, `Prueba de Demostración (${character.name})`)}
          className="px-2.5 py-1 bg-parchment/70 hover:bg-parchment text-ink rounded border border-ink/20 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Lanza un d20 animado con modificadores automáticos 5e"
        >
          <img src={ASSETS.icons.d20} className="w-3.5 h-3.5 object-contain inline-block shrink-0" alt="d20" /> Tirar d20 Animado
        </button>
        <button
          onClick={() => {
            modifyHPCurrent(-15);
            showAlert(`${character.name} recibió 15 de daño para comprobar la barra interactiva de vida.`, "Daño Simulado", "warning");
          }}
          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Aplica 15 de daño al personaje activo"
        >
          Recibir -15 HP
        </button>
        <button
          onClick={() => {
            modifyHPCurrent(-character.hp.current);
            showAlert(`${character.name} ha caído a 0 HP. Ahora puedes probar el sistema de Salvaciones contra la Muerte 5e (éxitos y fallos).`, "Estado Agonizante", "danger");
          }}
          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-300 rounded border border-red-500/40 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Pone los HP a 0 para probar la pantalla y salvaciones de muerte"
        >
          Caer a 0 HP (Agonizante)
        </button>
        <button
          onClick={() => {
            longRest();
            showAlert(`${character.name} ha completado un Descanso Largo: vida máxima restaurada y ranuras de conjuro recuperadas.`, "Descanso Largo", "success");
          }}
          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Restaura toda la vida y ranuras mágicas"
        >
          Descanso Largo
        </button>
        <button
          onClick={() => {
            addItem({
              id: "legendary_ring_" + Date.now(),
              name: "Anillo de Resistencia Ígnea",
              type: "general",
              description: "Anillo forjado en las fraguas enanas. Otorga resistencia al daño de fuego.",
              quantity: 1,
              equipped: false,
            }, false);
            showAlert(`¡Has recibido el "Anillo de Resistencia Ígnea"! Revisa tu pestaña de Equipamiento.`, "Botín del DM", "success");
          }}
          className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Simula recibir un objeto legendario otorgado por el DM"
        >
          Simular Botín DM
        </button>
        <button
          onClick={() => toggleInspiration(character.id)}
          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Concede o gasta Inspiración 5e"
        >
          {character.inspiration ? "Gastar Inspiración" : "Conceder Inspiración"}
        </button>
      </div>
    </div>
  );
});
