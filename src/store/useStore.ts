import { create } from 'zustand';
import { CLASS_SAVING_THROWS, calculateMaxHP, ClassFeature, CLASS_HIT_DIE, CLASS_STARTING_EQUIPMENT, CLASS_STARTING_SPELLS, getClassFeaturesForLevel, calculateLevelUpHPGain, getFixedHitDieValue } from "@/lib/dndClassFeatures";
import { triggerDiceRoll } from "@/components/DiceRoller";
import { addRoomLog, updateRoomState, savePlayerInRoom, deletePlayerFromRoom } from "@/lib/rooms";
import { auth } from "@/lib/firebase";
import { getFactoryDemoParty } from "@/lib/demoData";

export type Modifier = {
  id: string;
  name: string; 
  description: string;
  duration: number | null; // null = permanent
  targetStat?: string; 
  value?: number; 
};

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'quest' | 'general';

export type Item = {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  quantity: number;
  damage?: string;
  acBonus?: number;
  equipped?: boolean;
  isTemporary?: boolean;
  isConsumed?: boolean;
  duration?: number | null;
};

export type Spell = {
  id: string;
  name: string;
  level: number; 
  school?: string;
  description: string;
  castingTime?: string;
};

export type SpellSlot = {
  max: number;
  current: number;
};

export type LogEntry = {
  id: string;
  message: string;
  timestamp: number;
};

export type InitiativeRoll = {
  die: number;
  dexMod: number;
  total: number;
};

export type DeathSaves = {
  successes: number;
  failures: number;
};

export type Currency = {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
};

export type PersonalNote = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  pinned?: boolean;
};

export const SKILLS_5E = [
  { name: "Atletismo", stat: "str" },
  { name: "Acrobacia", stat: "dex" },
  { name: "Juego de Manos", stat: "dex" },
  { name: "Sigilo", stat: "dex" },
  { name: "Arcanos", stat: "int" },
  { name: "Historia", stat: "int" },
  { name: "Investigación", stat: "int" },
  { name: "Naturaleza", stat: "int" },
  { name: "Religión", stat: "int" },
  { name: "Trato con Animales", stat: "wis" },
  { name: "Perspicacia", stat: "wis" },
  { name: "Medicina", stat: "wis" },
  { name: "Percepción", stat: "wis" },
  { name: "Supervivencia", stat: "wis" },
  { name: "Engaño", stat: "cha" },
  { name: "Intimidación", stat: "cha" },
  { name: "Interpretación", stat: "cha" },
  { name: "Persuasión", stat: "cha" },
] as const;

export type CharacterState = {
  id: string;
  name: string;
  race: string;
  charClass: string;
  background: string;
  level: number;
  roomId?: string;
  ownerId?: string;
  ownerName?: string;
  inspiration?: boolean;
  currency?: Currency;
  notes?: PersonalNote[];
  hp: { current: number; max: number; temp: number };
  hitDice?: { current: number; max: number; die: number };
  ac: number;
  proficiencyBonus: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  savingThrows: string[]; 
  pinnedSkills: string[];
  spellSlots: Record<number, SpellSlot>;
  inventory: Item[];
  spells: Spell[];
  customClassFeatures?: ClassFeature[];
  modifiers: Modifier[];
  initiative?: InitiativeRoll;
  isDying?: boolean;
  isStable?: boolean;
  deathSaves?: DeathSaves;
  isDead?: boolean;
  createdAt?: number;
  isOnline?: boolean;
  lastSeen?: number;
};

export const getClassOptimizedStats = (charClass: string) => {
  const norm = (charClass || '').toLowerCase().trim();
  const saves = CLASS_SAVING_THROWS[charClass] || ['str', 'con'];

  if (norm.includes('mago')) {
    return { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 };
  } else if (norm.includes('hechicero') || norm.includes('brujo')) {
    return { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 };
  } else if (norm.includes('bardo')) {
    return { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 };
  } else if (norm.includes('pícaro') || norm.includes('explorador')) {
    return { str: 8, dex: 16, con: 14, int: 12, wis: 14, cha: 10 };
  } else if (norm.includes('monje')) {
    return { str: 10, dex: 16, con: 14, int: 8, wis: 14, cha: 10 };
  } else if (norm.includes('clérigo')) {
    return { str: 14, dex: 10, con: 14, int: 8, wis: 16, cha: 12 };
  } else if (norm.includes('paladín')) {
    return { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 14 };
  } else if (norm.includes('bárbaro')) {
    return { str: 16, dex: 14, con: 14, int: 8, wis: 10, cha: 10 };
  }
  
  // Default Guerrero / General Heavy
  const primary = saves[0] || 'str';
  const secondary = saves[1] || 'con';
  const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  (stats as any)[primary] = 16;
  (stats as any)[secondary] = 14;
  if (stats.con < 14) stats.con = 14;
  if (stats.dex < 12 && primary !== 'dex') stats.dex = 12;
  return stats;
};

export const isDemoPlayer = (playerId?: string): boolean => {
  if (!playerId) return false;
  return playerId.startsWith('demo_') || playerId === 'drizzt_dourden_demo';
};

// Safe LocalStorage helpers for all characters across campaigns
export const syncAllLocalPlayersToStorage = (updatedCharacters: CharacterState[]) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('dnd_all_local_players');
    const existing: CharacterState[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, CharacterState>();
    if (Array.isArray(existing)) {
      existing.forEach(p => {
        if (p && p.id && !isDemoPlayer(p.id)) map.set(p.id, p);
      });
    }
    updatedCharacters.forEach(p => {
      if (p && p.id && !isDemoPlayer(p.id)) {
        map.set(p.id, p);
      }
    });
    localStorage.setItem('dnd_all_local_players', JSON.stringify(Array.from(map.values())));
  } catch (e) {}
};

export const removeLocalPlayerFromStorage = (characterId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('dnd_all_local_players');
    if (!raw) return;
    const existing: CharacterState[] = JSON.parse(raw);
    if (Array.isArray(existing)) {
      const filtered = existing.filter(p => p.id !== characterId);
      localStorage.setItem('dnd_all_local_players', JSON.stringify(filtered));
    }
  } catch (e) {}
};

// Centralized character persistence across local and remote storage
export const persistCharacterChanges = (character: CharacterState, forceRemoteWrite: boolean = true) => {
  if (!character || !character.id || isDemoPlayer(character.id)) return;

  // 1. Always persist to localStorage for offline access and page reload/rehydration
  syncAllLocalPlayersToStorage([character]);

  // 2. If character is assigned to a real campaign room, immediately persist to Firestore
  let targetRoomId = character.roomId;
  if ((!targetRoomId || targetRoomId === 'sin_campaña') && typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/room\/([^\/]+)/);
    if (match && match[1]) {
      targetRoomId = match[1];
      character.roomId = targetRoomId;
    }
  }

  if (targetRoomId && targetRoomId !== 'sin_campaña') {
    savePlayerInRoom(targetRoomId, character, forceRemoteWrite);
  }
};

// Helper to get hit dice pool safely for any character
export const getCharacterHitDice = (player: CharacterState): { current: number; max: number; die: number } => {
  const die = CLASS_HIT_DIE[player.charClass] || 8;
  const max = player.level || 1;
  if (!player.hitDice) {
    return { current: max, max, die };
  }
  return {
    current: typeof player.hitDice.current === 'number' ? player.hitDice.current : max,
    max: typeof player.hitDice.max === 'number' ? player.hitDice.max : max,
    die: player.hitDice.die || die
  };
};

// D&D 5e: Retroactive Constitution Modifier calculation
// If CON score changes, Hit Points update retroactively (+1 HP per level for each CON mod point changed)
export const applyRetroactiveConstitutionChange = (
  player: CharacterState,
  newConScore: number
): { hp: CharacterState['hp']; stats: CharacterState['stats']; hpDelta: number } => {
  const oldCon = player.stats.con;
  const oldMod = Math.floor((oldCon - 10) / 2);
  const newMod = Math.floor((newConScore - 10) / 2);
  const modDelta = newMod - oldMod;
  const hpDelta = modDelta * player.level;

  const newStats = { ...player.stats, con: newConScore };
  if (hpDelta === 0) {
    return { hp: player.hp, stats: newStats, hpDelta: 0 };
  }

  // D&D 5e: Max HP cannot drop below player.level (minimum 1 HP per level)
  const newMax = Math.max(player.level, player.hp.max + hpDelta);
  let newCurr = player.hp.current + hpDelta;
  if (player.hp.current > 0) {
    newCurr = Math.max(1, Math.min(newMax, newCurr));
  } else {
    newCurr = 0;
  }

  return {
    stats: newStats,
    hp: {
      ...player.hp,
      max: newMax,
      current: newCurr
    },
    hpDelta
  };
};

export const createDefaultCharacter = (
  id: string, 
  name: string, 
  race: string, 
  charClass: string, 
  background: string,
  level: number = 1,
  stats?: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  ownerId?: string,
  ownerName?: string,
  roomId?: string
): CharacterState => {
  const finalStats = stats || getClassOptimizedStats(charClass || "Guerrero");
  const officialHP = calculateMaxHP(charClass || "Guerrero", level, finalStats.con);
  const officialProfBonus = Math.floor((level - 1) / 4) + 2;
  const officialSaveTypes = CLASS_SAVING_THROWS[charClass || "Guerrero"] || ["str", "con"];

  const defaultItems = CLASS_STARTING_EQUIPMENT[charClass] || CLASS_STARTING_EQUIPMENT["Guerrero"] || [];
  const initialInventory: Item[] = defaultItems.map((item, idx) => ({
    id: 'item_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
    ...item
  }));

  const defaultSpells = CLASS_STARTING_SPELLS[charClass] || [];
  const initialSpells: Spell[] = defaultSpells.map((spell, idx) => ({
    id: 'spell_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
    ...spell
  }));

  return {
    id,
    name,
    race,
    charClass,
    background,
    level,
    roomId,
    ownerId,
    ownerName,
    createdAt: Date.now(),
    isOnline: true,
    lastSeen: Date.now(),
    inspiration: false,
    currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
    hp: { current: officialHP, max: officialHP, temp: 0 },
    hitDice: { current: level, max: level, die: CLASS_HIT_DIE[charClass] || CLASS_HIT_DIE["Guerrero"] || 8 },
    ac: 10 + Math.floor((finalStats.dex - 10) / 2),
    proficiencyBonus: officialProfBonus,
    stats: finalStats,
    savingThrows: officialSaveTypes,
    pinnedSkills: [],
    spellSlots: {
      1: { max: 2, current: 2 }
    },
    inventory: initialInventory,
    spells: initialSpells,
    customClassFeatures: [],
    modifiers: [],
    isDying: false,
    isStable: false,
    deathSaves: { successes: 0, failures: 0 },
    isDead: false
  };
};

export const createFamousDrizztCharacter = (): CharacterState => ({
  id: 'drizzt_dourden_demo',
  name: "Drizzt Do'Urden",
  race: "Elfo Oscuro (Drow)",
  charClass: "Guerrero",
  background: "Héroe de los Reinos",
  level: 5,
  createdAt: Date.now(),
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
    { id: 'drizzt_item_3', name: 'Arco Largo de Cimitarra', type: 'weapon', description: 'Arco largo de madera fina. Daño 1d8+5 perforante a distancia.', quantity: 1, damage: '1d8+5', equipped: false },
    { id: 'drizzt_item_4', name: 'Malla de Mithral Drow', type: 'armor', description: 'Armadura ligera de mithral forjada en la Infraoscuridad. Bonificador +3 CA.', quantity: 1, acBonus: 3, equipped: true },
    { id: 'drizzt_item_5', name: 'Poción de Curación Suprema', type: 'consumable', description: 'Recupera 4d4 + 4 HP al consumirla.', quantity: 2, equipped: false },
    { id: 'drizzt_item_6', name: 'Figurilla de Guenhwyvar', type: 'quest', description: 'Estatuilla de ónice que invoca a la Pantera Astral Guenhwyvar.', quantity: 1, equipped: false }
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

export type LevelUpEvent = {
  id: string;
  timestamp: number;
  playerId?: string;
  targetPlayerIds?: string[];
  playerName?: string;
  newLevel: number;
  oldLevel: number;
};

export type NotificationModalState = {
  open: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'danger';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
};

export interface StoreState {
  activeNotification: NotificationModalState | null;
  showAlert: (message: string, title?: string, type?: 'info' | 'warning' | 'success' | 'danger') => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, confirmText?: string, cancelText?: string) => void;
  closeNotification: () => void;

  isCombatMode: boolean;
  initiativeOrder: string[];
  currentTurnIndex: number;
  toggleCombatMode: (status?: boolean, targetRoomId?: string, selectedPlayerIds?: string[]) => void;
  advanceTurn: (targetRoomId?: string) => void;
  
  players: CharacterState[];
  activePlayerId: string;
  setActivePlayerId: (id: string) => void;
  createCharacter: (name: string, race: string, charClass: string, background: string, level?: number, stats?: any, ownerId?: string, ownerName?: string, roomId?: string) => string;
  loadFamousDemoCharacter: () => string;
  loadDemoSandboxParty: () => string;
  resetDemoSandbox: () => void;
  updateActiveCharacter: (updates: Partial<CharacterState>) => void;
  toggleInspiration: (playerId?: string, status?: boolean) => void;
  updateStat: (stat: string, value: number, isPermanent: boolean, duration?: number) => void;
  setBaseStatScore: (stat: string, score: number) => void;
  updatePlayerStatsByDM: (playerId: string, stats: Partial<CharacterState['stats']>) => void;
  updatePlayerHPByDM: (playerId: string, hpUpdates: Partial<CharacterState['hp']>) => void;
  addItemToPlayer: (playerId: string, item: Item, targetRoomId?: string) => void;
  removeItemFromPlayer: (playerId: string, itemId: string) => void;
  addSpellToPlayer: (playerId: string, spell: Spell) => void;
  removeSpellToPlayer: (playerId: string, spellId: string) => void;
  addCustomClassFeature: (feature: ClassFeature) => void;
  updateCustomClassFeature: (oldName: string, feature: ClassFeature) => void;
  removeCustomClassFeature: (featureName: string) => void;
  modifyHPMax: (amount: number, isPermanent: boolean, duration?: number) => void;
  modifyHPCurrent: (amount: number) => void;
  rollDeathSave: (playerId?: string, onExitModal?: (modalData: { type: 'salvation' | 'death' | 'moribundo'; title: string; desc: string }) => void) => void;
  stabilizePlayer: (playerId?: string, healHP?: number) => void;
  togglePlayerDeath: (playerId: string, status?: boolean) => void;
  modifyAC: (amount: number, isPermanent: boolean, duration?: number) => void;
  togglePinSkill: (skillName: string, playerId?: string) => void;
  toggleEquipItem: (itemId: string, playerId?: string) => void;
  useSpellSlot: (level: number) => void;
  restoreSpellSlot: (level: number) => void;
  setSpellSlotMax: (level: number, max: number) => void;
  spendHitDie: (playerId?: string) => void;
  shortRest: (playerId?: string) => void;
  longRest: (playerId?: string) => void;
  useClassFeature: (featureName: string, playerId?: string) => void;
  togglePlayerDeathState: (playerId: string, status: 'dying' | 'stable' | 'revive' | 'dead', healHP?: number) => void;
  lastItemReceivedEvent?: { id: string; roomId?: string; playerId: string; itemName: string; quantity: number; timestamp: number } | null;
  
  levelUpPlayer: (playerId: string, targetRoomId?: string, method?: 'fixed' | 'roll') => void;
  levelUpParty: (targetRoomId?: string, method?: 'fixed' | 'roll') => void;
  lastLevelUpEvent?: LevelUpEvent | null;

  hpTerminology: 'PG' | 'HP';
  setHPTerminology: (terminology: 'PG' | 'HP') => void;
  currencyMode: 'standard' | 'all';
  setCurrencyMode: (currencyMode: 'standard' | 'all') => void;
  convertPlayerCurrencyToStandard: (playerId: string) => void;
  deleteCharacter: (characterId: string) => Promise<void> | void;
  assignCharacterToRoom: (characterId: string, roomId: string) => Promise<void> | void;
  rehydrateLocalPlayers: () => void;
  
  addItem: (item: Item, isTemp: boolean, duration?: number) => void;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  removeItem: (id: string) => void;
  consumeItem: (id: string) => void;
  addSpell: (spell: Spell, isTemp: boolean, duration?: number) => void;
  updateSpell: (spellId: string, updates: Partial<Spell>) => void;
  removeSpell: (id: string) => void;
  addModifier: (mod: Modifier, playerId?: string) => void;
  removeModifier: (id: string, playerId?: string) => void;
  
  updateCurrency: (playerId?: string, updates?: Partial<Currency>) => void;
  spendCurrency: (playerId?: string, spend?: Partial<Currency>, reason?: string) => void;
  saveNotesToCharacter: (playerId: string, notes: PersonalNote[]) => void;

  logs: LogEntry[];
  addLog: (message: string) => void;
  lastTurnEvent?: { id: string; timestamp: number } | null;
}

export const useStore = create<StoreState>((set, get) => ({
  activeNotification: null,
  showAlert: (message, title = "Aviso de la Campaña", type = "info") => {
    set({
      activeNotification: {
        open: true,
        title,
        message,
        type,
        showCancel: false,
        confirmText: "Entendido"
      }
    });
  },
  showConfirm: (message, onConfirm, title = "Confirmación Requerida", confirmText = "Confirmar", cancelText = "Cancelar") => {
    set({
      activeNotification: {
        open: true,
        title,
        message,
        type: "warning",
        showCancel: true,
        confirmText,
        cancelText,
        onConfirm
      }
    });
  },
  closeNotification: () => set({ activeNotification: null }),

  hpTerminology: 'HP',
  setHPTerminology: (hpTerminology) => set({ hpTerminology }),
  currencyMode: 'all',
  setCurrencyMode: (currencyMode) => set({ currencyMode }),
  isCombatMode: false,
  initiativeOrder: [],
  currentTurnIndex: 0,
  
  toggleCombatMode: (status, targetRoomId, selectedPlayerIds) => {
    const currentStatus = get().isCombatMode;
    const newStatus = status !== undefined ? status : !currentStatus;
    
    let activeRoomId = typeof targetRoomId === 'string' ? targetRoomId : undefined;
    if (!activeRoomId && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        activeRoomId = match[1];
      }
    }
    
    if (newStatus) {
      const now = Date.now();
      let targetIds: string[] = [];

      if (selectedPlayerIds && selectedPlayerIds.length > 0) {
        targetIds = selectedPlayerIds;
      } else {
        const presentPlayers = get().players.filter(p => {
          if (p.isOnline === false) return false;
          if (p.lastSeen && (now - p.lastSeen) > 45000) return false;
          return true;
        });

        const targetPlayers = presentPlayers.length > 0 ? presentPlayers : get().players;
        targetIds = targetPlayers.map(p => p.id);
      }

      const updatedPlayers = get().players.map(p => {
        if (!targetIds.includes(p.id)) return p;

        const die = Math.floor(Math.random() * 20) + 1;
        const dexValue = p.stats.dex + p.modifiers.filter(m => m.targetStat === 'dex').reduce((acc, m) => acc + (m.value || 0), 0);
        const dexMod = Math.floor((dexValue - 10) / 2);
        const total = die + dexMod;
        
        get().addLog(`🎲 Iniciativa de ${p.name}: Dado (${die}) + Mod DEX (${dexMod >= 0 ? '+'+dexMod : dexMod}) = ${total}`);
        
        return {
          ...p,
          initiative: { die, dexMod, total }
        };
      });

      const sortedPresent = [...updatedPlayers]
        .filter(p => targetIds.includes(p.id))
        .sort((a, b) => (b.initiative?.total || 0) - (a.initiative?.total || 0));
      
      const order = sortedPresent.map(p => p.id);
      const firstPlayer = sortedPresent[0];

      get().addLog(`⚔️ ¡MODO COMBATE INICIADO! Primer turno: ${firstPlayer?.name || 'Jugador'} (Iniciativa ${firstPlayer?.initiative?.total || 0})`);

      set({
        isCombatMode: true,
        players: updatedPlayers,
        initiativeOrder: order,
        currentTurnIndex: 0
      });

      if (activeRoomId) {
        updateRoomState(activeRoomId, {
          isCombatMode: true,
          initiativeOrder: order,
          currentTurnIndex: 0
        });
        updatedPlayers
          .filter(p => p.roomId === activeRoomId && !isDemoPlayer(p.id))
          .forEach(p => savePlayerInRoom(activeRoomId!, p));
      }
    } else {
      get().addLog(`🕊️ El DM ha finalizado el Modo Combate.`);
      set({
        isCombatMode: false,
        initiativeOrder: [],
        currentTurnIndex: 0,
        lastTurnEvent: null
      });

      if (activeRoomId) {
        updateRoomState(activeRoomId, {
          isCombatMode: false,
          initiativeOrder: [],
          currentTurnIndex: 0,
          lastTurnEvent: null
        });
      }
    }
  },
  
  players: [],
  activePlayerId: '',
  
  setActivePlayerId: (id) => set({ activePlayerId: id }),
  
  createCharacter: (name, race, charClass, background, level = 1, stats, ownerId, ownerName, roomId) => {
    const existingNames = get().players
      .filter(p => !roomId || p.roomId === roomId)
      .map(p => p.name.trim().toLowerCase());
    if (existingNames.includes(name.trim().toLowerCase())) {
      get().showAlert(`⚠️ Ya existe un personaje llamado "${name.trim()}" en esta campaña. Por favor, elige un nombre único.`, "Nombre Duplicado", "warning");
      return '';
    }
    const curUser = auth?.currentUser;
    const effectiveOwnerId = ownerId || curUser?.uid;
    const effectiveOwnerName = ownerName || curUser?.displayName || curUser?.email || (curUser?.isAnonymous ? 'Invitado' : 'Jugador');
    const newId = 'player_' + Date.now();
    const newChar = createDefaultCharacter(newId, name, race, charClass, background, level, stats, effectiveOwnerId, effectiveOwnerName, roomId);
    set((state) => ({
      players: [...state.players, newChar],
      activePlayerId: newId
    }));
    get().addLog(`✨ ¡Nuevo aventurero creado!: ${newChar.name} (${newChar.race} ${newChar.charClass} Nivel ${newChar.level})`);
    syncAllLocalPlayersToStorage([newChar]);
    return newId;
  },

  deleteCharacter: async (characterId) => {
    const target = get().players.find(p => p.id === characterId);
    const targetRoomId = target?.roomId;

    set((state) => {
      const remaining = state.players.filter(p => p.id !== characterId);
      const nextActiveId = state.activePlayerId === characterId ? (remaining[0]?.id || '') : state.activePlayerId;
      return {
        players: remaining,
        activePlayerId: nextActiveId
      };
    });

    if (target) {
      get().addLog(`🗑️ Personaje eliminado: ${target.name}.`);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`dnd_private_notes_${characterId}`);
      } catch (e) {}
    }

    removeLocalPlayerFromStorage(characterId);

    // Physical deletion from Firestore room subcollection
    if (targetRoomId && targetRoomId !== 'sin_campaña') {
      await deletePlayerFromRoom(targetRoomId, characterId);
    }
  },

  assignCharacterToRoom: async (characterId, roomId) => {
    const cleanRoomId = roomId.trim();
    const oldChar = get().players.find(p => p.id === characterId);
    const oldRoomId = oldChar?.roomId;

    // 1. If reassigned away from an old room, purge from old room in Firestore!
    if (oldRoomId && oldRoomId !== cleanRoomId && oldRoomId !== 'sin_campaña') {
      await deletePlayerFromRoom(oldRoomId, characterId);
    }

    // 2. Update character state
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== characterId) return p;
        const curUser = auth?.currentUser;
        const finalOwnerId = p.ownerId || curUser?.uid;
        const finalOwnerName = p.ownerName || curUser?.displayName || curUser?.email || (curUser?.isAnonymous ? 'Invitado' : 'Jugador');
        updatedChar = { ...p, roomId: cleanRoomId, ownerId: finalOwnerId, ownerName: finalOwnerName };
        return updatedChar;
      })
    }));

    // 3. Save to new room in Firestore
    if (updatedChar && cleanRoomId && cleanRoomId !== 'sin_campaña') {
      await savePlayerInRoom(cleanRoomId, updatedChar, true);
      get().addLog(`📌 Personaje "${updatedChar.name}" asignado exitosamente a la campaña: ${cleanRoomId}.`);
    }

    // 4. Update in local storage
    if (updatedChar) {
      syncAllLocalPlayersToStorage([updatedChar]);
    }
  },

  rehydrateLocalPlayers: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dnd_all_local_players');
        if (stored) {
          const parsed: CharacterState[] = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(p => p && p.id && !isDemoPlayer(p.id));
            set((state) => {
              const map = new Map<string, CharacterState>();
              valid.forEach(p => map.set(p.id, p));
              // Also keep any active non-demo character currently in state
              if (state.activePlayerId && !map.has(state.activePlayerId)) {
                const cur = state.players.find(p => p.id === state.activePlayerId);
                if (cur && !isDemoPlayer(cur.id)) map.set(cur.id, cur);
              }
              const merged = Array.from(map.values());
              const nextActive = merged.some(p => p.id === state.activePlayerId) ? state.activePlayerId : (merged[0]?.id || '');
              return { players: merged, activePlayerId: nextActive };
            });
          }
        }
      } catch (e) {}
    }
  },

  loadFamousDemoCharacter: () => {
    const existing = get().players.find(p => p.id === 'drizzt_dourden_demo');
    if (existing) {
      set({ activePlayerId: existing.id });
      return existing.id;
    }
    const drizzt = createFamousDrizztCharacter();
    set((state) => ({
      players: [drizzt, ...state.players],
      activePlayerId: drizzt.id
    }));
    get().addLog(`🌟 ¡Héroe Legendario Cargado!: Drizzt Do'Urden (Elfo Oscuro Guerrero Nivel 5) en la Mesa de Prueba.`);
    return drizzt.id;
  },

  loadDemoSandboxParty: () => {
    const party = getFactoryDemoParty();
    set((state) => {
      const nonDemo = state.players.filter(p => !isDemoPlayer(p.id));
      const targetActive = party[0]?.id || '';
      return {
        players: [...party, ...nonDemo],
        activePlayerId: targetActive
      };
    });
    get().addLog(`🌟 Mesa de Pruebas: Party Legendaria inicializada (Drizzt, Lyra, Varis y Elidoris).`);
    return party[0]?.id || '';
  },

  resetDemoSandbox: () => {
    const party = getFactoryDemoParty();
    set((state) => {
      const nonDemo = state.players.filter(p => !isDemoPlayer(p.id));
      return {
        players: [...party, ...nonDemo],
        activePlayerId: party[0]?.id || '',
        isCombatMode: false,
        initiativeOrder: [],
        currentTurnIndex: 0
      };
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dnd_demo_direct_messages');
      } catch (e) {}
    }
    get().addLog(`🔄 Mesa de Pruebas: Restaurados todos los personajes, vida, ranuras y estados a los valores de fábrica.`);
  },
  
  updateActiveCharacter: (updates) => {
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== state.activePlayerId) return p;
        updatedChar = { ...p, ...updates };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  toggleInspiration: (playerId, status) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const newStatus = status !== undefined ? status : !p.inspiration;
        get().addLog(newStatus ? `⭐ ${p.name} ha obtenido INSPIRACIÓN de D&D 5e.` : `⭐ ${p.name} ha usado/perdido su Inspiración.`);
        updatedChar = { ...p, inspiration: newStatus };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  updateCurrency: (playerId, updates) => {
    if (!updates) return;
    const targetId = playerId || get().activePlayerId;
    let logMsg = '';
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const currentCur = p.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
        const newCur: Currency = {
          cp: Math.max(0, updates.cp !== undefined ? updates.cp : currentCur.cp),
          sp: Math.max(0, updates.sp !== undefined ? updates.sp : currentCur.sp),
          ep: Math.max(0, updates.ep !== undefined ? updates.ep : currentCur.ep),
          gp: Math.max(0, updates.gp !== undefined ? updates.gp : currentCur.gp),
          pp: Math.max(0, updates.pp !== undefined ? updates.pp : currentCur.pp),
        };
        logMsg = `💰 ${p.name} actualizó su monedero: ${newCur.gp} GP, ${newCur.sp} SP, ${newCur.cp} CP.`;
        updatedChar = { ...p, currency: newCur };
        return updatedChar;
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  spendCurrency: (playerId, spend, reason) => {
    if (!spend) return;
    const targetId = playerId || get().activePlayerId;
    let logMsg = '';
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const cur = p.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
        const spendCP = Math.max(0, spend.cp || 0);
        const spendSP = Math.max(0, spend.sp || 0);
        const spendEP = Math.max(0, spend.ep || 0);
        const spendGP = Math.max(0, spend.gp || 0);
        const spendPP = Math.max(0, spend.pp || 0);

        const newCur: Currency = {
          cp: Math.max(0, cur.cp - spendCP),
          sp: Math.max(0, cur.sp - spendSP),
          ep: Math.max(0, cur.ep - spendEP),
          gp: Math.max(0, cur.gp - spendGP),
          pp: Math.max(0, cur.pp - spendPP),
        };

        const spentParts: string[] = [];
        if (spendPP > 0) spentParts.push(`${spendPP} PP`);
        if (spendGP > 0) spentParts.push(`${spendGP} GP`);
        if (spendEP > 0) spentParts.push(`${spendEP} EP`);
        if (spendSP > 0) spentParts.push(`${spendSP} SP`);
        if (spendCP > 0) spentParts.push(`${spendCP} CP`);

        if (spentParts.length > 0) {
          const reasonText = reason ? ` [${reason}]` : '';
          logMsg = `💰 ${p.name} ha gastado ${spentParts.join(', ')}${reasonText}.`;
        }

        updatedChar = { ...p, currency: newCur };
        return updatedChar;
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  saveNotesToCharacter: (playerId, notes) => {
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        updatedChar = { ...p, notes: notes.slice(0, 10) };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  updatePlayerStatsByDM: (playerId, stats) => {
    let logMsg = '';
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        if (stats.con !== undefined && stats.con !== p.stats.con) {
          const applied = applyRetroactiveConstitutionChange(p, stats.con);
          const updatedStats = { ...applied.stats, ...stats };
          const hpDelta = applied.hpDelta;
          const deltaText = hpDelta !== 0 ? ` (Vida Máxima recalculada retroactivamente: ${p.hp.max} → ${applied.hp.max} ${get().hpTerminology})` : '';
          logMsg = `El DM ha actualizado las estadísticas base de ${p.name}.${deltaText}`;
          updatedChar = { ...p, stats: updatedStats, hp: applied.hp };
          return updatedChar;
        }
        logMsg = `El DM ha actualizado las estadísticas base de ${p.name}.`;
        updatedChar = { ...p, stats: { ...p.stats, ...stats } };
        return updatedChar;
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  updatePlayerHPByDM: (playerId, hpUpdates) => {
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const newHP = { ...p.hp, ...hpUpdates };
        get().addLog(`El DM ha actualizado los Puntos de Vida de ${p.name} (${newHP.current}/${newHP.max} HP, ${newHP.temp || 0} Temp).`);
        updatedChar = { ...p, hp: newHP };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  convertPlayerCurrencyToStandard: (playerId) => {
    let logMsg = '';
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const cur = p.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
        if ((cur.pp || 0) <= 0 && (cur.ep || 0) <= 0) return p;

        const extraGPFromPP = (cur.pp || 0) * 10;
        const extraGPFromEP = Math.floor((cur.ep || 0) * 0.5);
        const extraSPFromEP = ((cur.ep || 0) % 2) * 5;

        const newCur: Currency = {
          cp: cur.cp || 0,
          sp: (cur.sp || 0) + extraSPFromEP,
          ep: 0,
          gp: (cur.gp || 0) + extraGPFromPP + extraGPFromEP,
          pp: 0
        };

        logMsg = `💰 Se convirtieron las monedas de ${p.name} al modo Estándar (CP/SP/GP): ${newCur.gp} GP, ${newCur.sp} SP, ${newCur.cp} CP.`;
        updatedChar = { ...p, currency: newCur };
        return updatedChar;
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  addItemToPlayer: (playerId, item, targetRoomId) => {
    let targetPlayer: CharacterState | undefined;
    const targetP = get().players.find(p => p.id === playerId);
    let effectiveRoomId = targetRoomId || targetP?.roomId || '';
    if ((!effectiveRoomId || effectiveRoomId === 'sin_campaña') && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        effectiveRoomId = match[1];
      }
    }
    const event = {
      id: 'item_evt_' + Date.now(),
      roomId: effectiveRoomId,
      playerId,
      itemName: item.name,
      quantity: item.quantity,
      timestamp: Date.now()
    };
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        targetPlayer = { ...p, roomId: effectiveRoomId || p.roomId, inventory: [...p.inventory, item] };
        get().addLog(`🎁 El DM ha otorgado a ${p.name}: ${item.name} x${item.quantity}`);
        return targetPlayer;
      }),
      lastItemReceivedEvent: event
    }));
    if (targetPlayer) {
      if (effectiveRoomId && targetPlayer.roomId !== effectiveRoomId) {
        targetPlayer.roomId = effectiveRoomId;
      }
      persistCharacterChanges(targetPlayer, true);
    }
    const finalRoomId = targetPlayer?.roomId || effectiveRoomId;
    if (finalRoomId && finalRoomId !== 'sin_campaña') {
      addRoomLog(finalRoomId, `🎁 El DM otorgó a ${targetPlayer?.name || 'jugador'} el objeto: "${item.name}" (x${item.quantity}).`);
      updateRoomState(finalRoomId, { lastItemReceivedEvent: event });
    }
  },

  removeItemFromPlayer: (playerId, itemId) => {
    let targetPlayer: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const item = p.inventory.find(i => i.id === itemId);
        if (item) get().addLog(`El DM ha retirado del inventario de ${p.name}: ${item.name}`);
        targetPlayer = { ...p, inventory: p.inventory.filter(i => i.id !== itemId) };
        return targetPlayer;
      })
    }));
    if (targetPlayer) {
      persistCharacterChanges(targetPlayer, true);
    }
  },

  addSpellToPlayer: (playerId, spell) => {
    let targetPlayer: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        get().addLog(`El DM ha otorgado el conjuro "${spell.name}" a ${p.name}.`);
        targetPlayer = { ...p, spells: [...p.spells, spell] };
        return targetPlayer;
      })
    }));
    if (targetPlayer) {
      persistCharacterChanges(targetPlayer, true);
    }
  },

  removeSpellToPlayer: (playerId, spellId) => {
    let targetPlayer: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const spell = p.spells.find(s => s.id === spellId);
        if (spell) get().addLog(`El DM ha eliminado el conjuro "${spell.name}" del grimorio de ${p.name}.`);
        targetPlayer = { ...p, spells: p.spells.filter(s => s.id !== spellId) };
        return targetPlayer;
      })
    }));
    if (targetPlayer) {
      persistCharacterChanges(targetPlayer, true);
    }
  },

  togglePlayerDeath: (playerId, status) => {
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const newDeadStatus = status !== undefined ? status : !p.isDead;
        get().addLog(newDeadStatus ? `☠️ ${p.name} ha fallecido.` : `✨ ${p.name} ha sido revivido por el DM.`);
        updatedChar = { 
          ...p, 
          isDead: newDeadStatus,
          isDying: newDeadStatus ? false : false,
          isStable: newDeadStatus ? false : false,
          deathSaves: { successes: 0, failures: 0 },
          hp: { ...p.hp, current: newDeadStatus ? 0 : Math.max(1, p.hp.current) }
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },
  
  toggleEquipItem: (itemId, playerId) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const updatedInventory = p.inventory.map(item => {
          if (item.id === itemId) {
            const isEquipped = !item.equipped;
            get().addLog(`${p.name} ha ${isEquipped ? 'equipado' : 'desequipado'}: ${item.name}`);
            return { ...item, equipped: isEquipped };
          }
          return item;
        });
        updatedChar = { ...p, inventory: updatedInventory };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  modifyHPMax: (amount, isPermanent, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    if (isPermanent) {
      get().addLog(`HP Máximo de ${activeChar.name} ajustado en ${amount > 0 ? '+'+amount : amount} permanentemente.`);
      let updatedChar: CharacterState | undefined;
      set((state) => ({
        players: state.players.map(p => {
          if (p.id !== activeId) return p;
          updatedChar = {
            ...p,
            hp: {
              ...p.hp,
              max: Math.max(1, p.hp.max + amount),
              current: Math.max(1, p.hp.current + amount)
            }
          };
          return updatedChar;
        })
      }));
      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
    } else {
      get().addLog(`Modificador temporal de HP Máximo para ${activeChar.name}: ${amount > 0 ? '+'+amount : amount} por ${duration} turnos.`);
      get().addModifier({
        id: Date.now().toString(),
        name: `HP Máx (${amount > 0 ? '+'+amount : amount})`,
        description: `Modifica Vida Máxima`,
        duration: duration || null,
        targetStat: 'hp_max',
        value: amount
      });
    }
  },

  modifyHPCurrent: (amount) => {
    const activeId = get().activePlayerId;
    set((state) => {
      const activeChar = state.players.find(p => p.id === activeId);
      if (!activeChar) return state;
      const effMax = activeChar.hp.max + activeChar.modifiers
        .filter(m => m.targetStat === 'hp_max')
        .reduce((acc, m) => acc + (m.value || 0), 0);
      
      const newCurr = Math.min(effMax, Math.max(0, activeChar.hp.current + amount));
      let isDying = activeChar.isDying || false;
      let isStable = activeChar.isStable || false;
      let isDead = activeChar.isDead || false;
      let deathSaves = activeChar.deathSaves || { successes: 0, failures: 0 };

      if (newCurr === 0) {
        const excessDamage = Math.abs(amount) - activeChar.hp.current;
        if (amount < 0 && excessDamage >= effMax) {
          isDead = true;
          isDying = false;
          isStable = false;
          get().addLog(`☠️ ¡${activeChar.name} sufrió Muerte Masiva por daño masivo (${excessDamage} daño sobrante >= ${effMax} HP max)!`);
        } else if (activeChar.hp.current > 0) {
          isDying = true;
          isStable = false;
          isDead = false;
          deathSaves = { successes: 0, failures: 0 };
          get().addLog(`🩸 ¡${activeChar.name} ha caído a 0 HP y ha quedado MORIBUNDO! Deberá lanzar salvaciones contra la muerte.`);
        } else if (isStable && amount < 0) {
          isStable = false;
          isDying = true;
          deathSaves = { ...deathSaves, failures: deathSaves.failures + 1 };
          get().addLog(`🩸 ${activeChar.name} recibió daño estando a 0 HP: +1 Fallo contra la muerte (${deathSaves.failures}/3).`);
          if (deathSaves.failures >= 3) {
            isDead = true;
            isDying = false;
            isStable = false;
            get().addLog(`☠️ ¡${activeChar.name} acumuló 3 fallos y ha fallecido!`);
          }
        } else if (isDying && amount < 0) {
          deathSaves = { ...deathSaves, failures: deathSaves.failures + 1 };
          get().addLog(`🩸 ${activeChar.name} recibió daño adicional estando moribundo: +1 Fallo contra la muerte (${deathSaves.failures}/3).`);
          if (deathSaves.failures >= 3) {
            isDead = true;
            isDying = false;
            isStable = false;
            get().addLog(`☠️ ¡${activeChar.name} acumuló 3 fallos y ha fallecido!`);
          }
        }
      } else {
        if (isDying || isStable || isDead) {
          get().addLog(`✨ ¡${activeChar.name} recuperó la consciencia con ${newCurr} HP! (Estado moribundo finalizado)`);
        } else {
          get().addLog(`Puntos de vida de ${activeChar.name} cambiados a ${newCurr}/${effMax} (${amount > 0 ? '+'+amount : amount})`);
        }
        isDying = false;
        isStable = false;
        isDead = false;
        deathSaves = { successes: 0, failures: 0 };
      }

      let updatedChar: CharacterState | undefined;
      const updatedPlayers = state.players.map(p => {
        if (p.id !== activeId) return p;
        updatedChar = {
          ...p,
          hp: { ...p.hp, current: newCurr },
          isDying,
          isStable,
          deathSaves,
          isDead
        };
        return updatedChar;
      });
      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
      return {
        players: updatedPlayers
      };
    });
  },

  rollDeathSave: (playerId, onExitModal) => {
    const targetId = playerId || get().activePlayerId;
    const p = get().players.find(char => char.id === targetId);
    if (!p || p.isDead) return;

    const dieValue = Math.floor(Math.random() * 20) + 1;
    const terminology = get().hpTerminology || 'HP';

    triggerDiceRoll('d20', 0, `Salvación contra la Muerte (${p.name})`, dieValue, () => {
      // Runs WHEN player accepts the dice roll result modal!
      const currentP = get().players.find(char => char.id === targetId);
      if (!currentP) return;

      let currentSuccesses = currentP.deathSaves?.successes || 0;
      let currentFailures = currentP.deathSaves?.failures || 0;
      let updatedChar: CharacterState | undefined;

      if (dieValue === 20) {
        // Natural 20! Restore 1 HP & clear dying state IMMEDIATELY!
        get().addLog(`🌟 ¡CRÍTICO (20)! ${currentP.name} recupera 1 ${terminology} de inmediato y recobra la consciencia.`);
        set((state) => ({
          players: state.players.map(char => {
            if (char.id !== targetId) return char;
            updatedChar = {
              ...char,
              hp: { ...char.hp, current: 1 },
              isDying: false,
              isStable: false,
              isDead: false,
              deathSaves: { successes: 0, failures: 0 }
            };
            return updatedChar;
          })
        }));

        if (onExitModal) {
          onExitModal({
            type: 'salvation',
            title: '✨ ¡GRACIA DIVINA Y SALVACIÓN! ✨',
            desc: `¡Una luz angelical resplandeciente desciende sobre ${currentP.name}! Has recobrado la consciencia con 1 ${terminology} y la muerte ha sido derrotada.`
          });
        }
      } else if (dieValue === 1) {
        currentFailures += 2;
        get().addLog(`💀 ¡PIFIA (1)! ${currentP.name} sufre 2 Fallos automáticos contra la muerte (${currentFailures}/3).`);

        if (currentFailures >= 3) {
          get().addLog(`☠️ ¡3 Fallos acumulados! ${currentP.name} ha fallecido definitivamente.`);
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                isDying: false,
                isStable: false,
                isDead: true,
                deathSaves: { successes: currentSuccesses, failures: 3 }
              };
              return updatedChar;
            })
          }));

          if (onExitModal) {
            onExitModal({
              type: 'death',
              title: '☠️ ¡LA OSCURIDAD TE HA RECLAMADO!',
              desc: `El hilo de la vida de ${currentP.name} se ha cortado. Has acumulado 3 fallos en tus salvaciones contra la muerte.`
            });
          }
        } else {
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                deathSaves: { successes: currentSuccesses, failures: currentFailures }
              };
              return updatedChar;
            })
          }));
        }
      } else if (dieValue >= 10) {
        currentSuccesses += 1;
        get().addLog(`🟢 Éxito (${dieValue}): ${currentP.name} suma 1 Éxito contra la muerte (${currentSuccesses}/3).`);

        if (currentSuccesses >= 3) {
          get().addLog(`🛡️ ¡3 Éxitos acumulados! ${currentP.name} se ha ESTABILIZADO. Sigue inconsciente pero fuera de peligro.`);
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                isDying: false,
                isStable: true,
                isDead: false,
                deathSaves: { successes: 0, failures: 0 }
              };
              return updatedChar;
            })
          }));

          if (onExitModal) {
            onExitModal({
              type: 'salvation',
              title: '🕊️ ¡BENDICIÓN Y ESTABILIZACIÓN CELESTIAL! 🕊️',
              desc: `¡Un halo de paz sagrada rodea a ${currentP.name}! Has alcanzado 3 Éxitos contra la muerte. Estás fuera de peligro mortal, estabilizado a 0 ${terminology}.`
            });
          }
        } else {
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                deathSaves: { successes: currentSuccesses, failures: currentFailures }
              };
              return updatedChar;
            })
          }));
        }
      } else {
        // Failure < 10
        currentFailures += 1;
        get().addLog(`🔴 Fallo (${dieValue}): ${currentP.name} suma 1 Fallo contra la muerte (${currentFailures}/3).`);

        if (currentFailures >= 3) {
          get().addLog(`☠️ ¡3 Fallos acumulados! ${currentP.name} ha fallecido definitivamente.`);
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                isDying: false,
                isStable: false,
                isDead: true,
                deathSaves: { successes: currentSuccesses, failures: 3 }
              };
              return updatedChar;
            })
          }));

          if (onExitModal) {
            onExitModal({
              type: 'death',
              title: '☠️ ¡LA OSCURIDAD TE HA RECLAMADO!',
              desc: `El hilo de la vida de ${currentP.name} se ha cortado. Has acumulado 3 fallos en tus salvaciones contra la muerte.`
            });
          }
        } else {
          set((state) => ({
            players: state.players.map(char => {
              if (char.id !== targetId) return char;
              updatedChar = {
                ...char,
                deathSaves: { successes: currentSuccesses, failures: currentFailures }
              };
              return updatedChar;
            })
          }));
        }
      }

      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
    });
  },

  stabilizePlayer: (playerId, healHP = 0) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        if (healHP > 0) {
          const effMax = p.hp.max + p.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
          const newCurr = Math.min(effMax, healHP);
          get().addLog(`🩹 ${p.name} recibió auxilio de un compañero/DM y recuperó ${newCurr} HP, recobrando la consciencia.`);
          updatedChar = {
            ...p,
            hp: { ...p.hp, current: newCurr },
            isDying: false,
            isStable: false,
            isDead: false,
            deathSaves: { successes: 0, failures: 0 }
          };
          return updatedChar;
        } else {
          get().addLog(`🩹 ${p.name} recibió primeros auxilios y se ha ESTABILIZADO a 0 HP.`);
          updatedChar = {
            ...p,
            isDying: false,
            isStable: true,
            isDead: false,
            deathSaves: { successes: 0, failures: 0 }
          };
          return updatedChar;
        }
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  modifyAC: (amount, isPermanent, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    if (isPermanent) {
      get().addLog(`CA de ${activeChar.name} ajustada en ${amount > 0 ? '+'+amount : amount} permanentemente.`);
      let updatedChar: CharacterState | undefined;
      set((state) => ({
        players: state.players.map(p => {
          if (p.id !== activeId) return p;
          updatedChar = { ...p, ac: Math.max(1, p.ac + amount) };
          return updatedChar;
        })
      }));
      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
    } else {
      get().addLog(`Modificador temporal de CA para ${activeChar.name}: ${amount > 0 ? '+'+amount : amount} por ${duration} turnos.`);
      get().addModifier({
        id: Date.now().toString(),
        name: `CA (${amount > 0 ? '+'+amount : amount})`,
        description: `Modifica Clase de Armadura`,
        duration: duration || null,
        targetStat: 'ac',
        value: amount
      });
    }
  },

  updateStat: (stat, value, isPermanent, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    if (isPermanent) {
      let updatedChar: CharacterState | undefined;
      if (stat.toLowerCase() === 'con') {
        const newCon = (activeChar.stats.con || 10) + value;
        const applied = applyRetroactiveConstitutionChange(activeChar, newCon);
        const hpDelta = applied.hpDelta;
        get().addLog(`CON de ${activeChar.name} ajustado en ${value > 0 ? '+'+value : value} permanentemente. Modificador de CON retroactivo aplicado a Vida Máxima: ${activeChar.hp.max} → ${applied.hp.max} ${get().hpTerminology} (${hpDelta >= 0 ? '+' : ''}${hpDelta}).`);
        updatedChar = {
          ...activeChar,
          stats: applied.stats,
          hp: applied.hp
        };
        set((state) => ({
          players: state.players.map(p => p.id === activeId ? updatedChar! : p)
        }));
      } else {
        get().addLog(`${stat.toUpperCase()} de ${activeChar.name} ajustado en ${value > 0 ? '+'+value : value} permanentemente.`);
        updatedChar = {
          ...activeChar,
          stats: { ...activeChar.stats, [stat]: (activeChar.stats as any)[stat] + value }
        };
        set((state) => ({
          players: state.players.map(p => p.id === activeId ? updatedChar! : p)
        }));
      }
      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
    } else {
      get().addLog(`Modificador temporal en ${stat.toUpperCase()} para ${activeChar.name}: ${value > 0 ? '+'+value : value} por ${duration} turnos.`);
      get().addModifier({
        id: Date.now().toString(),
        name: `Mod. ${stat.toUpperCase()}`,
        description: `Altera ${stat.toUpperCase()} en ${value}`,
        duration: duration || null,
        targetStat: stat,
        value: value
      });
    }
  },

  setBaseStatScore: (stat, score) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        if (stat.toLowerCase() === 'con') {
          const applied = applyRetroactiveConstitutionChange(p, score);
          const hpDelta = applied.hpDelta;
          get().addLog(`Puntuación base de CON de ${p.name} fijada en ${score}. Modificador de CON retroactivo: Vida Máxima recalculada a ${applied.hp.max} ${get().hpTerminology} (${hpDelta >= 0 ? '+' : ''}${hpDelta}).`);
          updatedChar = {
            ...p,
            stats: applied.stats,
            hp: applied.hp
          };
          return updatedChar;
        }
        get().addLog(`Puntuación base de ${stat.toUpperCase()} de ${p.name} fijada en ${score}.`);
        updatedChar = {
          ...p,
          stats: { ...p.stats, [stat]: score }
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  addCustomClassFeature: (feature) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        get().addLog(`📜 ${p.name} recibió el rasgo por Lore/DM: ${feature.name}`);
        updatedChar = {
          ...p,
          customClassFeatures: [...currentCustom, feature]
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  removeCustomClassFeature: (featureName) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        get().addLog(`Rasgo por Lore/DM retirado de ${p.name}: ${featureName}`);
        updatedChar = {
          ...p,
          customClassFeatures: currentCustom.filter(f => f.name !== featureName)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  updateCustomClassFeature: (oldName, feature) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        const exists = currentCustom.some(f => f.name === oldName);
        get().addLog(`Rasgo por Lore/DM actualizado en ${p.name}: ${feature.name}`);
        const updatedList = exists 
          ? currentCustom.map(f => f.name === oldName ? feature : f)
          : [...currentCustom, feature];
        updatedChar = {
          ...p,
          customClassFeatures: updatedList
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  consumeItem: (itemId) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const item = p.inventory.find(i => i.id === itemId);
        if (!item || item.isConsumed || item.quantity <= 0) return p;

        let updatedInventory = [...p.inventory];
        if (item.quantity > 1) {
          get().addLog(`🧪 ${p.name} consumió 1x ${item.name} (${item.quantity - 1} restantes).`);
          updatedInventory = p.inventory.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
        } else {
          get().addLog(`🧪 ${p.name} consumió 1x ${item.name}. Permanecerá visible como consumido hasta el próximo turno.`);
          updatedInventory = p.inventory.map(i => i.id === itemId ? { ...i, quantity: 0, isConsumed: true } : i);
        }

        updatedChar = { ...p, inventory: updatedInventory };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  togglePinSkill: (skillName, playerId) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const isPinned = p.pinnedSkills.includes(skillName);
        const newPinned = isPinned 
          ? p.pinnedSkills.filter(s => s !== skillName)
          : [...p.pinnedSkills, skillName];
        updatedChar = { ...p, pinnedSkills: newPinned };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  useSpellSlot: (level) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const slot = p.spellSlots[level];
        if (!slot || slot.current <= 0) return p;
        get().addLog(`${p.name} lanzó un hechizo usando un Espacio Nivel ${level} (${slot.current - 1}/${slot.max} restantes)`);
        updatedChar = {
          ...p,
          spellSlots: {
            ...p.spellSlots,
            [level]: { ...slot, current: slot.current - 1 }
          }
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  restoreSpellSlot: (level) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const slot = p.spellSlots[level];
        if (!slot || slot.current >= slot.max) return p;
        updatedChar = {
          ...p,
          spellSlots: {
            ...p.spellSlots,
            [level]: { ...slot, current: slot.current + 1 }
          }
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  setSpellSlotMax: (level, max) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        updatedChar = {
          ...p,
          spellSlots: {
            ...p.spellSlots,
            [level]: { max, current: max }
          }
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  spendHitDie: (playerId) => {
    const targetId = playerId || get().activePlayerId;
    const player = get().players.find(p => p.id === targetId);
    if (!player) return;

    const hd = getCharacterHitDice(player);
    if (hd.current <= 0) {
      get().showAlert(`⚠️ ${player.name} no tiene Dados de Golpe disponibles (0/${hd.max}). Se recuperarán en un Descanso Largo.`, "Sin Dados de Golpe", "warning");
      return;
    }

    const conMod = Math.floor((player.stats.con - 10) / 2);
    const dieRoll = Math.floor(Math.random() * hd.die) + 1;
    // D&D 5e rule: 1d[die] + CON mod (minimum 0 healing)
    const healed = Math.max(0, dieRoll + conMod);
    const effMaxHP = player.hp.max + player.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
    const newCurrentHP = Math.min(effMaxHP, player.hp.current + healed);
    const remainingHD = hd.current - 1;

    const conSign = conMod >= 0 ? `+${conMod}` : `${conMod}`;
    const logMsg = `☕ ${player.name} gastó 1 Dado de Golpe: 1d${hd.die} [${dieRoll}] ${conSign} CON = +${healed} HP curados. Vida: ${newCurrentHP}/${effMaxHP}. Dados restantes: ${remainingHD}/${hd.max}.`;
    
    get().addLog(logMsg);
    if (player.roomId) {
      addRoomLog(player.roomId, logMsg);
    }
    triggerDiceRoll(('d' + hd.die) as any, conMod, `Gastar Dado de Golpe (+${healed} HP)`, dieRoll);

    let updatedChar: CharacterState | null = null;
    set((state) => {
      const updatedPlayers = state.players.map(p => {
        if (p.id !== targetId) return p;
        updatedChar = {
          ...p,
          hp: { ...p.hp, current: newCurrentHP },
          hitDice: { ...hd, current: remainingHD },
          isDying: false,
          isStable: false,
          deathSaves: { successes: 0, failures: 0 }
        };
        return updatedChar;
      });
      return { players: updatedPlayers };
    });

    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  shortRest: (playerId) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | null = null;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const updatedFeatures = (p.customClassFeatures || []).map(feat => {
          if (feat.resetOn === 'short' || feat.usage?.toLowerCase().includes('descanso corto')) {
            return { ...feat, currentUses: feat.maxUses !== undefined ? feat.maxUses : 1 };
          }
          return feat;
        });

        const hd = getCharacterHitDice(p);
        get().addLog(`☕ ${p.name} realizó un DESCANSO CORTO. Habilidades recargadas. Puedes gastar Dados de Golpe (${hd.current}/${hd.max} d${hd.die}) para curarte.`);
        if (p.roomId) {
          addRoomLog(p.roomId, `☕ ${p.name} realizó un DESCANSO CORTO.`);
        }
        updatedChar = {
          ...p,
          customClassFeatures: updatedFeatures,
          hitDice: hd
        };
        return updatedChar;
      })
    }));

    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  longRest: (playerId) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | null = null;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const newSlots: Record<number, SpellSlot> = {};
        Object.keys(p.spellSlots).forEach((lvlStr) => {
          const lvl = parseInt(lvlStr);
          newSlots[lvl] = { ...p.spellSlots[lvl], current: p.spellSlots[lvl].max };
        });
        const effMaxHP = p.hp.max + p.modifiers
          .filter(m => m.targetStat === 'hp_max')
          .reduce((acc, m) => acc + (m.value || 0), 0);

        const updatedFeatures = (p.customClassFeatures || []).map(feat => {
          if (feat.resetOn === 'short' || feat.resetOn === 'long' || feat.usage?.toLowerCase().includes('descanso')) {
            return { ...feat, currentUses: feat.maxUses !== undefined ? feat.maxUses : 1 };
          }
          return feat;
        });

        // D&D 5e: Regain spent Hit Dice up to half total Hit Dice (minimum 1)
        const hd = getCharacterHitDice(p);
        const recoveredDice = Math.max(1, Math.floor(hd.max / 2));
        const newHDCurrent = Math.min(hd.max, hd.current + recoveredDice);

        get().addLog(`⛺ ${p.name} tomó un DESCANSO LARGO. Vida al máximo (${effMaxHP} HP), Espacios de Hechizo y Habilidades restaurados. Recuperó +${recoveredDice} Dados de Golpe (${newHDCurrent}/${hd.max} d${hd.die}).`);

        if (p.roomId) {
          addRoomLog(p.roomId, `⛺ ${p.name} completó un DESCANSO LARGO.`);
        }

        updatedChar = {
          ...p,
          hp: { ...p.hp, current: effMaxHP, temp: 0 },
          hitDice: { ...hd, current: newHDCurrent },
          spellSlots: newSlots,
          customClassFeatures: updatedFeatures,
          isDying: false,
          isStable: false,
          isDead: false,
          deathSaves: { successes: 0, failures: 0 }
        };
        return updatedChar;
      })
    }));

    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  useClassFeature: (featureName, playerId) => {
    const targetId = playerId || get().activePlayerId;
    const player = get().players.find(p => p.id === targetId);
    if (!player) return;

    // Get all features available for player class & level
    const officialFeatures = getClassFeaturesForLevel(player.charClass, player.level);
    const customFeatures = player.customClassFeatures || [];

    // Find target feature definition
    let featDef = customFeatures.find((f: ClassFeature) => f.name.toLowerCase() === featureName.toLowerCase() || f.name.toLowerCase().startsWith(featureName.toLowerCase()));
    if (!featDef) {
      featDef = officialFeatures.find((f: ClassFeature) => f.name.toLowerCase() === featureName.toLowerCase() || f.name.toLowerCase().startsWith(featureName.toLowerCase()));
    }

    if (!featDef) {
      // Generic action fallback
      get().addLog(`⚡ ${player.name} ejecutó la acción: "${featureName}".`);
      triggerDiceRoll('d20', 0, `Acción: ${featureName} (${player.name})`);
      if (player.roomId) {
        addRoomLog(player.roomId, `⚡ ${player.name} ejecutó la acción: "${featureName}".`);
      }
      return;
    }

    // Check usages
    const hasLimit = featDef.maxUses !== undefined && featDef.maxUses > 0;
    const currentUses = featDef.currentUses !== undefined ? featDef.currentUses : (featDef.maxUses ?? 1);

    if (hasLimit && currentUses <= 0) {
      get().showAlert(`⚠️ "${featDef.name}" no tiene más cargas disponibles. Realiza un descanso para recargarlo.`, "Sin Cargas", "warning");
      return;
    }

    const newUses = hasLimit ? Math.max(0, currentUses - 1) : currentUses;

    // Special D&D 5e Feature Effects
    let extraLog = '';
    let hpHealed = 0;
    const normName = featDef.name.toLowerCase();

    if (normName.includes('segundo aliento') || normName.includes('segundo viento') || normName.includes('second wind')) {
      const dieRoll = Math.floor(Math.random() * 10) + 1;
      hpHealed = dieRoll + player.level;
      const effMaxHP = player.hp.max + player.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
      const newCurrHP = Math.min(effMaxHP, player.hp.current + hpHealed);
      extraLog = ` 🩹 Recuperó ${hpHealed} HP (1d10 [${dieRoll}] + Nivel ${player.level}). Vida actual: ${newCurrHP}/${effMaxHP}.`;
      triggerDiceRoll('d10', player.level, `Segundo Aliento (+${hpHealed} HP)`, dieRoll);
      
      // Update HP immediately
      set((state) => ({
        players: state.players.map(p => p.id === targetId ? { ...p, hp: { ...p.hp, current: newCurrHP } } : p)
      }));
    } else if (normName.includes('inspiración bárdica') || normName.includes('bardic inspiration')) {
      const dieSize = player.level >= 15 ? 'd12' : player.level >= 10 ? 'd10' : player.level >= 5 ? 'd8' : 'd6';
      extraLog = ` ⭐ Otorga un ${dieSize} de Inspiración Bárdica a un aliado!`;
      triggerDiceRoll(dieSize as any, 0, `Inspiración Bárdica (${dieSize})`);
    } else if (normName.includes('acción oleada') || normName.includes('action surge')) {
      extraLog = ` ⚡ Gana 1 Acción adicional en su turno!`;
      triggerDiceRoll('d20', 0, `Acción Oleada (${player.name})`);
    } else if (normName.includes('recuperación arcana')) {
      extraLog = ` 🔮 Puede recuperar espacios de conjuro de nivel total <= ${Math.ceil(player.level / 2)}.`;
    } else {
      triggerDiceRoll('d20', 0, `${featDef.name} (${player.name})`);
    }

    const usageMsg = hasLimit ? ` (${newUses}/${featDef.maxUses} usos)` : '';
    const fullMessage = `⚡ ${player.name} usó la acción de clase: "${featDef.name}"${usageMsg}.${extraLog}`;

    get().addLog(fullMessage);
    if (player.roomId) {
      addRoomLog(player.roomId, fullMessage);
    }

    // Update customClassFeatures list to persist usages for both custom & official features
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const currentCustom = p.customClassFeatures || [];
        const matchName = (a: string, b: string) => {
          const cleanA = a.toLowerCase().split('(')[0].trim();
          const cleanB = b.toLowerCase().split('(')[0].trim();
          return cleanA === cleanB || a.toLowerCase() === b.toLowerCase();
        };

        const exists = currentCustom.some(f => matchName(f.name, featDef!.name));

        let updatedList: ClassFeature[];
        if (exists) {
          updatedList = currentCustom.map(f => matchName(f.name, featDef!.name) ? { ...f, currentUses: newUses } : f);
        } else {
          updatedList = [...currentCustom, { ...featDef!, currentUses: newUses }];
        }
        updatedChar = { ...p, customClassFeatures: updatedList };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  togglePlayerDeathState: (playerId, status, healHP = 1) => {
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        let isDying = false;
        let isStable = false;
        let isDead = false;
        let deathSaves = { successes: 0, failures: 0 };
        let newHP = { ...p.hp };

        if (status === 'dying') {
          isDying = true;
          newHP.current = 0;
          get().addLog(`🩸 El DM ha marcado a ${p.name} como MORIBUNDO (0 HP).`);
        } else if (status === 'stable') {
          isStable = true;
          newHP.current = 0;
          get().addLog(`🛡️ El DM ha ESTABILIZADO a ${p.name} a 0 HP.`);
        } else if (status === 'revive') {
          const effMax = p.hp.max + p.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
          newHP.current = Math.min(effMax, Math.max(1, healHP));
          get().addLog(`💖 El DM ha REVIVIDO a ${p.name} con ${newHP.current} HP.`);
        } else if (status === 'dead') {
          isDead = true;
          newHP.current = 0;
          deathSaves = { successes: 0, failures: 3 };
          get().addLog(`☠️ El DM ha marcado a ${p.name} como FALLECIDO.`);
        }

        if (p.roomId) {
          addRoomLog(p.roomId, `⚙️ El DM actualizó el estado de salud de ${p.name}.`);
        }

        updatedChar = {
          ...p,
          hp: newHP,
          isDying,
          isStable,
          isDead,
          deathSaves
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  lastLevelUpEvent: null,

  levelUpPlayer: (playerId, targetRoomId, method = 'fixed') => {
    let activeRoomId = typeof targetRoomId === 'string' ? targetRoomId : undefined;
    if (!activeRoomId && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        activeRoomId = match[1];
      }
    }

    let updatedPlayer: CharacterState | null = null;
    let event: LevelUpEvent | null = null;

    set((state) => {
      const p = state.players.find(char => char.id === playerId);
      if (!p) return state;

      const oldLevel = p.level;
      const newLevel = Math.min(20, oldLevel + 1);
      const newProf = Math.floor((newLevel - 1) / 4) + 2;
      
      const hpCalc = calculateLevelUpHPGain(p.charClass, p.stats.con, method);
      const hpGain = hpCalc.gain;
      const newMaxHP = p.hp.max + hpGain;
      const newCurrentHP = p.hp.current + hpGain;

      const currentHD = getCharacterHitDice(p);
      const newHD = {
        die: currentHD.die,
        max: newLevel,
        current: currentHD.current + 1
      };

      const updatedSpellSlots = { ...p.spellSlots };
      if (newLevel === 2 && updatedSpellSlots[1]) {
        updatedSpellSlots[1] = { max: 3, current: Math.min(3, updatedSpellSlots[1].current + 1) };
      } else if (newLevel === 3) {
        if (updatedSpellSlots[1]) updatedSpellSlots[1] = { max: 4, current: 4 };
        updatedSpellSlots[2] = { max: 2, current: 2 };
      } else if (newLevel === 4 && updatedSpellSlots[2]) {
        updatedSpellSlots[2] = { max: 3, current: 3 };
      } else if (newLevel === 5) {
        updatedSpellSlots[3] = { max: 2, current: 2 };
      }

      updatedPlayer = {
        ...p,
        level: newLevel,
        proficiencyBonus: newProf,
        hp: {
          ...p.hp,
          max: newMaxHP,
          current: newCurrentHP
        },
        hitDice: newHD,
        spellSlots: updatedSpellSlots
      };

      event = {
        id: Date.now().toString() + Math.random(),
        timestamp: Date.now(),
        playerId: p.id,
        targetPlayerIds: [p.id],
        playerName: p.name,
        newLevel,
        oldLevel
      };

      const conSign = hpCalc.conMod >= 0 ? `+${hpCalc.conMod}` : `${hpCalc.conMod}`;
      const methodText = hpCalc.isRoll 
        ? `Tirada 1d${hpCalc.hitDie} [${hpCalc.dieValue}] ${conSign} CON = +${hpGain} HP`
        : `Fijo ${hpCalc.dieValue} + CON ${conSign} = +${hpGain} HP`;

      if (hpCalc.isRoll) {
        triggerDiceRoll(('d' + hpCalc.hitDie) as any, hpCalc.conMod, `Subida Nivel ${p.name} (+${hpGain} HP)`, hpCalc.dieValue);
      }

      get().addLog(`ASCENSO CELESTIAL: El DM ha elevado a ${p.name} al Nivel ${newLevel} (${methodText}). Vida Máxima aumentada a ${newMaxHP} ${get().hpTerminology}. Dados de Golpe: ${newHD.current}/${newHD.max} (d${newHD.die}).`);

      return {
        lastLevelUpEvent: event,
        players: state.players.map(char => char.id === playerId ? updatedPlayer! : char)
      };
    });

    const playerToSave = updatedPlayer as CharacterState | null;
    if (activeRoomId && playerToSave && event && playerToSave.roomId === activeRoomId && !isDemoPlayer(playerToSave.id)) {
      savePlayerInRoom(activeRoomId, playerToSave);
      updateRoomState(activeRoomId, { lastLevelUpEvent: event });
    }
  },

  levelUpParty: (targetRoomId, method = 'fixed') => {
    let activeRoomId = typeof targetRoomId === 'string' ? targetRoomId : undefined;
    if (!activeRoomId && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        activeRoomId = match[1];
      }
    }

    let updatedPlayers: CharacterState[] = [];
    let event: LevelUpEvent | null = null;

    set((state) => {
      if (state.players.length === 0) return state;

      const now = Date.now();
      const presentPlayers = state.players.filter(p => {
        if (p.isOnline === false) return false;
        if (p.lastSeen && (now - p.lastSeen) > 45000) return false;
        return true;
      });
      const targetIds = presentPlayers.length > 0 ? presentPlayers.map(p => p.id) : state.players.map(p => p.id);

      let maxNewLvl = 1;
      updatedPlayers = state.players.map(p => {
        if (!targetIds.includes(p.id)) return p;

        const oldLevel = p.level;
        const newLevel = Math.min(20, oldLevel + 1);
        if (newLevel > maxNewLvl) maxNewLvl = newLevel;
        const newProf = Math.floor((newLevel - 1) / 4) + 2;

        const hpCalc = calculateLevelUpHPGain(p.charClass, p.stats.con, method);
        const hpGain = hpCalc.gain;
        const newMaxHP = p.hp.max + hpGain;
        const newCurrentHP = p.hp.current + hpGain;

        const currentHD = getCharacterHitDice(p);
        const newHD = {
          die: currentHD.die,
          max: newLevel,
          current: currentHD.current + 1
        };

        const updatedSpellSlots = { ...p.spellSlots };
        if (newLevel === 2 && updatedSpellSlots[1]) {
          updatedSpellSlots[1] = { max: 3, current: Math.min(3, updatedSpellSlots[1].current + 1) };
        } else if (newLevel === 3) {
          if (updatedSpellSlots[1]) updatedSpellSlots[1] = { max: 4, current: 4 };
          updatedSpellSlots[2] = { max: 2, current: 2 };
        } else if (newLevel === 4 && updatedSpellSlots[2]) {
          updatedSpellSlots[2] = { max: 3, current: 3 };
        } else if (newLevel === 5) {
          updatedSpellSlots[3] = { max: 2, current: 2 };
        }

        const conSign = hpCalc.conMod >= 0 ? `+${hpCalc.conMod}` : `${hpCalc.conMod}`;
        const methodText = hpCalc.isRoll 
          ? `Tirada 1d${hpCalc.hitDie} [${hpCalc.dieValue}] ${conSign} CON = +${hpGain} HP`
          : `Fijo ${hpCalc.dieValue} + CON ${conSign} = +${hpGain} HP`;

        get().addLog(`ASCENSO: ${p.name} ascendió a Nivel ${newLevel} (${methodText}). Vida Máx: ${newMaxHP} ${get().hpTerminology}.`);

        return {
          ...p,
          level: newLevel,
          proficiencyBonus: newProf,
          hp: {
            ...p.hp,
            max: newMaxHP,
            current: newCurrentHP
          },
          hitDice: newHD,
          spellSlots: updatedSpellSlots
        };
      });

      event = {
        id: Date.now().toString() + Math.random(),
        timestamp: Date.now(),
        targetPlayerIds: targetIds,
        newLevel: maxNewLvl,
        oldLevel: maxNewLvl - 1,
        playerName: 'Toda la Party'
      };

      get().addLog(`🌟 ¡ASCENSO TOTAL DEL GRUPO! El DM ha elevado a todo el grupo a Nivel ${maxNewLvl} (Método: ${method === 'roll' ? 'Dados al Azar' : 'Promedio Fijo D&D 5e'}).`);

      return {
        lastLevelUpEvent: event,
        players: updatedPlayers
      };
    });

    if (activeRoomId && event) {
      updateRoomState(activeRoomId, { lastLevelUpEvent: event });
      updatedPlayers
        .filter(p => p.roomId === activeRoomId && !isDemoPlayer(p.id))
        .forEach(p => savePlayerInRoom(activeRoomId!, p));
    }
  },
    
  addItem: (item, isTemp, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    get().addLog(`Objeto añadido a ${activeChar.name} (${item.type}): ${item.name} x${item.quantity}`);
    const itemToAdd: Item = {
      ...item,
      equipped: item.equipped !== undefined ? item.equipped : false,
      isTemporary: isTemp || false,
      duration: isTemp ? (duration || null) : null
    };

    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        updatedChar = {
          ...p,
          inventory: [...p.inventory, itemToAdd]
        };
        return updatedChar;
      })
    }));

    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }

    if (isTemp) {
      get().addModifier({
        id: Date.now().toString(),
        name: `Objeto Temporal: ${item.name}`,
        description: `x${item.quantity} - ${item.description}`,
        duration: duration || null
      });
    }
  },

  updateItem: (itemId, updates) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const item = p.inventory.find(i => i.id === itemId);
        if (item) get().addLog(`Objeto editado en el inventario de ${p.name}: ${updates.name || item.name}`);
        updatedChar = {
          ...p,
          inventory: p.inventory.map(i => i.id === itemId ? { ...i, ...updates } : i)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  removeItem: (id) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const item = p.inventory.find(i => i.id === id);
        if (item) get().addLog(`Objeto retirado de ${p.name}: ${item.name}`);
        updatedChar = {
          ...p,
          inventory: p.inventory.filter(i => i.id !== id)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },
    
  addSpell: (spell, isTemp, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    get().addLog(`Conjuro aprendido por ${activeChar.name}: ${spell.name} (Nivel ${spell.level === 0 ? 'Truco' : spell.level})`);
    if (isTemp) {
      get().addModifier({
        id: Date.now().toString(),
        name: `Hechizo Temporal: ${spell.name}`,
        description: `Nivel ${spell.level} - ${spell.description}`,
        duration: duration || null
      });
    } else {
      let updatedChar: CharacterState | undefined;
      set((state) => ({
        players: state.players.map(p => {
          if (p.id !== activeId) return p;
          updatedChar = {
            ...p,
            spells: [...p.spells, spell]
          };
          return updatedChar;
        })
      }));
      if (updatedChar) {
        persistCharacterChanges(updatedChar, true);
      }
    }
  },

  updateSpell: (spellId, updates) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const spell = p.spells.find(s => s.id === spellId);
        if (spell) get().addLog(`Conjuro editado en el grimorio de ${p.name}: ${updates.name || spell.name}`);
        updatedChar = {
          ...p,
          spells: p.spells.map(s => s.id === spellId ? { ...s, ...updates } : s)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  removeSpell: (id) => {
    const activeId = get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const spell = p.spells.find(s => s.id === id);
        if (spell) get().addLog(`Conjuro olvidado por ${p.name}: ${spell.name}`);
        updatedChar = {
          ...p,
          spells: p.spells.filter(s => s.id !== id)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },
    
  addModifier: (mod, playerId) => {
    const targetId = playerId || get().activePlayerId;
    const targetChar = get().players.find(p => p.id === targetId);
    if (!targetChar) return;

    get().addLog(`Efecto añadido a ${targetChar.name}: ${mod.name} (${mod.duration ? mod.duration + ' turnos' : 'Perm'})`);
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        updatedChar = {
          ...p,
          modifiers: [...p.modifiers, mod]
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },

  removeModifier: (id, playerId) => {
    const targetId = playerId || get().activePlayerId;
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const mod = p.modifiers.find(m => m.id === id);
        if (mod) get().addLog(`Efecto retirado de ${p.name}: ${mod.name}`);
        updatedChar = {
          ...p,
          modifiers: p.modifiers.filter(m => m.id !== id)
        };
        return updatedChar;
      })
    }));
    if (updatedChar) {
      persistCharacterChanges(updatedChar, true);
    }
  },
    
  lastTurnEvent: null,
  advanceTurn: (targetRoomId) => {
    const event = { id: Date.now().toString() + Math.random(), timestamp: Date.now() };
    const { isCombatMode, initiativeOrder, currentTurnIndex, players } = get();

    let activeRoomId = typeof targetRoomId === 'string' ? targetRoomId : undefined;
    if (!activeRoomId && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        activeRoomId = match[1];
      }
    }

    if (isCombatMode && initiativeOrder.length > 0) {
      const now = Date.now();
      const activeOrder = initiativeOrder.filter(pid => {
        const p = players.find(player => player.id === pid);
        if (!p) return false;
        if (p.isOnline === false) return false;
        if (p.lastSeen && (now - p.lastSeen) > 45000) return false;
        return true;
      });

      const effectiveOrder = activeOrder.length > 0 ? activeOrder : initiativeOrder;
      const nextIndex = (currentTurnIndex + 1) % effectiveOrder.length;
      const isNewRound = nextIndex === 0;
      const nextPlayerId = effectiveOrder[nextIndex];
      const nextPlayer = players.find(p => p.id === nextPlayerId);

      if (isNewRound) {
        get().addLog(`🔄 ¡Ronda de combate completada! Se redujeron los turnos de efectos temporales.`);
      }
      get().addLog(`🗡️ Siguiente Turno: ${nextPlayer?.name || 'Jugador'} (Iniciativa ${nextPlayer?.initiative?.total || 0})`);

      const updatedPlayers = isNewRound 
        ? players.map(p => ({
            ...p,
            modifiers: p.modifiers
              .map(mod => {
                if (mod.duration === null) return mod;
                return { ...mod, duration: mod.duration - 1 };
              })
              .filter(mod => mod.duration === null || mod.duration > 0),
            inventory: p.inventory
              .map(item => {
                if (item.isTemporary && typeof item.duration === 'number') {
                  return { ...item, duration: item.duration - 1 };
                }
                return item;
              })
              .filter(item => !item.isConsumed && item.quantity > 0 && (!item.isTemporary || item.duration === null || (typeof item.duration === 'number' && item.duration > 0)))
          }))
        : players;

      set({
        lastTurnEvent: event,
        currentTurnIndex: nextIndex,
        players: updatedPlayers
      });

      if (activeRoomId) {
        updateRoomState(activeRoomId, {
          currentTurnIndex: nextIndex,
          lastTurnEvent: event
        });
        if (isNewRound) {
          updatedPlayers
            .filter(p => p.roomId === activeRoomId && !isDemoPlayer(p.id))
            .forEach(p => savePlayerInRoom(activeRoomId!, p));
        }
      }
    } else {
      get().addLog(`⏳ Tiempo avanzado: 1 Turno consumido para toda la Party.`);
      const updatedPlayers = players.map(p => ({
        ...p,
        modifiers: p.modifiers
          .map(mod => {
            if (mod.duration === null) return mod;
            return { ...mod, duration: mod.duration - 1 };
          })
          .filter(mod => mod.duration === null || mod.duration > 0),
        inventory: p.inventory
          .map(item => {
            if (item.isTemporary && typeof item.duration === 'number') {
              return { ...item, duration: item.duration - 1 };
            }
            return item;
          })
          .filter(item => !item.isConsumed && item.quantity > 0 && (!item.isTemporary || item.duration === null || (typeof item.duration === 'number' && item.duration > 0)))
      }));

      set({
        lastTurnEvent: event,
        players: updatedPlayers
      });

      if (activeRoomId) {
        updateRoomState(activeRoomId, {
          lastTurnEvent: event
        });
        updatedPlayers
          .filter(p => p.roomId === activeRoomId && !isDemoPlayer(p.id))
          .forEach(p => savePlayerInRoom(activeRoomId!, p));
      }
    }
  },
  
  logs: [],
  addLog: (message) => {
    set((state) => ({
      logs: [{ id: Date.now().toString() + Math.random(), message, timestamp: Date.now() }, ...state.logs].slice(0, 50)
    }));

    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        addRoomLog(match[1], message);
      }
    }
  }
}));

// Cross-tab synchronization via BroadcastChannel
if (typeof window !== 'undefined') {
  const channel = new BroadcastChannel('dnd_sync_channel');
  let isUpdatingFromSync = false;

  useStore.subscribe((state) => {
    if (!isUpdatingFromSync) {
      const dataToSync = {
        isCombatMode: state.isCombatMode,
        initiativeOrder: state.initiativeOrder,
        currentTurnIndex: state.currentTurnIndex,
        players: state.players,
        activePlayerId: state.activePlayerId,
        logs: state.logs,
        lastTurnEvent: state.lastTurnEvent
      };
      channel.postMessage(JSON.stringify(dataToSync));
    }
  });

  channel.onmessage = (event) => {
    isUpdatingFromSync = true;
    const incomingData = JSON.parse(event.data);
    useStore.setState(incomingData);
    isUpdatingFromSync = false;
  };
}
