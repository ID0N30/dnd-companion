"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, X, Sparkles, Trophy } from "lucide-react";

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type RollResult = {
  diceType: DiceType;
  dieValue: number;
  modifier: number;
  total: number;
  reason: string;
  timestamp: number;
  onAccept?: (result: RollResult) => void;
};

// Global event trigger for custom rolls across the app
export const triggerDiceRoll = (
  diceType: DiceType, 
  modifier: number = 0, 
  reason: string = "Tirada de Dado", 
  forcedValue?: number,
  onAccept?: (result: RollResult) => void
) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app_dice_roll', {
      detail: { diceType, modifier, reason, forcedValue, onAccept }
    });
    window.dispatchEvent(event);
  }
};

export default function DiceRoller() {
  const [openSelector, setOpenSelector] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [currentDice, setCurrentDice] = useState<DiceType>('d20');
  const [activeRoll, setActiveRoll] = useState<RollResult | null>(null);

  // Listen to global dice roll events (e.g. clicking a skill, attribute, or initiative)
  useEffect(() => {
    const handleCustomRoll = (e: any) => {
      const { diceType, modifier, reason, forcedValue, onAccept } = e.detail;
      executeRoll(diceType || 'd20', modifier || 0, reason || 'Prueba', forcedValue, onAccept);
    };

    window.addEventListener('app_dice_roll', handleCustomRoll);
    return () => window.removeEventListener('app_dice_roll', handleCustomRoll);
  }, []);

  const getSides = (type: DiceType): number => {
    switch (type) {
      case 'd4': return 4;
      case 'd6': return 6;
      case 'd8': return 8;
      case 'd10': return 10;
      case 'd12': return 12;
      case 'd20': return 20;
      case 'd100': return 100;
      default: return 20;
    }
  };

  const executeRoll = (
    diceType: DiceType, 
    modifier: number = 0, 
    reason: string = "Tirada Manual", 
    forcedValue?: number,
    onAccept?: (result: RollResult) => void
  ) => {
    setCurrentDice(diceType);
    setIsRolling(true);
    setActiveRoll(null);
    setOpenSelector(false);

    const sides = getSides(diceType);

    // Tumbling animation duration (1.2 seconds)
    setTimeout(() => {
      const dieValue = typeof forcedValue === 'number' ? forcedValue : Math.floor(Math.random() * sides) + 1;
      const total = dieValue + modifier;

      setActiveRoll({
        diceType,
        dieValue,
        modifier,
        total,
        reason,
        timestamp: Date.now(),
        onAccept
      });
      setIsRolling(false);
    }, 1200);
  };

  const handleDismiss = () => {
    const currentRoll = activeRoll;
    setActiveRoll(null);
    if (currentRoll && currentRoll.onAccept) {
      currentRoll.onAccept(currentRoll);
    }
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Bottom Right) */}
      <button
        onClick={() => setOpenSelector(!openSelector)}
        className="fixed bottom-6 right-6 z-40 bg-magic-gold text-black p-3.5 rounded-full shadow-[0_0_20px_rgba(245,208,97,0.8)] border-2 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        title="Lanzar Dados Mágicos D&D"
      >
        <Dices className="w-7 h-7 animate-pulse" />
      </button>

      {/* QUICK DICE SELECTOR DRAWER */}
      <AnimatePresence>
        {openSelector && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 right-6 z-40 bg-parchment-dark border-4 border-magic-gold p-4 rounded-xl shadow-2xl font-sans w-64 space-y-3"
          >
            <div className="flex justify-between items-center border-b border-ink/20 pb-2">
              <span className="font-cinzel font-bold text-magic-gold text-sm flex items-center gap-1.5">
                <Dices className="w-4 h-4" /> Lanzador de Dados
              </span>
              <button onClick={() => setOpenSelector(false)} className="text-ink-light hover:text-magic-red p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const).map(dice => (
                <button
                  key={dice}
                  onClick={() => executeRoll(dice, 0, `Tirada de ${dice}`)}
                  className="p-2 bg-parchment border border-ink/30 rounded font-serif font-bold text-ink hover:bg-magic-gold hover:text-black transition cursor-pointer text-sm"
                >
                  {dice}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D DICE TUMBLING ANIMATION OVERLAY */}
      <AnimatePresence>
        {isRolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              animate={{ 
                rotateX: [0, 360, 720, 1080], 
                rotateY: [0, 720, 360, 1440],
                scale: [0.8, 1.3, 1, 1.2, 1]
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="w-32 h-32 bg-magic-gold text-black rounded-2xl border-4 border-white flex items-center justify-center shadow-[0_0_50px_rgba(245,208,97,0.9)]"
            >
              <div className="text-center font-cinzel">
                <Dices className="w-12 h-12 mx-auto animate-spin" />
                <span className="font-bold text-lg uppercase block mt-1">{currentDice}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT ALERT MODAL */}
      <AnimatePresence>
        {activeRoll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans"
          >
            <div className="bg-parchment-dark border-4 border-magic-gold p-6 sm:p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-4 relative">
              <button 
                onClick={handleDismiss} 
                className="absolute top-3 right-3 text-ink-light hover:text-magic-red p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-block p-3 bg-magic-gold/20 rounded-full border border-magic-gold/40">
                <Trophy className="w-8 h-8 text-magic-gold" />
              </div>

              <h3 className="font-cinzel font-bold text-xl text-magic-gold">
                {activeRoll.reason}
              </h3>

              {/* Die Face & Total Display */}
              <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                <span className="text-xs text-ink-light uppercase font-bold tracking-widest block">Resultado de {activeRoll.diceType}</span>
                
                <div className="flex justify-center items-center gap-3">
                  <span className="text-4xl font-serif font-bold text-ink bg-ink/10 px-4 py-2 rounded border border-ink/30">
                    {activeRoll.dieValue}
                  </span>
                  {activeRoll.modifier !== 0 && (
                    <span className="text-xl font-bold text-magic-gold">
                      {activeRoll.modifier >= 0 ? `+ ${activeRoll.modifier}` : `- ${Math.abs(activeRoll.modifier)}`}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-ink/10 flex justify-between items-center text-sm">
                  <span className="text-ink-light font-bold">TOTAL FINAL:</span>
                  <span className="text-3xl font-serif font-bold text-magic-gold drop-shadow-md">
                    {activeRoll.total}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-sm cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
