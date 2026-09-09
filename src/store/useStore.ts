import { create } from 'zustand';
import { CLASS_SAVING_THROWS, calculateMaxHP, ClassFeature, CLASS_HIT_DIE, CLASS_STARTING_EQUIPMENT, CLASS_STARTING_SPELLS } from "@/lib/dndClassFeatures";
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

export const createDefaultCharacter = (
  id: string, 
  name: string, 
  race: string, 
  charClass: string, 
  background: string,
  level: number = 1,
  stats = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
  ownerId?: string,
  ownerName?: string,
  roomId?: string
): CharacterState => {
  const officialHP = calculateMaxHP(charClass || "Guerrero", level, stats.con);
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
    ac: 10 + Math.floor((stats.dex - 10) / 2),
    proficiencyBonus: officialProfBonus,
    stats,
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
    { name: "Segundo Viento", type: "active", unlockedAtLevel: 1, description: "Recuperas 1d10+5 HP como acción adicional.", usage: "1 por Descanso Corto" },
    { name: "Acción Oleada", type: "active", unlockedAtLevel: 2, description: "Realizas una acción adicional en tu turno.", usage: "1 por Descanso Corto" },
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

export interface StoreState {
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
  longRest: () => void;
  
  levelUpPlayer: (playerId: string, targetRoomId?: string) => void;
  levelUpParty: (targetRoomId?: string) => void;
  lastLevelUpEvent?: LevelUpEvent | null;

  hpTerminology: 'PG' | 'HP';
  setHPTerminology: (terminology: 'PG' | 'HP') => void;
  
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

  logs: LogEntry[];
  addLog: (message: string) => void;
  lastTurnEvent?: { id: string; timestamp: number } | null;
}

export const useStore = create<StoreState>((set, get) => ({
  hpTerminology: 'HP',
  setHPTerminology: (hpTerminology) => set({ hpTerminology }),
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
      alert(`⚠️ Ya existe un personaje llamado "${name.trim()}" en esta campaña. Por favor, elige un nombre único.`);
      return '';
    }
    const newId = 'player_' + Date.now();
    const newChar = createDefaultCharacter(newId, name, race, charClass, background, level, stats, ownerId, ownerName, roomId);
    set((state) => ({
      players: [...state.players, newChar],
      activePlayerId: newId
    }));
    get().addLog(`✨ ¡Nuevo aventurero creado!: ${newChar.name} (${newChar.race} ${newChar.charClass} Nivel ${newChar.level})`);
    return newId;
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
        return { ...p, currency: newCur };
      })
    }));
  },

  spendCurrency: (playerId, spend, reason) => {
    if (!spend) return;
    const targetId = playerId || get().activePlayerId;
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
        if (spendPP > 0) spentParts.push(`${spendPP} PP (Platino)`);
        if (spendGP > 0) spentParts.push(`${spendGP} GP (Oro)`);
        if (spendEP > 0) spentParts.push(`${spendEP} EP (Electrum)`);
        if (spendSP > 0) spentParts.push(`${spendSP} SP (Plata)`);
        if (spendCP > 0) spentParts.push(`${spendCP} CP (Cobre)`);

        if (spentParts.length > 0) {
          const reasonText = reason ? ` [${reason}]` : '';
          get().addLog(`💰 ${p.name} ha gastado ${spentParts.join(', ')}${reasonText}.`);
        }

        return { ...p, currency: newCur };
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

  addItemToPlayer: (playerId, item) => {
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        get().addLog(`El DM ha otorgado a ${p.name}: ${item.name} x${item.quantity}`);
        return { ...p, inventory: [...p.inventory, item] };
      })
    }));
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

  longRest: () => {
    const activeId = get().activePlayerId;
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== activeId) return p;
        get().addLog(`${p.name} tomó un Descanso Largo. Vida y Espacios de Hechizo recuperados.`);
        const newSlots: Record<number, SpellSlot> = {};
        Object.keys(p.spellSlots).forEach((lvlStr) => {
          const lvl = parseInt(lvlStr);
          newSlots[lvl] = { ...p.spellSlots[lvl], current: p.spellSlots[lvl].max };
        });
        const effMaxHP = p.hp.max + p.modifiers
          .filter(m => m.targetStat === 'hp_max')
          .reduce((acc, m) => acc + (m.value || 0), 0);

        return {
          ...p,
          hp: { ...p.hp, current: effMaxHP },
          spellSlots: newSlots
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
