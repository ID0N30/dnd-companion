export type ClassFeature = {
  name: string;
  type: 'active' | 'passive';
  unlockedAtLevel: number;
  description: string;
  usage?: string;
  maxUses?: number;
  currentUses?: number;
  resetOn?: 'short' | 'long' | 'none';
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
    { name: "Segundo Aliento (Second Wind)", type: "active", unlockedAtLevel: 1, description: "Recuperas 1d10 + nivel de Guerrero de vida como acción adicional.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Acción Oleada (Action Surge)", type: "active", unlockedAtLevel: 2, description: "Puedes realizar una acción adicional durante tu turno.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Arquetipo Marcial", type: "passive", unlockedAtLevel: 3, description: "Eliges tu especialidad (Campeón, Maestro de Batalla o Caballero Arcano)." },
    { name: "Aumento de Puntuación / Dote", type: "passive", unlockedAtLevel: 4, description: "Incrementas puntuaciones de atributo o seleccionas una dote." },
    { name: "Ataque Extra", type: "passive", unlockedAtLevel: 5, description: "Puedes atacar dos veces en lugar de una cuando realizas la acción de Atacar." }
  ],
  "Mago": [
    { name: "Lanzamiento de Conjuros", type: "passive", unlockedAtLevel: 1, description: "Capacidad de preparar e inscribir hechizos en tu grimorio usando Inteligencia." },
    { name: "Recuperación Arcana", type: "active", unlockedAtLevel: 1, description: "Durante un descanso corto, recuperas espacios de conjuro cuyo nivel total sea <= la mitad de tu nivel de Mago.", usage: "1 por Descanso Largo", maxUses: 1, currentUses: 1, resetOn: "long" },
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
    { name: "Canalizar Divinidad", type: "active", unlockedAtLevel: 2, description: "Expulsas muertos vivientes u obtienes el efecto especial de tu Dominio Divino.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Aumento de Puntuación / Dote", type: "passive", unlockedAtLevel: 4, description: "Incrementas puntuaciones de atributo o seleccionas una dote." },
    { name: "Destrucción de Muertos Vivientes", type: "passive", unlockedAtLevel: 5, description: "Al expulsar muertos vivientes de bajo nivel, son destruidos instantáneamente." }
  ],
  "Bardo": [
    { name: "Inspiración Bárdica", type: "active", unlockedAtLevel: 1, description: "Otorgas un d6 de inspiración a un aliado que puede sumar a una tirada de ataque, atributo o salvación.", usage: "3 por Descanso Largo", maxUses: 3, currentUses: 3, resetOn: "long" },
    { name: "Todoterreno (Jack of All Trades)", type: "passive", unlockedAtLevel: 2, description: "Añades la mitad de tu bono de competencia a cualquier prueba de habilidad sin competencia." },
    { name: "Colegio Bárdico", type: "passive", unlockedAtLevel: 3, description: "Eliges tu colegio de especialización (Colegio del Valor, Colegio del Conocimiento)." },
    { name: "Fuente de Inspiración", type: "passive", unlockedAtLevel: 5, description: "Recuperas todos los usos de Inspiración Bárdica tras un Descanso Corto o Largo." }
  ]
};

export const getClassFeaturesForLevel = (className: string, level: number): ClassFeature[] => {
  const features = CLASS_FEATURES[className] || CLASS_FEATURES["Guerrero"];
  return features.filter(f => f.unlockedAtLevel <= level);
};

// Official D&D 5e Starting Equipment by Class
export const CLASS_STARTING_EQUIPMENT: Record<string, Array<{
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'general';
  description: string;
  quantity: number;
  damage?: string;
  acBonus?: number;
  equipped?: boolean;
}>> = {
  "Guerrero": [
    { name: 'Espada Larga', type: 'weapon', description: 'Arma marcial cuerpo a cuerpo. Daño 1d8 cortante.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Escudo', type: 'armor', description: 'Otorga +2 a la Clase de Armadura.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Cota de Malla', type: 'armor', description: 'Armadura pesada. Bonificador +6 CA.', quantity: 1, acBonus: 6, equipped: true },
    { name: 'Ballesta Pesada', type: 'weapon', description: 'Arma a distancia. Daño 1d10 perforante.', quantity: 1, damage: '1d10', equipped: false },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP al consumirla.', quantity: 2, equipped: false }
  ],
  "Mago": [
    { name: 'Bastón Mágico', type: 'weapon', description: 'Foco arcano y arma simple. Daño 1d6 contundente.', quantity: 1, damage: '1d6', equipped: true },
    { name: 'Grimorio de Hechizos', type: 'general', description: 'Libro de cuero con inscripciones mágicas de conjuros.', quantity: 1, equipped: false },
    { name: 'Túnica Arcana', type: 'armor', description: 'Vestimenta de tela reforzada. Bonificador +1 CA.', quantity: 1, acBonus: 1, equipped: true },
    { name: 'Daga de Acero', type: 'weapon', description: 'Arma sutil. Daño 1d4 perforante.', quantity: 1, damage: '1d4', equipped: false },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP al consumirla.', quantity: 2, equipped: false }
  ],
  "Pícaro": [
    { name: 'Ropera (Estoque)', type: 'weapon', description: 'Arma sutil. Daño 1d8 perforante.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Arco Corto', type: 'weapon', description: 'Arma a distancia. Daño 1d6 perforante.', quantity: 1, damage: '1d6', equipped: false },
    { name: 'Armadura de Cuero', type: 'armor', description: 'Armadura ligera. Bonificador +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Daga', type: 'weapon', description: 'Arma arrojadiza/sutil. Daño 1d4 perforante.', quantity: 2, damage: '1d4', equipped: true },
    { name: 'Herramientas de Ladrón', type: 'general', description: 'Ganzúas y herramientas para forzar cerraduras.', quantity: 1, equipped: false }
  ],
  "Clérigo": [
    { name: 'Maza de Hierro', type: 'weapon', description: 'Arma simple. Daño 1d6 contundente.', quantity: 1, damage: '1d6', equipped: true },
    { name: 'Escudo Sagrado', type: 'armor', description: 'Escudo con el símbolo sagrado de tu deidad. Bonificador +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Cota de Escamas', type: 'armor', description: 'Armadura media. Bonificador +4 CA.', quantity: 1, acBonus: 4, equipped: true },
    { name: 'Símbolo Sagrado', type: 'general', description: 'Canalizador divino para lanzar conjuros sagrados.', quantity: 1, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP al consumirla.', quantity: 2, equipped: false }
  ],
  "Bardo": [
    { name: 'Estoque', type: 'weapon', description: 'Arma elegante sutil. Daño 1d8 perforante.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Laúd Mágico', type: 'general', description: 'Instrumento musical y foco para lanzar conjuros bárdicos.', quantity: 1, equipped: true },
    { name: 'Armadura de Cuero', type: 'armor', description: 'Armadura ligera. Bonificador +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Daga', type: 'weapon', description: 'Daño 1d4 perforante.', quantity: 1, damage: '1d4', equipped: false },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Bárbaro": [
    { name: 'Gran Hacha', type: 'weapon', description: 'Arma a dos manos devastadora. Daño 1d12 cortante.', quantity: 1, damage: '1d12', equipped: true },
    { name: 'Hacha de Mano', type: 'weapon', description: 'Arma arrojadiza. Daño 1d6 cortante.', quantity: 2, damage: '1d6', equipped: false },
    { name: 'Pieles de Cazador', type: 'armor', description: 'Atavío salvaje. Bonificador +1 CA.', quantity: 1, acBonus: 1, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Paladín": [
    { name: 'Espada Larga', type: 'weapon', description: 'Arma marcial. Daño 1d8 cortante.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Escudo del Juramento', type: 'armor', description: 'Escudo bendito. Bonificador +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Cota de Malla', type: 'armor', description: 'Armadura pesada. Bonificador +6 CA.', quantity: 1, acBonus: 6, equipped: true },
    { name: 'Símbolo Sagrado', type: 'general', description: 'Foco para milagros divinos.', quantity: 1, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Explorador": [
    { name: 'Arco Largo', type: 'weapon', description: 'Arma marcial a distancia. Daño 1d8 perforante.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Espada Corta', type: 'weapon', description: 'Daño 1d6 perforante.', quantity: 2, damage: '1d6', equipped: true },
    { name: 'Armadura de Cuero Tachonado', type: 'armor', description: 'Armadura ligera. Bonificador +3 CA.', quantity: 1, acBonus: 3, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Brujo": [
    { name: 'Gradiante Arcano / Varita', type: 'weapon', description: 'Foco de tu Patrón Extranatural. Daño 1d6 mágico.', quantity: 1, damage: '1d6', equipped: true },
    { name: 'Armadura de Cuero', type: 'armor', description: 'Bonificador +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { name: 'Daga de Pacto', type: 'weapon', description: 'Daño 1d4 perforante.', quantity: 1, damage: '1d4', equipped: false },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Hechicero": [
    { name: 'Bastón Mágico', type: 'weapon', description: 'Foco para tu magia innata. Daño 1d6 contundente.', quantity: 1, damage: '1d6', equipped: true },
    { name: 'Daga', type: 'weapon', description: 'Daño 1d4 perforante.', quantity: 2, damage: '1d4', equipped: false },
    { name: 'Túnica del Caos', type: 'armor', description: 'Bonificador +1 CA.', quantity: 1, acBonus: 1, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ],
  "Monje": [
    { name: 'Lanza', type: 'weapon', description: 'Arma versátil. Daño 1d6 / 1d8 contundente.', quantity: 1, damage: '1d8', equipped: true },
    { name: 'Dardos de Monasterio', type: 'weapon', description: 'Arma a distancia simple. Daño 1d4 perforante.', quantity: 10, damage: '1d4', equipped: false },
    { name: 'Atavío de Meditación', type: 'armor', description: 'Ropaje monacal. Defensa sin armadura (Mod DES + Mod SAB).', quantity: 1, acBonus: 0, equipped: true },
    { name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 2, equipped: false }
  ]
};

// Official D&D 5e Starting Spells by Class (Level 1 Spellcasters)
export const CLASS_STARTING_SPELLS: Record<string, Array<{
  name: string;
  level: number;
  school: string;
  description: string;
  castingTime: string;
}>> = {
  "Mago": [
    { name: "Proyectil Mágico (Magic Missile)", level: 1, school: "Evocación", description: "Creas 3 dardos luminosos que impactan automáticamente infligiendo 1d4+1 daño de fuerza cada uno.", castingTime: "1 Acción" },
    { name: "Manos Ardientes (Burning Hands)", level: 1, school: "Evocación", description: "Un cono de llamas de 15 pies inflige 3d6 daño de fuego (Salvaguardia DES reduce a la mitad).", castingTime: "1 Acción" },
    { name: "Escudo Mágico (Shield)", level: 1, school: "Abjuración", description: "Una barrera invisible te otorga +5 CA hasta tu próximo turno.", castingTime: "1 Reacción" }
  ],
  "Clérigo": [
    { name: "Curar Heridas (Cure Wounds)", level: 1, school: "Evocación", description: "Una criatura que toques recupera 1d8 + Modificador de Sabiduría en HP.", castingTime: "1 Acción" },
    { name: "Bendición (Bless)", level: 1, school: "Encantamiento", description: "Bendices a hasta 3 aliados. Suman 1d4 a sus tiradas de ataque y salvaciones.", castingTime: "1 Acción" },
    { name: "Escudo de la Fe (Shield of Faith)", level: 1, school: "Abjuración", description: "Un campo de fuerza otorga +2 CA a una criatura durante la concentración.", castingTime: "1 Acción Adicional" }
  ],
  "Bardo": [
    { name: "Palabra de Curación (Healing Word)", level: 1, school: "Evocación", description: "Un aliado a 60 pies recupera 1d4 + Mod de Carisma HP.", castingTime: "1 Acción Adicional" },
    { name: "Risita Horrible de Tasha", level: 1, school: "Encantamiento", description: "El objetivo cae derribado riendo incontrolablemente (Salvaguardia SAB).", castingTime: "1 Acción" },
    { name: "Onda Thronante (Thunderwave)", level: 1, school: "Evocación", description: "Una ola de fuerza empuja 10 pies a las criaturas infligiendo 2d8 daño truenos.", castingTime: "1 Acción" }
  ],
  "Paladín": [
    { name: "Imposición de Manos (Lay on Hands)", level: 1, school: "Abjuración", description: "Sanación divina por toque de tu reserva de poder.", castingTime: "1 Acción" },
    { name: "Heroísmo (Heroism)", level: 1, school: "Encantamiento", description: "Un aliado es inmune al miedo y gana HP temporales cada turno.", castingTime: "1 Acción" }
  ],
  "Brujo": [
    { name: "Descarga Escalofriante (Eldritch Blast)", level: 1, school: "Evocación", description: "Un rayo de energía arcana inflige 1d10 daño de fuerza a distancia.", castingTime: "1 Acción" },
    { name: "Reprensión Infernal (Hellish Rebuke)", level: 1, school: "Evocación", description: "Rodeas de llamas al enemigo que te atacó infligiendo 2d10 daño de fuego.", castingTime: "1 Reacción" }
  ],
  "Hechicero": [
    { name: "Descarga de Caos (Chaos Bolt)", level: 1, school: "Evocación", description: "Lanzas una masa de energía caótica que inflige 2d8 + 1d6 daño elemental.", castingTime: "1 Acción" },
    { name: "Orbe Cromático (Chromatic Orb)", level: 1, school: "Evocación", description: "Lanzas una esfera del elemento que elijas (3d8 daño).", castingTime: "1 Acción" }
  ],
  "Explorador": [
    { name: "Marca del Cazador (Hunter's Mark)", level: 1, school: "Adivinación", description: "Designas un objetivo. Le infliges 1d6 daño adicional al golpear.", castingTime: "1 Acción Adicional" },
    { name: "Curar Heridas (Cure Wounds)", level: 1, school: "Evocación", description: "Recuperas 1d8 + Mod SAB HP a un aliado.", castingTime: "1 Acción" }
  ]
};

