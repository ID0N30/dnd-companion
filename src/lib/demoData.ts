import { CharacterState } from "@/store/useStore";
import { DirectMessage } from "@/lib/rooms";

export const DEMO_ROOM_ID = "demo_mesa_pruebas_sandbox";
export const DEMO_ROOM_NAME = "Mesa de Pruebas (Showcase & Sandbox)";
export const DEMO_DM_NAME = "Dungeon Master (Guía)";

export const createDrizztDemoCharacter = (): CharacterState => ({
  id: 'drizzt_dourden_demo',
  roomId: DEMO_ROOM_ID,
  name: "Drizzt Do'Urden",
  race: "Elfo Oscuro (Drow)",
  charClass: "Guerrero",
  background: "Héroe de los Reinos",
  level: 5,
  createdAt: 1700000000000,
  isOnline: true,
  lastSeen: Date.now(),
  inspiration: true,
  currency: { cp: 25, sp: 40, ep: 0, gp: 120, pp: 5 },
  hp: { current: 44, max: 44, temp: 0 },
  hitDice: { current: 5, max: 5, die: 10 },
  ac: 18,
  proficiencyBonus: 3,
  stats: { str: 14, dex: 20, con: 15, int: 14, wis: 16, cha: 14 },
  savingThrows: ["str", "con", "dex"],
  pinnedSkills: ["Atletismo", "Acrobacia", "Percepción", "Sigilo"],
  spellSlots: {
    1: { max: 2, current: 2 }
  },
  inventory: [
    { id: 'drizzt_item_1', name: 'Cimitarra Hielo (Icingdeath)', type: 'weapon', description: 'Cimitarra mágica legendaria (+1d6 daño de frío, absorbe fuego). Daño 1d6+5 cortante.', quantity: 1, damage: '1d6+5', equipped: true },
    { id: 'drizzt_item_2', name: 'Cimitarra Centello (Twinkle)', type: 'weapon', description: 'Cimitarra mágica élfica (+1 CA extra al defender). Daño 1d6+5 cortante.', quantity: 1, damage: '1d6+5', acBonus: 1, equipped: true },
    { id: 'drizzt_item_3', name: 'Arco Largo de Madera Élfica', type: 'weapon', description: 'Arco largo de madera fina. Daño 1d8+5 perforante a distancia.', quantity: 1, damage: '1d8+5', equipped: false },
    { id: 'drizzt_item_4', name: 'Malla de Mithral Drow', type: 'armor', description: 'Armadura ligera de mithral forjada en la Infraoscuridad. Bonificador +3 CA.', quantity: 1, acBonus: 3, equipped: true },
    { id: 'drizzt_item_5', name: 'Poción de Curación Mayor', type: 'consumable', description: 'Recupera 4d4 + 4 HP al consumirla.', quantity: 2, equipped: false },
    { id: 'drizzt_item_6', name: 'Figurilla de Guenhwyvar', type: 'quest', description: 'Estatuilla de ónice que invoca a la pantera astral Guenhwyvar.', quantity: 1, equipped: false }
  ],
  spells: [
    { id: 'drizzt_spell_1', name: "Fuego de Hada (Faerie Fire)", level: 1, school: "Evocación", description: "Rodea de luz mágica a los enemigos otorgando ventaja en ataques.", castingTime: "1 Acción" },
    { id: 'drizzt_spell_2', name: "Oscuridad Mágica (Darkness)", level: 2, school: "Evocación", description: "Esfera de 15 pies de oscuridad impenetrable.", castingTime: "1 Acción" }
  ],
  customClassFeatures: [
    { name: "Estilo Dos Armas", type: "passive", unlockedAtLevel: 1, description: "Añades tu modificador de atributo al daño del segundo ataque con cimitarra." },
    { name: "Segundo Aliento (Second Wind)", type: "active", unlockedAtLevel: 1, description: "Recuperas 1d10+5 HP como acción adicional.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Acción Oleada (Action Surge)", type: "active", unlockedAtLevel: 2, description: "Realizas una acción adicional en tu turno.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Visión en la Oscuridad Superior (Drow)", type: "passive", unlockedAtLevel: 1, description: "Ves en la oscuridad absoluta hasta 120 pies." }
  ],
  modifiers: [],
  isDying: false,
  isStable: false,
  deathSaves: { successes: 0, failures: 0 },
  isDead: false
});

export const createLyraDemoCharacter = (): CharacterState => ({
  id: 'demo_player_lyra',
  roomId: DEMO_ROOM_ID,
  name: "Lyra Brillacero",
  race: "Humana",
  charClass: "Clérigo",
  background: "Acólita de Lathander",
  level: 5,
  createdAt: 1700000001000,
  isOnline: true,
  lastSeen: Date.now(),
  inspiration: false,
  currency: { cp: 10, sp: 30, ep: 0, gp: 95, pp: 2 },
  hp: { current: 38, max: 38, temp: 0 },
  hitDice: { current: 5, max: 5, die: 8 },
  ac: 18,
  proficiencyBonus: 3,
  stats: { str: 14, dex: 10, con: 14, int: 10, wis: 18, cha: 12 },
  savingThrows: ["wis", "cha"],
  pinnedSkills: ["Medicina", "Religión", "Persuasión", "Perspicacia"],
  spellSlots: {
    1: { max: 4, current: 4 },
    2: { max: 3, current: 3 },
    3: { max: 2, current: 2 }
  },
  inventory: [
    { id: 'lyra_item_1', name: 'Maza Radiante (+1)', type: 'weapon', description: 'Maza sagrada bendecida por el Alba. Daño 1d6+3 contundente.', quantity: 1, damage: '1d6+3', equipped: true },
    { id: 'lyra_item_2', name: 'Escudo Sagrado de Lathander', type: 'armor', description: 'Escudo de acero pulido con el sol naciente. +2 CA.', quantity: 1, acBonus: 2, equipped: true },
    { id: 'lyra_item_3', name: 'Cota de Escamas Bendita', type: 'armor', description: 'Armadura intermedia protectora. CA base 14.', quantity: 1, acBonus: 2, equipped: true },
    { id: 'lyra_item_4', name: 'Símbolo Sagrado de Plata', type: 'general', description: 'Canalizador divino para conjuros del Dominio de la Luz.', quantity: 1, equipped: true },
    { id: 'lyra_item_5', name: 'Poción de Curación', type: 'consumable', description: 'Recupera 2d4 + 2 HP.', quantity: 3, equipped: false }
  ],
  spells: [
    { id: 'lyra_spell_1', name: "Curar Heridas (Cure Wounds)", level: 1, school: "Evocación", description: "Una criatura recupera 1d8 + Modificador de Sabiduría de HP.", castingTime: "1 Acción" },
    { id: 'lyra_spell_2', name: "Palabra de Curación", level: 1, school: "Evocación", description: "Cura 1d4 + Modificador de Sabiduría a distancia como acción adicional.", castingTime: "1 Acción Adicional" },
    { id: 'lyra_spell_3', name: "Arma Espiritual", level: 2, school: "Evocación", description: "Crea un arma espectral flotante que ataca infligiendo 1d8 de daño de fuerza.", castingTime: "1 Acción Adicional" },
    { id: 'lyra_spell_4', name: "Plegaria de Sanación", level: 2, school: "Evocación", description: "Cura hasta 6 criaturas aliadas 2d8 + Sabiduría fuera de combate.", castingTime: "10 Minutos" },
    { id: 'lyra_spell_5', name: "Revivir (Revivify)", level: 3, school: "Nigromancia", description: "Devuelve a la vida a una criatura muerta en el último minuto.", castingTime: "1 Acción" }
  ],
  customClassFeatures: [
    { name: "Canalizar Divinidad: Resplandor del Alba", type: "active", unlockedAtLevel: 2, description: "Inflige 2d10+5 de daño radiante a todos los enemigos a 30 pies y disipa oscuridad.", usage: "1 por Descanso Corto", maxUses: 1, currentUses: 1, resetOn: "short" },
    { name: "Llamarada Protectora", type: "active", unlockedAtLevel: 1, description: "Impones desventaja al ataque de un atacante como reacción.", usage: "4 por Descanso Largo", maxUses: 4, currentUses: 4, resetOn: "long" }
  ],
  modifiers: [],
  isDying: false,
  isStable: false,
  deathSaves: { successes: 0, failures: 0 },
  isDead: false
});

export const createVarisDemoCharacter = (): CharacterState => ({
  id: 'demo_player_varis',
  roomId: DEMO_ROOM_ID,
  name: "Varis Sombraluna",
  race: "Mediano Piesligeros",
  charClass: "Pícaro",
  background: "Bribón Callejero",
  level: 5,
  createdAt: 1700000002000,
  isOnline: true,
  lastSeen: Date.now(),
  inspiration: false,
  currency: { cp: 45, sp: 80, ep: 5, gp: 160, pp: 0 },
  hp: { current: 33, max: 33, temp: 0 },
  hitDice: { current: 5, max: 5, die: 8 },
  ac: 16,
  proficiencyBonus: 3,
  stats: { str: 8, dex: 18, con: 14, int: 12, wis: 12, cha: 14 },
  savingThrows: ["dex", "int"],
  pinnedSkills: ["Sigilo", "Juego de Manos", "Acrobacia", "Percepción", "Engaño"],
  spellSlots: {},
  inventory: [
    { id: 'varis_item_1', name: 'Daga Sombría Venenosa', type: 'weapon', description: 'Daga ligera y sutil. Daño 1d4+4 perforante más toxina paralizante.', quantity: 2, damage: '1d4+4', equipped: true },
    { id: 'varis_item_2', name: 'Arco Corto del Francotirador', type: 'weapon', description: 'Arco de madera oscura con mira grabada. Daño 1d6+4.', quantity: 1, damage: '1d6+4', equipped: false },
    { id: 'varis_item_3', name: 'Cuero Tachonado Sombrío', type: 'armor', description: 'Armadura ligera que absorbe la luz. CA 12 + DES.', quantity: 1, acBonus: 2, equipped: true },
    { id: 'varis_item_4', name: 'Herramientas de Ladrón de Maestro', type: 'general', description: 'Ganzúas y tensores de acero enano para cerraduras complejas.', quantity: 1, equipped: true },
    { id: 'varis_item_5', name: 'Bomba de Humo Fugaz', type: 'consumable', description: 'Crea una nube de humo espeso permitiendo ocultarse al instante.', quantity: 2, equipped: false }
  ],
  spells: [],
  customClassFeatures: [
    { name: "Ataque Furtivo (Sneak Attack)", type: "passive", unlockedAtLevel: 1, description: "Inflige +3d6 de daño adicional a un objetivo si tienes ventaja o un aliado a 5 pies." },
    { name: "Acción Astuta (Cunning Action)", type: "passive", unlockedAtLevel: 2, description: "Puedes Correr, Retirarte o Esconderte como Acción Adicional en tu turno." },
    { name: "Esquiva Asombrosa (Uncanny Dodge)", type: "active", unlockedAtLevel: 5, description: "Reduces a la mitad el daño de un ataque que puedas ver usando tu reacción." }
  ],
  modifiers: [],
  isDying: false,
  isStable: false,
  deathSaves: { successes: 0, failures: 0 },
  isDead: false
});

export const createElidorisDemoCharacter = (): CharacterState => ({
  id: 'demo_player_elidoris',
  roomId: DEMO_ROOM_ID,
  name: "Elidoris Vane",
  race: "Semielfo",
  charClass: "Mago",
  background: "Erudito de Candelero",
  level: 5,
  createdAt: 1700000003000,
  isOnline: true,
  lastSeen: Date.now(),
  inspiration: false,
  currency: { cp: 15, sp: 20, ep: 0, gp: 210, pp: 8 },
  hp: { current: 28, max: 28, temp: 0 },
  hitDice: { current: 5, max: 5, die: 6 },
  ac: 12,
  proficiencyBonus: 3,
  stats: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 12 },
  savingThrows: ["int", "wis"],
  pinnedSkills: ["Arcana", "Historia", "Investigación", "Percepción"],
  spellSlots: {
    1: { max: 4, current: 4 },
    2: { max: 3, current: 3 },
    3: { max: 2, current: 2 }
  },
  inventory: [
    { id: 'elidoris_item_1', name: 'Bastón de Ébano Crepitante', type: 'weapon', description: 'Canalizador mágico que añade +1 a las tiradas de ataque de conjuro. Daño 1d6 contundente.', quantity: 1, damage: '1d6', equipped: true },
    { id: 'elidoris_item_2', name: 'Túnica de Tejido Estelar', type: 'armor', description: 'Túnica de seda mágica con runas que brillan en la penumbra. CA 10 + DES.', quantity: 1, acBonus: 0, equipped: true },
    { id: 'elidoris_item_3', name: 'Grimorio de Hechizos Encarnado', type: 'general', description: 'Libro encuadernado en piel de dragón con fórmulas arcanas.', quantity: 1, equipped: true },
    { id: 'elidoris_item_4', name: 'Perla de Poder (Pearl of Power)', type: 'general', description: 'Permite recuperar una ranura de conjuro gastada de hasta nivel 3.', quantity: 1, equipped: false },
    { id: 'elidoris_item_5', name: 'Poción de Invisibilidad Menor', type: 'consumable', description: 'Concede invisibilidad durante 1 minuto o hasta atacar.', quantity: 1, equipped: false }
  ],
  spells: [
    { id: 'elidoris_spell_1', name: "Escudo Arcano (Shield)", level: 1, school: "Abjuración", description: "Otorga +5 a la CA como reacción contra un ataque que iba a impactarte.", castingTime: "1 Reacción" },
    { id: 'elidoris_spell_2', name: "Proyectil Mágico", level: 1, school: "Evocación", description: "Crea 3 dardos de fuerza que impactan automáticamente infligiendo 1d4+1 cada uno.", castingTime: "1 Acción" },
    { id: 'elidoris_spell_3', name: "Paso Brumoso (Misty Step)", level: 2, school: "Conjuración", description: "Te teletransportas hasta 30 pies a un espacio desocupado que puedas ver.", castingTime: "1 Acción Adicional" },
    { id: 'elidoris_spell_4', name: "Bola de Fuego (Fireball)", level: 3, school: "Evocación", description: "Explosión ígnea de 20 pies de radio que inflige 8d6 de daño de fuego.", castingTime: "1 Acción" },
    { id: 'elidoris_spell_5', name: "Contrahechizo (Counterspell)", level: 3, school: "Abjuración", description: "Interrumpe el conjuro de una criatura que esté lanzando magia a 60 pies.", castingTime: "1 Reacción" }
  ],
  customClassFeatures: [
    { name: "Esculpir Conjuros (Evocación)", type: "passive", unlockedAtLevel: 2, description: "Tus aliados tienen éxito automático en salvaciones de tus conjuros de área y no reciben daño." },
    { name: "Recuperación Arcana", type: "active", unlockedAtLevel: 1, description: "Recuperas ranuras de conjuro de nivel acumulado 3 tras un descanso corto.", usage: "1 por Día", maxUses: 1, currentUses: 1, resetOn: "long" }
  ],
  modifiers: [],
  isDying: false,
  isStable: false,
  deathSaves: { successes: 0, failures: 0 },
  isDead: false
});

/**
 * Returns a pristine, fully independent deep copy of the 4 iconic characters
 */
export const getFactoryDemoParty = (): CharacterState[] => [
  createDrizztDemoCharacter(),
  createLyraDemoCharacter(),
  createVarisDemoCharacter(),
  createElidorisDemoCharacter()
];

export const DEMO_INITIAL_MESSAGES: DirectMessage[] = [
  {
    id: 'demo_msg_1',
    senderId: 'demo_player_lyra',
    senderName: 'Lyra',
    characterName: 'Lyra Brillacero',
    content: 'Tengo dos ranuras preparadas para curar al frente en cuanto empiece el combate.',
    timestamp: Date.now() - 360000,
    read: true
  },
  {
    id: 'demo_msg_2',
    senderId: 'demo_player_varis',
    senderName: 'Varis',
    characterName: 'Varis Sombraluna',
    content: 'DM, he inspeccionado la entrada de la caverna: hay huellas frescas de trasgos y una trampa de alambre tensado.',
    timestamp: Date.now() - 180000,
    read: true
  },
  {
    id: 'demo_msg_3',
    senderId: 'dm',
    senderName: 'Dungeon Master',
    characterName: "Dungeon Master",
    content: 'Drizzt, tu percepción pasiva de 16 te alerta de un brillo metálico detrás de las estalagmitas. ¿Avanzas sigiloso?',
    timestamp: Date.now() - 60000,
    read: false
  }
];

export const DEMO_INITIAL_LOGS: string[] = [
  "🛡️ D&D Companion: Sesión iniciada en la Mesa de Pruebas (Modo Sandbox).",
  "⚔️ Drizzt Do'Urden desenvaina a Hielo y Centello con destreza letal.",
  "✨ Lyra canaliza el poder de Lathander y bendice la expedición.",
  "🔍 Varis Sombraluna detecta una trampa con tirada de Percepción (21).",
  "🔥 Elidoris prepara sus fórmulas arcanas en el grimorio."
];
