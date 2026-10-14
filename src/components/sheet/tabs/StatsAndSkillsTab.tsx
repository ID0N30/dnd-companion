"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, ChevronDown, ChevronUp, CheckCircle2, Eye } from "lucide-react";
import { CharacterState, SKILLS_5E } from "@/store/useStore";
import { triggerDiceRoll } from "@/components/DiceRoller";
import { ASSETS } from "@/lib/assets";

export interface StatsAndSkillsTabProps {
  character: CharacterState;
  officialSavingThrows: string[];
  isEditing: boolean;
  getEffectiveStat: (statName: string) => number;
  getAbilityMod: (score: number) => number;
  getEffectiveSkillMod: (skillName: string, statKey: string) => { baseMod: number; skillMods: number; totalMod: number };
  togglePinSkill: (skillName: string) => void;
  onOpenStatEdit: (stat: string) => void;
  onOpenSkillEdit: (skillName: string) => void;
}

const STAT_LABELS: Record<string, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

export const StatsAndSkillsTab = React.memo(function StatsAndSkillsTab({
  character,
  officialSavingThrows,
  isEditing,
  getEffectiveStat,
  getAbilityMod,
  getEffectiveSkillMod,
  togglePinSkill,
  onOpenStatEdit,
  onOpenSkillEdit,
}: StatsAndSkillsTabProps) {
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Passive Perception: 10 + modifier for "Percepción" (stat: wis)
  const perceptionMod = getEffectiveSkillMod("Percepción", "wis");
  const passivePerception = 10 + perceptionMod.totalMod;

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 font-sans"
    >
      {/* 6 Core Stats & Saving Throws */}
      <div className="col-span-1 space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold border-b border-ink/20 pb-2 flex justify-between items-center font-cinzel text-ink">
          <span>Atributos</span>
          <span className="text-xs text-ink-light font-sans font-normal">
            Competencia: +{character.proficiencyBonus}
          </span>
        </h3>

        {/* Passive Perception Highlight Card */}
        <div className="bg-parchment-dark p-3 rounded-xl border-2 border-magic-gold/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-magic-gold shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm text-ink block font-cinzel">
                Percepción Pasiva
              </span>
              <span className="text-[10px] text-ink-light font-sans">
                10 + Mod. Percepción ({perceptionMod.totalMod >= 0 ? `+${perceptionMod.totalMod}` : perceptionMod.totalMod})
              </span>
            </div>
          </div>
          <span className="font-bold text-xl sm:text-2xl font-mono text-magic-gold bg-ink/10 px-3 py-0.5 rounded-lg border border-magic-gold/30">
            {passivePerception}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-1 gap-2.5 sm:gap-3">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => {
            const baseVal = character.stats[stat] || 10;
            const effective = getEffectiveStat(stat);
            const mod = getAbilityMod(effective);
            const isProficientSave = officialSavingThrows.includes(stat);
            const saveBonus = mod + (isProficientSave ? character.proficiencyBonus : 0);
            const label = STAT_LABELS[stat] || stat.toUpperCase();

            return (
              <div key={stat} className="bg-parchment p-2.5 sm:p-3 border border-ink/10 rounded relative group shadow-sm">
                {isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStatEdit(stat);
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow z-10"
                    title={`Editar atributo ${label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  onClick={() =>
                    triggerDiceRoll("d20", mod, `Prueba de ${label} (${character.name})`)
                  }
                  className="flex flex-col lg:flex-row justify-between items-center cursor-pointer hover:bg-ink/5 p-1 rounded transition"
                  title={`Hacer clic para lanzar d20 + ${mod}`}
                >
                  <div>
                    <span className="font-bold uppercase tracking-wider text-xs sm:text-sm block flex items-center gap-1.5 font-cinzel">
                      <img
                        src={ASSETS.icons.d20}
                        className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                        alt="d20"
                      />
                      {label}
                    </span>
                    <span className="text-[10px] text-ink-light font-sans block">
                      Mod: {mod >= 0 ? `+${mod}` : mod}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 lg:mt-0">
                    {effective !== baseVal && (
                      <span className="text-[10px] font-sans font-bold text-magic-red">
                        ({effective > baseVal ? "+" + (effective - baseVal) : effective - baseVal})
                      </span>
                    )}
                    <span
                      className={`text-xl sm:text-2xl font-serif font-bold ${
                        effective !== baseVal ? "text-magic-gold drop-shadow-md" : "text-ink"
                      }`}
                    >
                      {effective}
                    </span>
                  </div>
                </div>

                {/* Official 2 Class Saving Throws Display (Clickable) */}
                <div
                  onClick={() =>
                    triggerDiceRoll(
                      "d20",
                      saveBonus,
                      `Salvaguardia: ${label} (${character.name})`
                    )
                  }
                  className="mt-2 pt-1.5 border-t border-ink/10 flex justify-between items-center text-[10px] font-sans cursor-pointer hover:bg-ink/5 p-1 rounded transition"
                  title={`Tirada de Salvación ${label}: d20 + ${saveBonus}`}
                >
                  <span className="text-ink-light">Salvación ({label}):</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      isProficientSave
                        ? "bg-magic-gold text-black shadow-sm"
                        : "bg-ink/10 text-ink"
                    }`}
                  >
                    <span>{saveBonus >= 0 ? `+${saveBonus}` : saveBonus}</span>
                    {isProficientSave && <CheckCircle2 className="w-2.5 h-2.5" />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills & Modifiers Section */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold border-b border-ink/20 pb-2 mb-4 flex justify-between items-center font-cinzel text-ink">
            <span>Habilidades Destacadas</span>
            <button
              onClick={() => setShowAllSkills(!showAllSkills)}
              className="text-xs sm:text-sm text-magic-gold flex items-center gap-1 hover:underline font-sans font-normal cursor-pointer"
            >
              {showAllSkills ? "Ocultar Lista" : "Ver las 18 Habilidades"}
              {showAllSkills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-sans mb-4">
            {character.pinnedSkills.map((skillName) => {
              const skillDef = SKILLS_5E.find((s) => s.name === skillName) || { stat: "str" };
              const { skillMods, totalMod } = getEffectiveSkillMod(skillName, skillDef.stat);
              return (
                <div
                  key={skillName}
                  onClick={() =>
                    triggerDiceRoll(
                      "d20",
                      totalMod,
                      `Prueba de ${skillName} (${character.name})`
                    )
                  }
                  className="p-2.5 bg-parchment border-l-4 border-magic-gold rounded flex justify-between items-center shadow-sm cursor-pointer hover:bg-ink/5 transition relative group"
                  title={`Lanzar d20 + ${totalMod} para ${skillName}`}
                >
                  <div className="truncate">
                    <span className="font-bold text-xs sm:text-sm block truncate flex items-center gap-1.5">
                      <img
                        src={ASSETS.icons.d20}
                        className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                        alt="d20"
                      />
                      {skillName}
                    </span>
                    <span className="text-[10px] text-ink-light uppercase">
                      ({STAT_LABELS[skillDef.stat] || skillDef.stat})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {skillMods !== 0 && (
                      <span
                        className={`text-[10px] font-bold ${
                          skillMods > 0 ? "text-magic-gold" : "text-magic-red"
                        }`}
                      >
                        ({skillMods > 0 ? "+" + skillMods : skillMods})
                      </span>
                    )}
                    <span className="font-bold text-base sm:text-lg text-magic-gold font-mono">
                      {totalMod >= 0 ? `+${totalMod}` : totalMod}
                    </span>
                    {isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSkillEdit(skillName);
                        }}
                        className="p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow z-10"
                        title={`Modificar habilidad ${skillName}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {showAllSkills && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-parchment-dark p-3 sm:p-4 rounded border border-ink/20"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-xs">
                  {SKILLS_5E.map((skill) => {
                    const isPinned = character.pinnedSkills.includes(skill.name);
                    const { skillMods, totalMod } = getEffectiveSkillMod(skill.name, skill.stat);
                    return (
                      <div
                        key={skill.name}
                        className="flex justify-between items-center p-2 bg-parchment rounded border border-ink/10 hover:bg-ink/5 transition shadow-sm"
                      >
                        <div
                          onClick={() =>
                            triggerDiceRoll(
                              "d20",
                              totalMod,
                              `Prueba de ${skill.name} (${character.name})`
                            )
                          }
                          className="flex-1 truncate cursor-pointer flex items-center gap-1"
                          title={`Lanzar d20 + ${totalMod} para ${skill.name}`}
                        >
                          <span className="truncate flex items-center gap-1.5">
                            <img
                              src={ASSETS.icons.d20}
                              className="w-3 h-3 object-contain inline-block shrink-0"
                              alt="d20"
                            />
                            {skill.name}{" "}
                            <span className="text-ink-light text-[10px]">
                              ({STAT_LABELS[skill.stat] || skill.stat})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {skillMods !== 0 && (
                            <span
                              className={`text-[10px] font-bold ${
                                skillMods > 0 ? "text-magic-gold" : "text-magic-red"
                              }`}
                            >
                              ({skillMods > 0 ? "+" + skillMods : skillMods})
                            </span>
                          )}
                          <span
                            onClick={() =>
                              triggerDiceRoll(
                                "d20",
                                totalMod,
                                `Prueba de ${skill.name} (${character.name})`
                              )
                            }
                            className="font-bold cursor-pointer hover:text-magic-gold font-mono"
                          >
                            {totalMod >= 0 ? `+${totalMod}` : totalMod}
                          </span>
                          {isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSkillEdit(skill.name);
                              }}
                              className="p-0.5 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow"
                              title={`Modificar habilidad ${skill.name}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinSkill(skill.name);
                            }}
                            className={`p-1 rounded cursor-pointer ${
                              isPinned
                                ? "text-magic-gold"
                                : "text-ink-light opacity-50 hover:opacity-100"
                            }`}
                            title={isPinned ? "Desfijar habilidad" : "Fijar habilidad"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

export default StatsAndSkillsTab;
