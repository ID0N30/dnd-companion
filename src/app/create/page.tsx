"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { CLASS_SAVING_THROWS, CLASS_HIT_DIE, calculateMaxHP, getClassFeaturesForLevel, CLASS_STARTING_EQUIPMENT, CLASS_STARTING_SPELLS } from "@/lib/dndClassFeatures";
import { ArrowRight, ArrowLeft, Save, Shield, Heart, Sparkles, Zap, Award, Package, BookOpen } from "lucide-react";

const RACES = ["Humano", "Elfo", "Enano", "Mediano", "Dracónido", "Tieflling", "Gnomo", "Semielfo", "Semiorco"];
const CLASSES = ["Guerrero", "Mago", "Pícaro", "Clérigo", "Bardo", "Bárbaro", "Paladín", "Explorador", "Brujo", "Hechicero", "Monje"];

export default function CreateCharacterPage() {
  const router = useRouter();
  const createCharacter = useStore((state) => state.createCharacter);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    race: "Humano",
    charClass: "Guerrero",
    background: "Soldado",
    level: 1,
    conScore: 14,
  });

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);
  
  const handleSave = () => {
    const newId = createCharacter(formData.name, formData.race, formData.charClass, formData.background, formData.level);
    if (newId) {
      router.push("/sheet");
    }
  };

  const calculatedHP = calculateMaxHP(formData.charClass, formData.level, formData.conScore);
  const officialSavingThrows = CLASS_SAVING_THROWS[formData.charClass] || ["str", "con"];
  const unlockedFeatures = getClassFeaturesForLevel(formData.charClass, formData.level);

  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <main className="min-h-screen p-3 sm:p-6 flex flex-col items-center pt-8 sm:pt-16 font-sans">
      <div className="w-full max-w-3xl bg-parchment-dark p-4 sm:p-8 rounded-xl border-2 sm:border-4 border-magic-gold shadow-2xl relative">
        <h1 className="text-3xl sm:text-4xl text-center text-magic-red font-bold mb-6 font-cinzel">
          Forja tu Héroe (D&D 5ª Edición)
        </h1>

        {/* Step Wizard Header */}
        <div className="mb-6 sm:mb-8 flex justify-between items-center px-6 sm:px-16 relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-ink opacity-20 -z-10 -translate-y-1/2"></div>
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg border-2 transition-all
                ${step >= num ? 'bg-magic-red text-white border-magic-red shadow-[0_0_10px_rgba(217,56,41,0.5)]' : 'bg-parchment text-ink border-ink opacity-50'}`}
            >
              {num}
            </div>
          ))}
        </div>

        <div className="min-h-[350px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Name, Background & Level */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold font-cinzel text-magic-gold">1. Identidad y Nivel de Personaje</h2>
                
                <div>
                  <label className="block text-sm font-bold mb-1 text-ink">Nombre del Aventurero</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-parchment border-b-2 border-ink-light p-3 text-lg text-ink font-bold focus:outline-none focus:border-magic-gold transition-colors rounded-t"
                    placeholder="Ej. Eldon el Bravo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 text-ink">Trasfondo de la Historia</label>
                  <input 
                    type="text" 
                    value={formData.background}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    className="w-full bg-parchment border-b-2 border-ink-light p-3 text-lg text-ink focus:outline-none focus:border-magic-gold transition-colors rounded-t"
                    placeholder="Ej. Soldado, Acólito, Criminal, Noble"
                  />
                </div>

                {/* Level Selection Slider */}
                <div className="bg-parchment p-4 rounded border border-ink/20 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-sm text-ink flex items-center gap-2">
                      <Award className="w-5 h-5 text-magic-gold" /> Nivel de la Campaña:
                    </label>
                    <span className="text-2xl font-bold font-serif text-magic-gold bg-ink/10 px-4 py-1 rounded border border-magic-gold/40">
                      Nivel {formData.level}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={1} 
                    max={20} 
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                    className="w-full accent-magic-gold cursor-pointer"
                  />
                  <p className="text-xs text-ink-light italic">Tu nivel afectará tu vida inicial (HP), bono de competencia y habilidades de clase desbloqueadas.</p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Race & Class */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold font-cinzel text-magic-gold mb-3">2. Linaje y Vocación (D&D 5e)</h2>
                  
                  <label className="block text-sm font-bold mb-2 text-ink">Raza / Linaje</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
                    {RACES.map(race => (
                      <button
                        key={race}
                        type="button"
                        onClick={() => setFormData({ ...formData, race })}
                        className={`p-2.5 rounded border-2 transition-all font-semibold text-xs sm:text-sm cursor-pointer
                          ${formData.race === race ? 'border-magic-gold bg-magic-gold text-black font-bold shadow' : 'border-ink/20 bg-parchment text-ink hover:border-ink/50'}`}
                      >
                        {race}
                      </button>
                    ))}
                  </div>

                  <label className="block text-sm font-bold mb-2 text-ink">Clase Principal</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {CLASSES.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setFormData({ ...formData, charClass: cls })}
                        className={`p-2.5 rounded border-2 transition-all font-semibold text-xs sm:text-sm cursor-pointer
                          ${formData.charClass === cls ? 'border-magic-red bg-magic-red text-white font-bold shadow' : 'border-ink/20 bg-parchment text-ink hover:border-ink/50'}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: D&D 5e Summary Preview */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold font-cinzel text-magic-gold">3. Resumen de Estadísticas D&D 5e</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* HP & Hit Die Preview */}
                  <div className="bg-parchment p-4 rounded border border-magic-gold/40 flex items-center gap-4">
                    <Heart className="w-10 h-10 text-magic-red fill-magic-red/20 shrink-0" />
                    <div>
                      <span className="text-xs text-ink-light uppercase block font-bold">Vida Máxima Calculada (HP)</span>
                      <span className="text-3xl font-serif font-bold text-magic-gold">{calculatedHP} HP</span>
                      <span className="text-[10px] text-ink-light block">
                        (Dado d{CLASS_HIT_DIE[formData.charClass] || 8} + Mod CON por {formData.level} Niveles)
                      </span>
                    </div>
                  </div>

                  {/* Official Saving Throws Preview */}
                  <div className="bg-parchment p-4 rounded border border-magic-gold/40 flex items-center gap-4">
                    <Shield className="w-10 h-10 text-magic-gold shrink-0" />
                    <div>
                      <span className="text-xs text-ink-light uppercase block font-bold">Salvaguardias de Clase</span>
                      <div className="flex gap-2 mt-1">
                        {officialSavingThrows.map(st => (
                          <span key={st} className="text-xs font-bold uppercase bg-magic-gold text-black px-2.5 py-1 rounded shadow">
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Unlocked Class Features Preview */}
                <div className="bg-parchment p-4 rounded border border-ink/20 space-y-3">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2 font-cinzel">
                    <Sparkles className="w-4 h-4 text-magic-gold" /> Habilidades de Clase Desbloqueadas (Nivel {formData.level})
                  </h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs">
                    {unlockedFeatures.map((feat, idx) => (
                      <div key={idx} className="p-2 bg-parchment-dark rounded border border-ink/10 flex justify-between items-start">
                        <div>
                          <span className="font-bold text-magic-gold block">{feat.name}</span>
                          <span className="text-ink-light">{feat.description}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${feat.type === 'active' ? 'bg-magic-red/20 text-magic-red' : 'bg-ink/10 text-ink'}`}>
                          {feat.type === 'active' ? 'Activa' : 'Pasiva'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Starting Equipment Preview */}
                <div className="bg-parchment p-4 rounded border border-ink/20 space-y-3">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2 font-cinzel">
                    <Package className="w-4 h-4 text-magic-gold" /> Equipamiento Inicial Concedido ({formData.charClass})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {(CLASS_STARTING_EQUIPMENT[formData.charClass] || CLASS_STARTING_EQUIPMENT["Guerrero"]).map((item, idx) => (
                      <span key={idx} className="bg-parchment-dark px-2.5 py-1 rounded border border-ink/10 font-semibold text-ink flex items-center gap-1">
                        ✦ {item.name} <span className="text-[10px] text-ink-light">x{item.quantity}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Starting Spells Preview (if spellcaster) */}
                {(CLASS_STARTING_SPELLS[formData.charClass] || []).length > 0 && (
                  <div className="bg-parchment p-4 rounded border border-ink/20 space-y-3">
                    <h4 className="font-bold text-sm text-ink flex items-center gap-2 font-cinzel">
                      <BookOpen className="w-4 h-4 text-magic-gold" /> Conjuros Iniciales de Nivel 1 ({formData.charClass})
                    </h4>
                    <div className="space-y-1 text-xs">
                      {CLASS_STARTING_SPELLS[formData.charClass].map((spell, idx) => (
                        <div key={idx} className="p-1.5 bg-parchment-dark rounded border border-ink/10 flex justify-between items-center">
                          <span className="font-bold text-magic-gold">✨ {spell.name}</span>
                          <span className="text-[10px] text-ink-light italic">{spell.castingTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-ink/20 font-bold">
          <button 
            type="button"
            onClick={handlePrev} 
            disabled={step === 1}
            className={`flex items-center gap-2 px-5 py-2 rounded text-ink hover:text-magic-gold cursor-pointer transition ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <ArrowLeft className="w-5 h-5" /> Atrás
          </button>
          
          {step < 3 ? (
            <button 
              type="button"
              onClick={handleNext} 
              disabled={step === 1 && !formData.name}
              className="flex items-center gap-2 px-6 py-2.5 bg-ink text-parchment-dark rounded hover:bg-magic-gold hover:text-black disabled:opacity-50 transition cursor-pointer shadow"
            >
              Siguiente <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow-lg cursor-pointer"
            >
              Completar e Ingresar <Save className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
