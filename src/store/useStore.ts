import { create } from 'zustand';
import { CLASS_SAVING_THROWS, calculateMaxHP, ClassFeature, CLASS_HIT_DIE, CLASS_STARTING_EQUIPMENT, CLASS_STARTING_SPELLS, getClassFeaturesForLevel } from "@/lib/dndClassFeatures";
import { triggerDiceRoll } from "@/components/DiceRoller";
import { addRoomLog, updateRoomState, savePlayerInRoom } from "@/lib/rooms";

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
  updateActiveCharacter: (updates: Partial<CharacterState>) => void;
  toggleInspiration: (playerId?: string, status?: boolean) => void;
  updateStat: (stat: string, value: number, isPermanent: boolean, duration?: number) => void;
  setBaseStatScore: (stat: string, score: number) => void;
  updatePlayerStatsByDM: (playerId: string, stats: Partial<CharacterState['stats']>) => void;
  updatePlayerHPByDM: (playerId: string, hpUpdates: Partial<CharacterState['hp']>) => void;
  addItemToPlayer: (playerId: string, item: Item) => void;
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
  togglePinSkill: (skillName: string) => void;
  toggleEquipItem: (itemId: string) => void;
  useSpellSlot: (level: number) => void;
  restoreSpellSlot: (level: number) => void;
  setSpellSlotMax: (level: number, max: number) => void;
  shortRest: (playerId?: string) => void;
  longRest: (playerId?: string) => void;
  useClassFeature: (featureName: string, playerId?: string) => void;
  togglePlayerDeathState: (playerId: string, status: 'dying' | 'stable' | 'revive' | 'dead', healHP?: number) => void;
  lastItemReceivedEvent?: { id: string; roomId?: string; playerId: string; itemName: string; quantity: number; timestamp: number } | null;
  
  levelUpPlayer: (playerId: string, targetRoomId?: string) => void;
  levelUpParty: (targetRoomId?: string) => void;
  lastLevelUpEvent?: LevelUpEvent | null;

  hpTerminology: 'PG' | 'HP';
  setHPTerminology: (terminology: 'PG' | 'HP') => void;
  currencyMode: 'standard' | 'all';
  setCurrencyMode: (currencyMode: 'standard' | 'all') => void;
  convertPlayerCurrencyToStandard: (playerId: string) => void;
  deleteCharacter: (characterId: string) => void;
  assignCharacterToRoom: (characterId: string, roomId: string) => void;
  rehydrateLocalPlayers: () => void;
  
  addItem: (item: Item, isTemp: boolean, duration?: number) => void;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  removeItem: (id: string) => void;
  consumeItem: (id: string) => void;
  addSpell: (spell: Spell, isTemp: boolean, duration?: number) => void;
  updateSpell: (spellId: string, updates: Partial<Spell>) => void;
  removeSpell: (id: string) => void;
  addModifier: (mod: Modifier) => void;
  removeModifier: (id: string) => void;
  
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
        updatedPlayers.forEach(p => savePlayerInRoom(activeRoomId!, p));
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
    const existingNames = get().players.map(p => p.name.trim().toLowerCase());
    if (existingNames.includes(name.trim().toLowerCase())) {
      get().showAlert(`⚠️ Ya existe un personaje llamado "${name.trim()}" en esta campaña. Por favor, elige un nombre único.`, "Nombre Duplicado", "warning");
      return '';
    }
    const newId = 'player_' + Date.now();
    const newChar = createDefaultCharacter(newId, name, race, charClass, background, level, stats, ownerId, ownerName, roomId);
    set((state) => ({
      players: [...state.players, newChar],
      activePlayerId: newId
    }));
    get().addLog(`✨ ¡Nuevo aventurero creado!: ${newChar.name} (${newChar.race} ${newChar.charClass} Nivel ${newChar.level})`);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dnd_all_local_players', JSON.stringify(get().players));
      } catch (e) {}
    }
    return newId;
  },

  deleteCharacter: (characterId) => {
    const target = get().players.find(p => p.id === characterId);
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
        localStorage.setItem('dnd_all_local_players', JSON.stringify(get().players));
      } catch (e) {}
    }
  },

  assignCharacterToRoom: (characterId, roomId) => {
    const cleanRoomId = roomId.trim();
    let updatedChar: CharacterState | undefined;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== characterId) return p;
        updatedChar = { ...p, roomId: cleanRoomId };
        return updatedChar;
      })
    }));
    if (updatedChar && cleanRoomId) {
      savePlayerInRoom(cleanRoomId, updatedChar);
      get().addLog(`📌 Personaje "${updatedChar.name}" asignado exitosamente a la campaña: ${cleanRoomId}.`);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dnd_all_local_players', JSON.stringify(get().players));
      } catch (e) {}
    }
  },

  rehydrateLocalPlayers: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dnd_all_local_players');
        if (stored) {
          const parsed: CharacterState[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            set((state) => {
              const map = new Map<string, CharacterState>();
              state.players.forEach(p => map.set(p.id, p));
              parsed.forEach(p => {
                if (!map.has(p.id)) {
                  map.set(p.id, p);
                } else {
                  const existing = map.get(p.id)!;
                  map.set(p.id, {
                    ...existing,
                    ...p,
                    roomId: p.roomId || existing.roomId
                  });
                }
              });
              const merged = Array.from(map.values());
              const nextActive = state.activePlayerId || (merged[0]?.id || '');
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
  
  updateActiveCharacter: (updates) => {
    set((state) => ({
      players: state.players.map(p => p.id === state.activePlayerId ? { ...p, ...updates } : p)
    }));
  },

  toggleInspiration: (playerId, status) => {
    const targetId = playerId || get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const newStatus = status !== undefined ? status : !p.inspiration;
        get().addLog(newStatus ? `⭐ ${p.name} ha obtenido INSPIRACIÓN de D&D 5e.` : `⭐ ${p.name} ha usado/perdido su Inspiración.`);
        return { ...p, inspiration: newStatus };
      })
    }));
  },

  updateCurrency: (playerId, updates) => {
    if (!updates) return;
    const targetId = playerId || get().activePlayerId;
    let logMsg = '';
    let playerRoomId = '';
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
        playerRoomId = p.roomId || '';
        return { ...p, currency: newCur };
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
  },

  spendCurrency: (playerId, spend, reason) => {
    if (!spend) return;
    const targetId = playerId || get().activePlayerId;
    let logMsg = '';
    let playerRoomId = '';
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
          playerRoomId = p.roomId || '';
        }

        return { ...p, currency: newCur };
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
  },

  saveNotesToCharacter: (playerId, notes) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        return { ...p, notes: notes.slice(0, 10) };
      })
    }));
  },

  updatePlayerStatsByDM: (playerId, stats) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        get().addLog(`El DM ha actualizado las estadísticas base de ${p.name}.`);
        return { ...p, stats: { ...p.stats, ...stats } };
      })
    }));
  },

  updatePlayerHPByDM: (playerId, hpUpdates) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const newHP = { ...p.hp, ...hpUpdates };
        get().addLog(`El DM ha actualizado los Puntos de Vida de ${p.name} (${newHP.current}/${newHP.max} HP, ${newHP.temp || 0} Temp).`);
        return { ...p, hp: newHP };
      })
    }));
  },

  convertPlayerCurrencyToStandard: (playerId) => {
    let logMsg = '';
    let playerRoomId = '';
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
        playerRoomId = p.roomId || '';
        return { ...p, currency: newCur };
      })
    }));
    if (logMsg) {
      get().addLog(logMsg);
    }
  },

  addItemToPlayer: (playerId, item) => {
    let targetPlayer: CharacterState | undefined;
    const targetP = get().players.find(p => p.id === playerId);
    const event = {
      id: 'item_evt_' + Date.now(),
      roomId: targetP?.roomId || '',
      playerId,
      itemName: item.name,
      quantity: item.quantity,
      timestamp: Date.now()
    };
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        targetPlayer = p;
        get().addLog(`🎁 El DM ha otorgado a ${p.name}: ${item.name} x${item.quantity}`);
        return { ...p, inventory: [...p.inventory, item] };
      }),
      lastItemReceivedEvent: event
    }));
    if (targetPlayer?.roomId) {
      addRoomLog(targetPlayer.roomId, `🎁 El DM otorgó a ${targetPlayer.name} el objeto: "${item.name}" (x${item.quantity}).`);
      updateRoomState(targetPlayer.roomId, { lastItemReceivedEvent: event });
    }
  },

  removeItemFromPlayer: (playerId, itemId) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const item = p.inventory.find(i => i.id === itemId);
        if (item) get().addLog(`El DM ha retirado del inventario de ${p.name}: ${item.name}`);
        return { ...p, inventory: p.inventory.filter(i => i.id !== itemId) };
      })
    }));
  },

  addSpellToPlayer: (playerId, spell) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        get().addLog(`El DM ha otorgado el conjuro "${spell.name}" a ${p.name}.`);
        return { ...p, spells: [...p.spells, spell] };
      })
    }));
  },

  removeSpellToPlayer: (playerId, spellId) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const spell = p.spells.find(s => s.id === spellId);
        if (spell) get().addLog(`El DM ha eliminado el conjuro "${spell.name}" del grimorio de ${p.name}.`);
        return { ...p, spells: p.spells.filter(s => s.id !== spellId) };
      })
    }));
  },

  togglePlayerDeath: (playerId, status) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        const newDeadStatus = status !== undefined ? status : !p.isDead;
        get().addLog(newDeadStatus ? `☠️ ${p.name} ha fallecido.` : `✨ ${p.name} ha sido revivido por el DM.`);
        return { 
          ...p, 
          isDead: newDeadStatus,
          isDying: newDeadStatus ? false : false,
          isStable: newDeadStatus ? false : false,
          deathSaves: { successes: 0, failures: 0 },
          hp: { ...p.hp, current: newDeadStatus ? 0 : Math.max(1, p.hp.current) }
        };
      })
    }));
  },
  
  toggleEquipItem: (itemId) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const updatedInventory = p.inventory.map(item => {
          if (item.id === itemId) {
            const isEquipped = !item.equipped;
            get().addLog(`${p.name} ha ${isEquipped ? 'equipado' : 'desequipado'}: ${item.name}`);
            return { ...item, equipped: isEquipped };
          }
          return item;
        });
        return { ...p, inventory: updatedInventory };
      })
    }));
  },

  modifyHPMax: (amount, isPermanent, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    if (isPermanent) {
      get().addLog(`HP Máximo de ${activeChar.name} ajustado en ${amount > 0 ? '+'+amount : amount} permanentemente.`);
      set((state) => ({
        players: state.players.map(p => p.id === activeId ? {
          ...p,
          hp: {
            ...p.hp,
            max: Math.max(1, p.hp.max + amount),
            current: Math.max(1, p.hp.current + amount)
          }
        } : p)
      }));
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

      return {
        players: state.players.map(p => p.id === activeId ? {
          ...p,
          hp: { ...p.hp, current: newCurr },
          isDying,
          isStable,
          deathSaves,
          isDead
        } : p)
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
      // Runs WHEN player accepts the 3D dice roll result modal!
      const currentP = get().players.find(char => char.id === targetId);
      if (!currentP) return;

      let currentSuccesses = currentP.deathSaves?.successes || 0;
      let currentFailures = currentP.deathSaves?.failures || 0;

      if (dieValue === 20) {
        // Natural 20! Restore 1 HP & clear dying state IMMEDIATELY!
        get().addLog(`🌟 ¡CRÍTICO (20)! ${currentP.name} recupera 1 ${terminology} de inmediato y recobra la consciencia.`);
        set((state) => ({
          players: state.players.map(char => char.id === targetId ? {
            ...char,
            hp: { ...char.hp, current: 1 },
            isDying: false,
            isStable: false,
            isDead: false,
            deathSaves: { successes: 0, failures: 0 }
          } : char)
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
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              isDying: false,
              isStable: false,
              isDead: true,
              deathSaves: { successes: currentSuccesses, failures: 3 }
            } : char)
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
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              deathSaves: { successes: currentSuccesses, failures: currentFailures }
            } : char)
          }));
        }
      } else if (dieValue >= 10) {
        currentSuccesses += 1;
        get().addLog(`🟢 Éxito (${dieValue}): ${currentP.name} suma 1 Éxito contra la muerte (${currentSuccesses}/3).`);

        if (currentSuccesses >= 3) {
          get().addLog(`🛡️ ¡3 Éxitos acumulados! ${currentP.name} se ha ESTABILIZADO. Sigue inconsciente pero fuera de peligro.`);
          set((state) => ({
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              isDying: false,
              isStable: true,
              isDead: false,
              deathSaves: { successes: 0, failures: 0 }
            } : char)
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
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              deathSaves: { successes: currentSuccesses, failures: currentFailures }
            } : char)
          }));
        }
      } else {
        // Failure < 10
        currentFailures += 1;
        get().addLog(`🔴 Fallo (${dieValue}): ${currentP.name} suma 1 Fallo contra la muerte (${currentFailures}/3).`);

        if (currentFailures >= 3) {
          get().addLog(`☠️ ¡3 Fallos acumulados! ${currentP.name} ha fallecido definitivamente.`);
          set((state) => ({
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              isDying: false,
              isStable: false,
              isDead: true,
              deathSaves: { successes: currentSuccesses, failures: 3 }
            } : char)
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
            players: state.players.map(char => char.id === targetId ? {
              ...char,
              deathSaves: { successes: currentSuccesses, failures: currentFailures }
            } : char)
          }));
        }
      }
    });
  },

  stabilizePlayer: (playerId, healHP = 0) => {
    const targetId = playerId || get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        if (healHP > 0) {
          const effMax = p.hp.max + p.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
          const newCurr = Math.min(effMax, healHP);
          get().addLog(`🩹 ${p.name} recibió auxilio de un compañero/DM y recuperó ${newCurr} HP, recobrando la consciencia.`);
          return {
            ...p,
            hp: { ...p.hp, current: newCurr },
            isDying: false,
            isStable: false,
            isDead: false,
            deathSaves: { successes: 0, failures: 0 }
          };
        } else {
          get().addLog(`🩹 ${p.name} recibió primeros auxilios y se ha ESTABILIZADO a 0 HP.`);
          return {
            ...p,
            isDying: false,
            isStable: true,
            isDead: false,
            deathSaves: { successes: 0, failures: 0 }
          };
        }
      })
    }));
  },

  modifyAC: (amount, isPermanent, duration) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    if (isPermanent) {
      get().addLog(`CA de ${activeChar.name} ajustada en ${amount > 0 ? '+'+amount : amount} permanentemente.`);
      set((state) => ({
        players: state.players.map(p => p.id === activeId ? { ...p, ac: Math.max(1, p.ac + amount) } : p)
      }));
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
      get().addLog(`${stat.toUpperCase()} de ${activeChar.name} ajustado en ${value > 0 ? '+'+value : value} permanentemente.`);
      set((state) => ({
        players: state.players.map(p => p.id === activeId ? {
          ...p,
          stats: { ...p.stats, [stat]: (p.stats as any)[stat] + value }
        } : p)
      }));
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
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        get().addLog(`Puntuación base de ${stat.toUpperCase()} de ${p.name} fijada en ${score}.`);
        return {
          ...p,
          stats: { ...p.stats, [stat]: score }
        };
      })
    }));
  },

  addCustomClassFeature: (feature) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        get().addLog(`📜 ${p.name} recibió el rasgo por Lore/DM: ${feature.name}`);
        return {
          ...p,
          customClassFeatures: [...currentCustom, feature]
        };
      })
    }));
  },

  removeCustomClassFeature: (featureName) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        get().addLog(`Rasgo por Lore/DM retirado de ${p.name}: ${featureName}`);
        return {
          ...p,
          customClassFeatures: currentCustom.filter(f => f.name !== featureName)
        };
      })
    }));
  },

  updateCustomClassFeature: (oldName, feature) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const currentCustom = p.customClassFeatures || [];
        const exists = currentCustom.some(f => f.name === oldName);
        get().addLog(`Rasgo por Lore/DM actualizado en ${p.name}: ${feature.name}`);
        const updatedList = exists 
          ? currentCustom.map(f => f.name === oldName ? feature : f)
          : [...currentCustom, feature];
        return {
          ...p,
          customClassFeatures: updatedList
        };
      })
    }));
  },

  consumeItem: (itemId) => {
    const activeId = get().activePlayerId;
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

        return { ...p, inventory: updatedInventory };
      })
    }));
  },

  togglePinSkill: (skillName) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const isPinned = p.pinnedSkills.includes(skillName);
        const newPinned = isPinned 
          ? p.pinnedSkills.filter(s => s !== skillName)
          : [...p.pinnedSkills, skillName];
        return { ...p, pinnedSkills: newPinned };
      })
    }));
  },

  useSpellSlot: (level) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const slot = p.spellSlots[level];
        if (!slot || slot.current <= 0) return p;
        get().addLog(`${p.name} lanzó un hechizo usando un Espacio Nivel ${level} (${slot.current - 1}/${slot.max} restantes)`);
        return {
          ...p,
          spellSlots: {
            ...p.spellSlots,
            [level]: { ...slot, current: slot.current - 1 }
          }
        };
      })
    }));
  },

  restoreSpellSlot: (level) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const slot = p.spellSlots[level];
        if (!slot || slot.current >= slot.max) return p;
        return {
          ...p,
          spellSlots: {
            ...p.spellSlots,
            [level]: { ...slot, current: slot.current + 1 }
          }
        };
      })
    }));
  },

  setSpellSlotMax: (level, max) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => p.id === activeId ? {
        ...p,
        spellSlots: {
          ...p.spellSlots,
          [level]: { max, current: max }
        }
      } : p)
    }));
  },

  shortRest: (playerId) => {
    const targetId = playerId || get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        const updatedFeatures = (p.customClassFeatures || []).map(feat => {
          if (feat.resetOn === 'short' || feat.usage?.toLowerCase().includes('descanso corto')) {
            return { ...feat, currentUses: feat.maxUses !== undefined ? feat.maxUses : 1 };
          }
          return feat;
        });

        get().addLog(`☕ ${p.name} realizó un DESCANSO CORTO. Habilidades recuperadas.`);
        if (p.roomId) {
          addRoomLog(p.roomId, `☕ ${p.name} realizó un DESCANSO CORTO.`);
        }
        return {
          ...p,
          customClassFeatures: updatedFeatures
        };
      })
    }));
  },

  longRest: (playerId) => {
    const targetId = playerId || get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== targetId) return p;
        get().addLog(`⛺ ${p.name} tomó un DESCANSO LARGO. Vida, Espacios de Hechizo y Habilidades recuperados.`);
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

        if (p.roomId) {
          addRoomLog(p.roomId, `⛺ ${p.name} completó un DESCANSO LARGO.`);
        }

        return {
          ...p,
          hp: { ...p.hp, current: effMaxHP, temp: 0 },
          spellSlots: newSlots,
          customClassFeatures: updatedFeatures,
          isDying: false,
          isStable: false,
          isDead: false,
          deathSaves: { successes: 0, failures: 0 }
        };
      })
    }));
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
        return { ...p, customClassFeatures: updatedList };
      })
    }));
  },

  togglePlayerDeathState: (playerId, status, healHP = 1) => {
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

        return {
          ...p,
          hp: newHP,
          isDying,
          isStable,
          isDead,
          deathSaves
        };
      })
    }));
  },

  lastLevelUpEvent: null,

  levelUpPlayer: (playerId, targetRoomId) => {
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
      const hitDie = CLASS_HIT_DIE[p.charClass] || 8;
      const conMod = Math.floor((p.stats.con - 10) / 2);
      const hpGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
      const newMaxHP = p.hp.max + hpGain;
      const newCurrentHP = p.hp.current + hpGain;

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

      get().addLog(`ASCENSO CELESTIAL: El DM ha elevado a ${p.name} al Nivel ${newLevel}. Vida Máxima aumentada a ${newMaxHP} ${get().hpTerminology}.`);

      return {
        lastLevelUpEvent: event,
        players: state.players.map(char => char.id === playerId ? updatedPlayer! : char)
      };
    });

    if (activeRoomId && updatedPlayer && event) {
      savePlayerInRoom(activeRoomId, updatedPlayer);
      updateRoomState(activeRoomId, { lastLevelUpEvent: event });
    }
  },

  levelUpParty: (targetRoomId) => {
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

      // Identify active/present players
      const now = Date.now();
      const presentPlayers = state.players.filter(p => {
        if (p.isOnline === false) return false;
        if (p.lastSeen && (now - p.lastSeen) > 45000) return false;
        return true;
      });
      const targetIds = presentPlayers.length > 0 ? presentPlayers.map(p => p.id) : state.players.map(p => p.id);

      let maxNewLvl = 1;
      updatedPlayers = state.players.map(p => {
        if (!targetIds.includes(p.id)) return p; // Skip absent players

        const oldLevel = p.level;
        const newLevel = Math.min(20, oldLevel + 1);
        if (newLevel > maxNewLvl) maxNewLvl = newLevel;
        const newProf = Math.floor((newLevel - 1) / 4) + 2;
        const hitDie = CLASS_HIT_DIE[p.charClass] || 8;
        const conMod = Math.floor((p.stats.con - 10) / 2);
        const hpGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
        const newMaxHP = p.hp.max + hpGain;
        const newCurrentHP = p.hp.current + hpGain;

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

        return {
          ...p,
          level: newLevel,
          proficiencyBonus: newProf,
          hp: {
            ...p.hp,
            max: newMaxHP,
            current: newCurrentHP
          },
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

      get().addLog(`ASCENSO CELESTIAL: El DM ha elevado de nivel a los integrantes presentes de la Party.`);

      return {
        lastLevelUpEvent: event,
        players: updatedPlayers
      };
    });

    if (activeRoomId && event) {
      updateRoomState(activeRoomId, { lastLevelUpEvent: event });
      updatedPlayers.forEach(p => savePlayerInRoom(activeRoomId!, p));
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

    set((state) => ({
      players: state.players.map(p => p.id === activeId ? {
        ...p,
        inventory: [...p.inventory, itemToAdd]
      } : p)
    }));

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
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const item = p.inventory.find(i => i.id === itemId);
        if (item) get().addLog(`Objeto editado en el inventario de ${p.name}: ${updates.name || item.name}`);
        return {
          ...p,
          inventory: p.inventory.map(i => i.id === itemId ? { ...i, ...updates } : i)
        };
      })
    }));
  },

  removeItem: (id) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const item = p.inventory.find(i => i.id === id);
        if (item) get().addLog(`Objeto retirado de ${p.name}: ${item.name}`);
        return {
          ...p,
          inventory: p.inventory.filter(i => i.id !== id)
        };
      })
    }));
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
      set((state) => ({
        players: state.players.map(p => p.id === activeId ? {
          ...p,
          spells: [...p.spells, spell]
        } : p)
      }));
    }
  },

  updateSpell: (spellId, updates) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const spell = p.spells.find(s => s.id === spellId);
        if (spell) get().addLog(`Conjuro editado en el grimorio de ${p.name}: ${updates.name || spell.name}`);
        return {
          ...p,
          spells: p.spells.map(s => s.id === spellId ? { ...s, ...updates } : s)
        };
      })
    }));
  },

  removeSpell: (id) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const spell = p.spells.find(s => s.id === id);
        if (spell) get().addLog(`Conjuro olvidado por ${p.name}: ${spell.name}`);
        return {
          ...p,
          spells: p.spells.filter(s => s.id !== id)
        };
      })
    }));
  },
    
  addModifier: (mod) => {
    const activeId = get().activePlayerId;
    const activeChar = get().players.find(p => p.id === activeId);
    if (!activeChar) return;

    get().addLog(`Efecto añadido a ${activeChar.name}: ${mod.name} (${mod.duration ? mod.duration + ' turnos' : 'Perm'})`);
    set((state) => ({
      players: state.players.map(p => p.id === activeId ? {
        ...p,
        modifiers: [...p.modifiers, mod]
      } : p)
    }));
  },

  removeModifier: (id) => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        const mod = p.modifiers.find(m => m.id === id);
        if (mod) get().addLog(`Efecto retirado de ${p.name}: ${mod.name}`);
        return {
          ...p,
          modifiers: p.modifiers.filter(m => m.id !== id)
        };
      })
    }));
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
          updatedPlayers.forEach(p => savePlayerInRoom(activeRoomId!, p));
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
        updatedPlayers.forEach(p => savePlayerInRoom(activeRoomId!, p));
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
