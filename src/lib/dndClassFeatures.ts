export type ClassFeature = {
  name: string;
  type: 'active' | 'passive';
  unlockedAtLevel: number;
  description: string;
  usage?: string;
};

// Official D&D 5e 2 Saving Throws per Class
export const CLASS_SAVING_THROWS: Record<string, string[]> = {
  "Guerrero": ["str", "con"],
  "Mago": ["int", "wis"],
  "Pícaro": ["dex", "int"],
  "Clérigo": ["wis", "cha"],
  "Bardo": ["dex", "cha"],
  "Bárbaro": ["str", "con"],
  "Paladín": ["wis", "cha"],
  "Explorador": ["str", "dex"],
  "Brujo": ["wis", "cha"],
  "Hechicero": ["con", "cha"],
  "Monje": ["str", "dex"]
};

// Official D&D 5e Class Hit Die
export const CLASS_HIT_DIE: Record<string, number> = {
  "Bárbaro": 12,
  "Guerrero": 10,
  "Paladín": 10,
  "Explorador": 10,
  "Bardo": 8,
  "Clérigo": 8,
  "Pícaro": 8,
  "Brujo": 8,
  "Monje": 8,
  "Mago": 6,
  "Hechicero": 6
};

// Calculate Official D&D 5e Starting Max HP based on Level and CON Mod
export const calculateMaxHP = (className: string, level: number, conScore: number): number => {
  const hitDie = CLASS_HIT_DIE[className] || 8;
  const conMod = Math.floor((conScore - 10) / 2);
  
  // Level 1: Full Hit Die + CON Mod
  const level1HP = hitDie + conMod;
  
  // Level 2+: Average Hit Die roll (hitDie / 2 + 1) + CON Mod per level
  const avgRollPerLevel = Math.floor(hitDie / 2) + 1 + conMod;
  const additionalHP = Math.max(0, level - 1) * Math.max(1, avgRollPerLevel);
  
  return Math.max(1, level1HP + additionalHP);
};

// Official D&D 5e Class Features by Class and Level
export const CLASS_FEATURES: Record<string, ClassFeature[]> = {
  "Guerrero": [
    { name: "Estilo de Combate", type: "passive", unlockedAtLevel: 1, description: "Adoptas una especialización de combate (Arqueria, Defensa, Duelista o Gran Arma)." },
    { name: "Segundo Viento (Second Wind)", type: "active", unlockedAtLevel: 1, description: "Recuperas 1d10 + nivel de Guerrero de vida como acción adicional.", usage: "1 uso por Descanso Corto" },
    { name: "Acción Oleada (Action Surge)", type: "active", unlockedAtLevel: 2, description: "Puedes realizar una acción adicional durante tu turno.", usage: "1 uso por Descanso Corto" },
    { name: "Arquetipo Marcial", type: "passive", unlockedAtLevel: 3, description: "Eliges tu especialidad (Campeón, Maestro de Batalla o Caballero Arcano)." },
    { name: "Aumento de Puntuación / Dote", type: "passive", unlockedAtLevel: 4, description: "Incrementas puntuaciones de atributo o seleccionas una dote." },
    { name: "Ataque Extra", type: "passive", unlockedAtLevel: 5, description: "Puedes atacar dos veces en lugar de una cuando realizas la acción de Atacar." }
  ],
  "Mago": [
    { name: "Lanzamiento de Conjuros", type: "passive", unlockedAtLevel: 1, description: "Capacidad de preparar e inscribir hechizos en tu grimorio usando Inteligencia." },
    { name: "Recuperación Arcana", type: "active", unlockedAtLevel: 1, description: "Durante un descanso corto, recuperas espacios de conjuro cuyo nivel total sea <= la mitad de tu nivel de Mago.", usage: "1 uso por Descanso Largo" },
    { name: "Tradición Arcana", type: "passive", unlockedAtLevel: 2, description: "Eliges tu escuela de magia de especialización (Evocación, Abjuración, etc.)." },
    { name: "Aumento de Puntuación / Dote", type: "passive", unlockedAtLevel: 4, description: "Incrementas puntuaciones de atributo o seleccionas una dote." },
    { name: "Acción Arcana Avanzada", type: "passive", unlockedAtLevel: 5, description: "Acceso a conjuros poderosos de Nivel 3 (ej. Bola de Fuego)." }
  ],
  "Pícaro": [
    { name: "Ataque Furtivo (Sneak Attack)", type: "passive", unlockedAtLevel: 1, description: "Infliges daño adicional (1d6 a Nivel 1) si tienes ventaja o si un aliado está a 5 pies del objetivo." },
    { name: "Jerga de Ladrones", type: "passive", unlockedAtLevel: 1, description: "Conoces el lenguaje secreto de señas y códigos del submundo criminal." },
    { name: "Acción Astuta (Cunning Action)", type: "active", unlockedAtLevel: 2, description: "Puedes Usar Destrabarse, Esconderse o Correr como acción adicional en tu turno." },
    { name: "Arquetipo Picaresco", type: "passive", unlockedAtLevel: 3, description: "Eliges tu especialidad (Asesino, Ladrón o Embaucador Arcano)." },
    { name: "Esquiva Asombrosa (Uncanny Dodge)", type: "active", unlockedAtLevel: 5, description: "Usas tu reacción para reducir a la mitad el daño de un ataque que veas que te golpea." }
  ],
  "Clérigo": [
    { name: "Dominio Divino", type: "passive", unlockedAtLevel: 1, description: "Eliges la deidad y dominio de tu fe (Vida, Guerra, Luz, Tempestad)." },
    { name: "Canalizar Divinidad", type: "active", unlockedAtLevel: 2, description: "Expulsas muertos vivientes u obtienes el efecto especial de tu Dominio Divino.", usage: "1 uso por Descanso Corto" },
    { name: "Aumento de Puntuación / Dote", type: "passive", unlockedAtLevel: 4, description: "Incrementas puntuaciones de atributo o seleccionas una dote." },
    { name: "Destrucción de Muertos Vivientes", type: "passive", unlockedAtLevel: 5, description: "Al expulsar muertos vivientes de bajo nivel, son destruidos instantáneamente." }
  ],
  "Bardo": [
    { name: "Inspiración Bárdica", type: "active", unlockedAtLevel: 1, description: "Otorgas un d6 de inspiración a un aliado que puede sumar a una tirada de ataque, atributo o salvación.", usage: "Usos = Modificador de Carisma" },
    { name: "Todoterreno (Jack of All Trades)", type: "passive", unlockedAtLevel: 2, description: "Añades la mitad de tu bono de competencia a cualquier prueba de habilidad sin competencia." },
    { name: "Colegio Bárdico", type: "passive", unlockedAtLevel: 3, description: "Eliges tu colegio de especialización (Colegio del Valor, Colegio del Conocimiento)." },
    { name: "Fuente de Inspiración", type: "passive", unlockedAtLevel: 5, description: "Recuperas todos los usos de Inspiración Bárdica tras un Descanso Corto o Largo." }
  ]
};

export const getClassFeaturesForLevel = (className: string, level: number): ClassFeature[] => {
  const features = CLASS_FEATURES[className] || CLASS_FEATURES["Guerrero"];
  return features.filter(f => f.unlockedAtLevel <= level);
};
