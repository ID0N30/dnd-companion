"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Maximize2, Plus, PenTool, Trash2, X } from "lucide-react";
import { CharacterState } from "@/store/useStore";
import { ClassFeature } from "@/lib/dndClassFeatures";

export interface ClassFeaturesTabProps {
  character: CharacterState;
  classFeatures: ClassFeature[];
  isEditing: boolean;
  useClassFeature: (featureName: string, characterId?: string) => void;
  addCustomClassFeature: (feature: ClassFeature) => void;
  removeCustomClassFeature: (name: string) => void;
  onOpenFeatureEdit: (feat: { name: string; type: "active" | "passive"; usage: string; desc: string }) => void;
  showAlert?: (msg: string, title?: string, type?: "info" | "warning" | "success" | "danger") => void;
}

export const ClassFeaturesTab = React.memo(function ClassFeaturesTab({
  character,
  classFeatures,
  isEditing,
  useClassFeature,
  addCustomClassFeature,
  removeCustomClassFeature,
  onOpenFeatureEdit,
  showAlert,
}: ClassFeaturesTabProps) {
  const [featureFilter, setFeatureFilter] = useState<"all" | "active" | "passive" | "short" | "long">("all");
  const [featureSearch, setFeatureSearch] = useState("");
  const [focusFeaturesModalOpen, setFocusFeaturesModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    name: "",
    type: "active" as "active" | "passive",
    usage: "",
    desc: "",
  });

  const handleAddFeature = () => {
    if (!newFeature.name.trim() || !newFeature.desc.trim()) return;
    addCustomClassFeature({
      name: newFeature.name.trim(),
      type: newFeature.type,
      unlockedAtLevel: character.level,
      description: newFeature.desc.trim(),
      usage: newFeature.usage.trim() || undefined,
    });
    if (showAlert) {
      showAlert(
        `Libertad de Campaña / Lore DM: Se ha otorgado el rasgo "${newFeature.name}" a ${character.name}.`,
        "Rasgo Otorgado",
        "success"
      );
    }
    setNewFeature({ name: "", type: "active", usage: "", desc: "" });
  };

  const matchFeatureName = (a: string, b: string) => {
    const cleanA = a.toLowerCase().split("(")[0].trim();
    const cleanB = b.toLowerCase().split("(")[0].trim();
    return cleanA === cleanB || a.toLowerCase() === b.toLowerCase();
  };

  const officialMapped = classFeatures.map((f) => {
    const tracked = (character.customClassFeatures || []).find((c) => matchFeatureName(c.name, f.name));
    if (tracked) {
      return { ...f, ...tracked, isCustom: false };
    }
    return { ...f, isCustom: false };
  });

  const purelyCustom = (character.customClassFeatures || [])
    .filter((c) => !classFeatures.some((f) => matchFeatureName(f.name, c.name)))
    .map((f) => ({ ...f, isCustom: true }));

  const allFeatures: (ClassFeature & { isCustom?: boolean })[] = [
    ...officialMapped,
    ...purelyCustom,
  ];

  const filteredFeatures = allFeatures.filter((f) => {
    const matchesSearch =
      !featureSearch ||
      f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(featureSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (featureFilter === "all") return true;
    if (featureFilter === "active") return f.type === "active";
    if (featureFilter === "passive") return f.type === "passive";
    if (featureFilter === "short")
      return f.resetOn === "short" || (f.usage && f.usage.toLowerCase().includes("corto"));
    if (featureFilter === "long")
      return f.resetOn === "long" || (f.usage && f.usage.toLowerCase().includes("largo"));
    return true;
  });

  return (
    <motion.div
      key="class_features"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 font-sans"
    >
      <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-2xl font-bold font-cinzel text-magic-gold">
            Acciones y Rasgos de Clase ({character.charClass})
          </h3>
          <p className="text-xs text-ink-light font-sans">
            Habilidades oficiales de Nivel {character.level} y rasgos otorgados por Lore/DM.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar + Focus Mode Launcher */}
      <div className="bg-parchment p-3 rounded-xl border border-ink/20 flex flex-wrap justify-between items-center gap-3 font-sans shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={() => setFeatureFilter("all")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              featureFilter === "all"
                ? "bg-magic-gold text-black shadow-sm"
                : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Todas ({allFeatures.length})
          </button>
          <button
            onClick={() => setFeatureFilter("active")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              featureFilter === "active"
                ? "bg-magic-red text-white shadow-sm"
                : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setFeatureFilter("passive")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              featureFilter === "passive"
                ? "bg-ink text-parchment-dark shadow-sm"
                : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Pasivas
          </button>
          <button
            onClick={() => setFeatureFilter("short")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              featureFilter === "short"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Descanso Corto
          </button>
          <button
            onClick={() => setFeatureFilter("long")}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              featureFilter === "long"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-parchment-dark text-ink hover:bg-ink/10"
            }`}
          >
            Descanso Largo
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              value={featureSearch}
              onChange={(e) => setFeatureSearch(e.target.value)}
              placeholder="Buscar rasgo..."
              className="p-1.5 pl-7 text-xs bg-parchment-dark border border-ink/30 rounded text-ink font-bold w-full focus:outline-none focus:border-magic-gold"
            />
            <Search className="w-3.5 h-3.5 text-ink-light absolute left-2 top-2" />
          </div>
          <button
            onClick={() => setFocusFeaturesModalOpen(true)}
            className="px-3 py-1.5 bg-magic-gold text-black text-xs font-bold rounded hover:bg-yellow-500 transition cursor-pointer shadow shrink-0 flex items-center gap-1 font-cinzel"
            title="Ampliar vista de acciones a pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Modo Enfoque
          </button>
        </div>
      </div>

      {/* Custom Class Feature Form (Pluma Mágica / Lore DM) */}
      {isEditing && (
        <div className="p-4 bg-parchment border-2 border-magic-gold rounded-xl space-y-3 font-sans shadow-lg">
          <div className="flex justify-between items-center border-b border-ink/10 pb-2">
            <h4 className="font-bold text-base sm:text-lg text-magic-gold font-cinzel flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Otorgar Rasgo por Lore / DM (Libertad de Campaña)
            </h4>
          </div>
          <p className="text-xs text-ink-light italic font-sans">
            Nota: Esta herramienta permite al DM conceder bendiciones, títulos, artefactos o habilidades por historia sin restricción de nivel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
            <div>
              <label className="block font-bold mb-1">Nombre del Rasgo</label>
              <input
                type="text"
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                placeholder="Ej. Bendición del Viento, Don Arcabuce..."
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Tipo de Habilidad</label>
              <select
                value={newFeature.type}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, type: e.target.value as "active" | "passive" })
                }
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold cursor-pointer"
              >
                <option value="active">Activa</option>
                <option value="passive">Pasiva</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Uso / Recarga (Opcional)</label>
              <input
                type="text"
                value={newFeature.usage}
                onChange={(e) => setNewFeature({ ...newFeature, usage: e.target.value })}
                placeholder="Ej. 1 por Descanso Largo, Reacción..."
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
              />
            </div>
            <div className="col-span-full">
              <label className="block font-bold mb-1">Descripción del Rasgo</label>
              <input
                type="text"
                value={newFeature.desc}
                onChange={(e) => setNewFeature({ ...newFeature, desc: e.target.value })}
                placeholder="Explicación del efecto o bono otorgado..."
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddFeature}
              className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow font-cinzel"
            >
              <Plus className="w-4 h-4" /> Otorgar Rasgo
            </button>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {filteredFeatures.map((feat, idx) => {
          const curUses = feat.currentUses ?? feat.maxUses;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 space-y-2.5 relative shadow-md transition-shadow ${
                feat.isCustom
                  ? "bg-parchment-dark border-magic-gold"
                  : "bg-parchment border-magic-gold/30 hover:border-magic-gold/60"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-bold text-lg text-magic-gold font-cinzel flex items-center gap-2">
                    {feat.isCustom && (
                      <span className="text-[10px] bg-magic-gold/20 text-magic-gold px-1.5 py-0.5 rounded font-cinzel">
                        Lore
                      </span>
                    )}
                    {feat.name}
                  </h4>
                  {feat.isCustom && (
                    <span className="text-[10px] bg-magic-gold/20 text-magic-gold font-bold px-2 py-0.5 rounded uppercase block mt-0.5">
                      Otorgado por Lore / DM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${
                      feat.type === "active"
                        ? "bg-magic-red text-white shadow"
                        : "bg-ink/10 text-ink"
                    }`}
                  >
                    {feat.type === "active" ? "Activa" : "Pasiva"}
                  </span>
                  {isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          onOpenFeatureEdit({
                            name: feat.name,
                            type: feat.type,
                            usage: feat.usage || "",
                            desc: feat.description,
                          })
                        }
                        className="text-ink-light hover:text-magic-gold p-1 cursor-pointer transition"
                        title="Editar Rasgo (Pluma Mágica)"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                      {feat.isCustom && (
                        <button
                          onClick={() => removeCustomClassFeature(feat.name)}
                          className="text-ink-light hover:text-magic-red p-1 cursor-pointer transition"
                          title="Retirar Rasgo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink/90 leading-relaxed font-sans">
                {feat.description}
              </p>

              {(feat.usage || feat.type === "active") && (
                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs font-bold gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {feat.usage && <span className="text-ink-light">Uso:</span>}
                    {feat.usage && (
                      <span className="bg-magic-gold/20 text-magic-gold px-2 py-0.5 rounded font-mono">
                        {feat.usage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {feat.maxUses !== undefined && (
                      <span className="bg-ink/10 text-ink font-mono px-2 py-0.5 rounded">
                        {curUses} / {feat.maxUses}
                      </span>
                    )}
                    {feat.type === "active" && (
                      <button
                        onClick={() => useClassFeature(feat.name, character.id)}
                        disabled={curUses !== undefined && curUses <= 0}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold text-white transition cursor-pointer ${
                          curUses !== undefined && curUses <= 0
                            ? "bg-gray-500 opacity-50 cursor-not-allowed"
                            : "bg-magic-red hover:bg-red-700 shadow-sm"
                        }`}
                      >
                        Usar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Focus Mode Fullscreen Modal */}
      <AnimatePresence>
        {focusFeaturesModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans"
          >
            <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col font-sans">
              <div className="flex justify-between items-center border-b border-ink/20 pb-3 mb-4">
                <div>
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    Modo Enfoque — Acciones de Clase ({character.charClass})
                  </h3>
                  <p className="text-xs text-ink-light">
                    Consulta detallada de todas las habilidades de tu héroe.
                  </p>
                </div>
                <button
                  onClick={() => setFocusFeaturesModalOpen(false)}
                  className="p-2 text-ink-light hover:text-ink cursor-pointer transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeatures.map((feat, idx) => {
                  const curUses = feat.currentUses ?? feat.maxUses;
                  return (
                    <div
                      key={idx}
                      className="p-5 bg-parchment rounded-xl border-2 border-magic-gold/40 shadow-lg flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="font-bold text-xl text-magic-gold font-cinzel">
                            {feat.name}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${
                              feat.type === "active"
                                ? "bg-magic-red text-white shadow"
                                : "bg-ink/10 text-ink"
                            }`}
                          >
                            {feat.type === "active" ? "Activa" : "Pasiva"}
                          </span>
                        </div>
                        <p className="text-sm text-ink/90 leading-relaxed font-sans">
                          {feat.description}
                        </p>
                      </div>

                      {(feat.usage || feat.type === "active") && (
                        <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs font-bold gap-2">
                          {feat.usage ? (
                            <span className="bg-magic-gold/20 text-magic-gold px-2.5 py-1 rounded font-mono">
                              Uso: {feat.usage}
                            </span>
                          ) : (
                            <div />
                          )}
                          <div className="flex items-center gap-2">
                            {feat.maxUses !== undefined && (
                              <span className="font-mono text-sm bg-ink/10 px-2 py-0.5 rounded">
                                {curUses} / {feat.maxUses}
                              </span>
                            )}
                            {feat.type === "active" && (
                              <button
                                onClick={() => useClassFeature(feat.name, character.id)}
                                disabled={curUses !== undefined && curUses <= 0}
                                className={`px-3 py-1 rounded font-bold text-white transition cursor-pointer ${
                                  curUses !== undefined && curUses <= 0
                                    ? "bg-gray-500 opacity-50 cursor-not-allowed"
                                    : "bg-magic-red hover:bg-red-700 shadow-sm"
                                }`}
                              >
                                Usar Carga
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default ClassFeaturesTab;
