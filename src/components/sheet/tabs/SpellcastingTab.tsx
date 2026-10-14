"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Circle, Plus, PenTool, Trash2, Search, BookOpen, Zap, ShieldAlert } from "lucide-react";
import { CharacterState, Spell } from "@/store/useStore";

export interface SpellcastingTabProps {
  character: CharacterState;
  isEditing: boolean;
  getEffectiveStat: (statName: string) => number;
  getAbilityMod: (score: number) => number;
  useSpellSlot: (level: number) => void;
  restoreSpellSlot: (level: number) => void;
  setSpellSlotMax: (level: number, max: number) => void;
  addSpell: (spell: Spell, isTemp: boolean, duration?: number) => void;
  removeSpell: (id: string) => void;
  onOpenSpellEdit: (spell: Spell) => void;
}

const CLASS_SPELLCASTING_ABILITY: Record<string, "int" | "wis" | "cha"> = {
  Mago: "int",
  Clérigo: "wis",
  Druida: "wis",
  Explorador: "wis",
  Bardo: "cha",
  Brujo: "cha",
  Hechicero: "cha",
  Paladín: "cha",
  Artífice: "int",
};

const STAT_LABELS: Record<string, string> = {
  int: "INT (Inteligencia)",
  wis: "SAB (Sabiduría)",
  cha: "CAR (Carisma)",
};

export const SpellcastingTab = React.memo(function SpellcastingTab({
  character,
  isEditing,
  getEffectiveStat,
  getAbilityMod,
  useSpellSlot,
  restoreSpellSlot,
  setSpellSlotMax,
  addSpell,
  removeSpell,
  onOpenSpellEdit,
}: SpellcastingTabProps) {
  const [spellSearch, setSpellSearch] = useState("");
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | "all">("all");

  const [newSpell, setNewSpell] = useState({
    name: "",
    level: 1,
    school: "Evocación",
    desc: "",
    castingTime: "1 Acción",
    turns: "",
  });
  const [newSlotLevel, setNewSlotLevel] = useState(1);
  const [newSlotMax, setNewSlotMax] = useState(2);

  // Spellcasting Ability & DC calculation
  const defaultStat = CLASS_SPELLCASTING_ABILITY[character.charClass] || "int";
  const effectiveScore = getEffectiveStat(defaultStat);
  const spellMod = getAbilityMod(effectiveScore);
  const spellSaveDC = 8 + character.proficiencyBonus + spellMod;
  const spellAttackBonus = character.proficiencyBonus + spellMod;

  const handleAddSpellSubmit = () => {
    if (!newSpell.name.trim()) return;
    const isPerm = newSpell.turns === "";
    const duration = isPerm ? undefined : parseInt(newSpell.turns);
    addSpell(
      {
        id: Date.now().toString(),
        name: newSpell.name.trim(),
        level: newSpell.level,
        school: newSpell.school.trim(),
        description: newSpell.desc.trim(),
        castingTime: newSpell.castingTime.trim(),
      },
      !isPerm,
      duration
    );
    setNewSpell({
      name: "",
      level: 1,
      school: "Evocación",
      desc: "",
      castingTime: "1 Acción",
      turns: "",
    });
  };

  const handleCastSpell = (spell: Spell) => {
    if (spell.level > 0 && character.spellSlots[spell.level]) {
      const slot = character.spellSlots[spell.level];
      if (slot.current > 0) {
        useSpellSlot(spell.level);
      }
    }
  };

  const filteredSpells = (character.spells || []).filter((spell) => {
    const matchesLevel = spellLevelFilter === "all" || spell.level === spellLevelFilter;
    const matchesSearch =
      !spellSearch ||
      spell.name.toLowerCase().includes(spellSearch.toLowerCase()) ||
      spell.description.toLowerCase().includes(spellSearch.toLowerCase()) ||
      (spell.school && spell.school.toLowerCase().includes(spellSearch.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  return (
    <motion.div
      key="spells"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      {/* Top Spellcaster Overview Cards (D&D 5e) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
        <div className="p-3.5 bg-parchment rounded-xl border-2 border-magic-gold/60 shadow-md text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <BookOpen className="w-4 h-4 text-magic-gold shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-ink font-cinzel">
              Característica Clave
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-cinzel text-magic-gold">
            {STAT_LABELS[defaultStat] || defaultStat.toUpperCase()}
          </span>
          <span className="text-[10px] text-ink-light">Modificador: {spellMod >= 0 ? `+${spellMod}` : spellMod}</span>
        </div>

        <div className="p-3.5 bg-parchment rounded-xl border-2 border-magic-red/60 shadow-md text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShieldAlert className="w-4 h-4 text-magic-red shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-ink font-cinzel">
              CD de Salvación de Conjuros
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-magic-red">
            {spellSaveDC}
          </span>
          <span className="text-[10px] text-ink-light">8 + Competencia (+{character.proficiencyBonus}) + Mod ({spellMod >= 0 ? `+${spellMod}` : spellMod})</span>
        </div>

        <div className="p-3.5 bg-parchment rounded-xl border-2 border-magic-gold/60 shadow-md text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-magic-gold shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-ink font-cinzel">
              Bono de Ataque Mágico
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-magic-gold">
            {spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}
          </span>
          <span className="text-[10px] text-ink-light">Competencia (+{character.proficiencyBonus}) + Mod ({spellMod >= 0 ? `+${spellMod}` : spellMod})</span>
        </div>
      </div>

      {/* Form to add spell & set spell slots when isEditing is true */}
      {isEditing && (
        <div className="space-y-4">
          <div className="p-4 bg-parchment border-2 border-magic-gold rounded-xl space-y-3 font-sans shadow-lg">
            <h4 className="font-bold text-base sm:text-lg text-magic-gold font-cinzel flex items-center gap-2">
              <Plus className="w-5 h-5" /> Añadir Conjuro (Pluma Mágica)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nombre del Conjuro</label>
                <input
                  type="text"
                  value={newSpell.name}
                  onChange={(e) => setNewSpell({ ...newSpell, name: e.target.value })}
                  placeholder="Ej. Bola de Fuego"
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nivel (0 = Truco)</label>
                <input
                  type="number"
                  value={newSpell.level}
                  onChange={(e) => setNewSpell({ ...newSpell, level: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={9}
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Escuela de Magia</label>
                <input
                  type="text"
                  value={newSpell.school}
                  onChange={(e) => setNewSpell({ ...newSpell, school: e.target.value })}
                  placeholder="Evocación, Transmutación..."
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tiempo de Lanzamiento</label>
                <input
                  type="text"
                  value={newSpell.castingTime}
                  onChange={(e) => setNewSpell({ ...newSpell, castingTime: e.target.value })}
                  placeholder="1 Acción, Reacción..."
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Duración en Turnos (vacío = Perm)</label>
                <input
                  type="number"
                  placeholder="Ej. 3 (vacío = permanente)"
                  value={newSpell.turns}
                  onChange={(e) => setNewSpell({ ...newSpell, turns: e.target.value })}
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                />
              </div>
              <div className="col-span-full">
                <label className="block font-bold mb-1">Descripción del Hechizo</label>
                <input
                  type="text"
                  value={newSpell.desc}
                  onChange={(e) => setNewSpell({ ...newSpell, desc: e.target.value })}
                  placeholder="Efecto, daño o salvación requerida..."
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddSpellSubmit}
                className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow font-cinzel"
              >
                <Plus className="w-4 h-4" /> Añadir Hechizo
              </button>
            </div>
          </div>

          <div className="p-4 bg-parchment border-2 border-ink/20 rounded-xl space-y-3 font-sans">
            <h4 className="font-bold text-base text-ink font-cinzel">Ajustar Límite de Espacios de Conjuro</h4>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div>
                <label className="block font-bold mb-1">Nivel del Espacio</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={newSlotLevel}
                  onChange={(e) => setNewSlotLevel(parseInt(e.target.value) || 1)}
                  className="p-1.5 bg-parchment-dark border border-ink/30 rounded w-20 text-center font-bold text-ink"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Espacios Máximos</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newSlotMax}
                  onChange={(e) => setNewSlotMax(parseInt(e.target.value) || 1)}
                  className="p-1.5 bg-parchment-dark border border-ink/30 rounded w-20 text-center font-bold text-ink"
                />
              </div>
              <button
                onClick={() => setSpellSlotMax(newSlotLevel, newSlotMax)}
                className="mt-5 px-3 py-1.5 bg-ink text-parchment-dark font-bold text-xs rounded hover:bg-magic-gold hover:text-black transition cursor-pointer"
              >
                Configurar Espacios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Spell Slots Matrix (Levels 1 to 9) */}
      <div className="bg-parchment p-4 sm:p-6 rounded-xl border border-magic-gold/40 space-y-4 shadow-sm">
        <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-magic-gold">
              Espacios de Hechizo (Spell Slots)
            </h3>
            <p className="text-xs text-ink-light">
              Haz clic sobre cada casilla para gastar o recuperar ranuras mágicas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-sans">
          {Object.entries(character.spellSlots || {}).map(([levelStr, slot]) => {
            const level = parseInt(levelStr);
            return (
              <div key={level} className="p-3 bg-parchment-dark border border-ink/20 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs sm:text-sm text-ink font-cinzel">Nivel {level}</span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <div className="flex items-center gap-1 bg-ink/10 p-0.5 rounded border border-ink/20">
                        <button
                          onClick={() => setSpellSlotMax(level, Math.max(0, slot.max - 1))}
                          className="w-5 h-5 flex items-center justify-center bg-magic-red/80 hover:bg-magic-red text-white rounded font-bold text-xs cursor-pointer shadow-sm"
                          title="Reducir espacios máximos"
                        >
                          -
                        </button>
                        <button
                          onClick={() => setSpellSlotMax(level, slot.max + 1)}
                          className="w-5 h-5 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer shadow-sm"
                          title="Aumentar espacios máximos"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-ink-light font-bold font-mono">
                      {slot.current} / {slot.max}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: slot.max }).map((_, idx) => {
                    const isAvailable = idx < slot.current;
                    return (
                      <button
                        key={idx}
                        onClick={() => (isAvailable ? useSpellSlot(level) : restoreSpellSlot(level))}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center cursor-pointer transition text-sm ${
                          isAvailable
                            ? "bg-magic-gold border-magic-gold text-black font-bold shadow-[0_0_10px_rgba(245,208,97,0.5)]"
                            : "bg-transparent border-ink/30 text-ink/30"
                        }`}
                        title={isAvailable ? "Gastar ranura de conjuro" : "Recuperar ranura de conjuro"}
                      >
                        {isAvailable ? <Sparkles className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar for Spells */}
      <div className="bg-parchment p-3 rounded-xl border border-ink/20 flex flex-wrap justify-between items-center gap-3 font-sans shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={() => setSpellLevelFilter("all")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              spellLevelFilter === "all" ? "bg-magic-gold text-black shadow-sm" : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSpellLevelFilter(0)}
            className={`px-2.5 py-1.5 rounded font-bold transition cursor-pointer ${
              spellLevelFilter === 0 ? "bg-magic-gold text-black shadow-sm" : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Trucos
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSpellLevelFilter(lvl)}
              className={`px-2.5 py-1.5 rounded font-bold transition cursor-pointer font-mono ${
                spellLevelFilter === lvl ? "bg-magic-gold text-black shadow-sm" : "bg-parchment-dark text-ink hover:bg-ink/10"
              }`}
            >
              Nv.{lvl}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <input
            type="text"
            value={spellSearch}
            onChange={(e) => setSpellSearch(e.target.value)}
            placeholder="Buscar conjuro o escuela..."
            className="p-1.5 pl-7 text-xs bg-parchment-dark border border-ink/30 rounded text-ink font-bold w-full focus:outline-none focus:border-magic-gold"
          />
          <Search className="w-3.5 h-3.5 text-ink-light absolute left-2 top-2" />
        </div>
      </div>

      {/* Known Spells List */}
      <div className="bg-parchment p-4 sm:p-6 rounded-xl border border-ink/20 space-y-4 shadow-sm">
        <h3 className="text-xl font-bold font-cinzel text-ink border-b border-ink/20 pb-2 flex justify-between items-center">
          <span>Conjuros Conocidos ({filteredSpells.length})</span>
        </h3>
        {filteredSpells.length === 0 ? (
          <p className="text-xs text-ink-light py-4 text-center">
            No se encontraron conjuros para los criterios seleccionados.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSpells.map((spell) => {
              const hasSlotAvailable =
                spell.level === 0 ||
                (character.spellSlots[spell.level] && character.spellSlots[spell.level].current > 0);

              return (
                <div
                  key={spell.id}
                  className="p-3 bg-parchment-dark rounded-xl border border-ink/10 flex justify-between items-start gap-2 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink font-cinzel">{spell.name}</span>
                      <span className="text-[10px] bg-magic-gold/20 text-magic-gold font-bold px-1.5 py-0.5 rounded font-mono">
                        {spell.level === 0 ? "Truco" : `Nivel ${spell.level}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-light block">
                      {spell.school} • {spell.castingTime}
                    </span>
                    <p className="text-xs text-ink/80 mt-1 leading-relaxed">{spell.description}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleCastSpell(spell)}
                      disabled={!hasSlotAvailable}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm ${
                        spell.level === 0
                          ? "bg-magic-gold text-black hover:bg-yellow-500"
                          : hasSlotAvailable
                          ? "bg-magic-red text-white hover:bg-red-700"
                          : "bg-ink/10 text-ink-light cursor-not-allowed opacity-50"
                      }`}
                      title={
                        spell.level === 0
                          ? "Lanzar truco sin costo de ranura"
                          : hasSlotAvailable
                          ? `Lanzar y consumir 1 ranura de nivel ${spell.level}`
                          : `Sin ranuras disponibles de nivel ${spell.level}`
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Lanzar
                    </button>

                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenSpellEdit({ ...spell })}
                          className="text-ink-light hover:text-magic-gold p-1 cursor-pointer transition"
                          title="Editar Conjuro (Pluma Mágica)"
                        >
                          <PenTool className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSpell(spell.id)}
                          className="text-ink-light hover:text-magic-red p-1 cursor-pointer transition"
                          title="Eliminar Conjuro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default SpellcastingTab;
