"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";

export default function MagicParticles() {
  const isCombatMode = useStore((state) => state.isCombatMode);
  const [isSurging, setIsSurging] = useState(false);

  // Trigger a temporary 3.5s particle surge when entering combat mode
  useEffect(() => {
    if (isCombatMode) {
      setIsSurging(true);
      const timer = setTimeout(() => {
        setIsSurging(false);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setIsSurging(false);
    }
  }, [isCombatMode]);

  // Out of combat / normal mode: 8 particles
  // During combat activation surge: 20 particles
  const particleCount = isSurging ? 20 : 8;

  return (
    <div className={`fixed inset-0 pointer-events-none z-40 overflow-hidden mix-blend-screen transition-opacity duration-700 ${isSurging ? 'opacity-90' : 'opacity-50'}`}>
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = `${(i * (100 / particleCount) + (i % 3) * 2) % 96 + 2}%`;
        const sizePx = isSurging ? (i % 3 === 0 ? 4 : 3) : (i % 2 === 0 ? 3 : 2);
        
        const baseSpeed = isSurging ? 3.0 : 13;
        const durationSec = baseSpeed + (i % 5) * (isSurging ? 0.6 : 1.5);
        const delaySec = (i % 7) * (isSurging ? 0.3 : 1.2);
        
        // Hide half the particles on small mobile screens (< sm) to save CPU/Battery
        const isMobileHidden = i % 2 === 1;

        return (
          <div
            key={i}
            className={`ember-particle ${isMobileHidden ? 'hidden sm:block' : ''}`}
            style={{
              left,
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              animationDuration: `${durationSec}s`,
              animationDelay: `${delaySec}s`,
              boxShadow: isSurging ? '0 0 10px #f5d061, 0 0 20px #d93829' : '0 0 5px #f5d061, 0 0 10px #d93829'
            }}
          />
        );
      })}
    </div>
  );
}
