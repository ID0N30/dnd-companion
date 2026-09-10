"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ItemType, Item, Spell } from "@/store/useStore";
import { getClassFeaturesForLevel, ClassFeature } from "@/lib/dndClassFeatures";
import DiceRoller, { triggerDiceRoll } from "@/components/DiceRoller";
import DMInboxFloatingButton from "@/components/DMInboxFloatingButton";
import TutorialModal from "@/components/TutorialModal";
import DMPage from "@/app/dm/page";
import { sendDirectMessageToDM, subscribeRoom, Room } from "@/lib/rooms";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import { 
  PenTool, Shield, Heart, Zap, Sparkles, BookOpen, Package, Clock, 
  Plus, Trash2, Pin, ChevronDown, ChevronUp, Sun, Sword, ShieldAlert, FlaskConical, Scroll, Briefcase, CheckCircle2, Circle, HelpCircle, User, Home, Search, Maximize2, X, Settings
} from "lucide-react";

const SKILLS_5E = [
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
];

export default function CharacterSheetPage({ isDM = false }: { isDM?: boolean } = {}) {
  const { 
    players, activePlayerId, setActivePlayerId, isCombatMode, initiativeOrder, currentTurnIndex,
    advanceTurn, addModifier, removeModifier, updateStat, setBaseStatScore, modifyHPMax, modifyHPCurrent, modifyAC,
    togglePinSkill, toggleEquipItem, useSpellSlot, restoreSpellSlot, setSpellSlotMax, shortRest, longRest, useClassFeature,
    addItem, updateItem, removeItem, addSpell, updateSpell, removeSpell, addCustomClassFeature, updateCustomClassFeature, removeCustomClassFeature, consumeItem,
    lastTurnEvent, lastItemReceivedEvent, rollDeathSave, stabilizePlayer, togglePlayerDeathState, hpTerminology, toggleInspiration, loadFamousDemoCharacter,
    updateCurrency, spendCurrency, convertPlayerCurrencyToStandard, showAlert, showConfirm
  } = useStore();

  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"sheet" | "dm">("sheet");
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  // New Feature & Interaction States
  const [restMenuOpen, setRestMenuOpen] = useState(false);
  const [featureFilter, setFeatureFilter] = useState<'all' | 'active' | 'passive' | 'short' | 'long'>('all');
  const [featureSearch, setFeatureSearch] = useState('');
  const [focusFeaturesModalOpen, setFocusFeaturesModalOpen] = useState(false);
  const [dmMessageModal, setDmMessageModal] = useState({ open: false, content: '' });
  const [itemToast, setItemToast] = useState<{ open: boolean; itemName: string; quantity: number } | null>(null);

  // Currency Modals State
  const [editCurrencyModalOpen, setEditCurrencyModalOpen] = useState(false);
  const [editCurrencyInput, setEditCurrencyInput] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const [spendInput, setSpendInput] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, reason: "" });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isDemo = params.get('demo') === 'true';
      setIsDemoMode(isDemo);
      if (isDemo) {
        loadFamousDemoCharacter();
      }
    }
  }, []);

  const character = players.find(p => p.id === activePlayerId) || players[0] || {
    id: 'default', name: 'Aventurero', race: 'Humano', charClass: 'Guerrero', background: 'Soldado', level: 1,
    hp: { current: 10, max: 10, temp: 0 }, ac: 14, proficiencyBonus: 2,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: ['str', 'con'], pinnedSkills: [], spellSlots: {}, inventory: [], spells: [], customClassFeatures: [], modifiers: []
  };

  const currentTurnPlayerId = initiativeOrder[currentTurnIndex];
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId);
  const isMyTurn = !isCombatMode || (currentTurnPlayerId === character.id);

  const [activeTab, setActiveTab] = useState<"stats" | "class_features" | "equipment" | "spells" | "notes">("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [turnToast, setTurnToast] = useState(false);

  useEffect(() => {
    if (character && character.roomId) {
      const unsub = subscribeRoom(character.roomId, setRoom);
      return () => unsub();
    }
  }, [character?.roomId]);

  useEffect(() => {
    if (
      lastItemReceivedEvent &&
      lastItemReceivedEvent.playerId === character.id &&
      (!lastItemReceivedEvent.roomId || lastItemReceivedEvent.roomId === character.roomId)
    ) {
      const eventKey = `seen_item_evt_${lastItemReceivedEvent.id || lastItemReceivedEvent.itemName + '_' + lastItemReceivedEvent.timestamp}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(eventKey)) {
        sessionStorage.setItem(eventKey, 'true');
        setItemToast({ open: true, itemName: lastItemReceivedEvent.itemName, quantity: lastItemReceivedEvent.quantity });
      }
    }
  }, [lastItemReceivedEvent, character.id, character.roomId]);

  useEffect(() => {
    const isStandard = (room?.currencyMode === 'standard' || useStore.getState().currencyMode === 'standard');
    if (isStandard && character?.id) {
      const cur = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
      if ((cur.pp || 0) > 0 || (cur.ep || 0) > 0) {
        convertPlayerCurrencyToStandard(character.id);
      }
    }
  }, [room?.currencyMode, character?.id, character?.currency?.pp, character?.currency?.ep, convertPlayerCurrencyToStandard]);

  // Private Personal Notes State (Stored strictly in localStorage for 100% DM privacy)
  type PersonalNote = {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt?: number;
    pinned?: boolean;
  };

  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [noteModal, setNoteModal] = useState<{ open: boolean; editingId: string | null; title: string; content: string }>({
    open: false, editingId: null, title: '', content: ''
  });

  useEffect(() => {
    if (!character || !character.id) return;
    try {
      if (character.notes && character.notes.length > 0) {
        setNotes(character.notes);
      } else {
        const stored = localStorage.getItem(`dnd_private_notes_${character.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotes(parsed);
          useStore.getState().saveNotesToCharacter(character.id, parsed);
        } else {
          setNotes([]);
        }
      }
    } catch (e) {
      console.error("Error al cargar notas personales", e);
    }
  }, [character.id, character.notes]);

  const saveNotesToStorage = (updatedNotes: PersonalNote[]) => {
    const limitedNotes = updatedNotes.slice(0, 10);
    setNotes(limitedNotes);
    if (character && character.id) {
      useStore.getState().saveNotesToCharacter(character.id, limitedNotes);
      try {
        localStorage.setItem(`dnd_private_notes_${character.id}`, JSON.stringify(limitedNotes));
      } catch (e) {
        console.error("Error al guardar notas personales", e);
      }
    }
  };

  const togglePinNote = (noteId: string) => {
    const updated = notes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n);
    saveNotesToStorage(updated);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModal.title.trim()) return;

    if (!noteModal.editingId && notes.length >= 10) {
      showAlert("Has alcanzado el límite máximo de 10 notas respaldadas en la nube para este personaje.", "Límite Alcanzado", "warning");
      return;
    }

    let newNotes: PersonalNote[];
    if (noteModal.editingId) {
      newNotes = notes.map(n => n.id === noteModal.editingId ? {
        ...n,
        title: noteModal.title.trim().slice(0, 60),
        content: noteModal.content.trim().slice(0, 1000),
        updatedAt: Date.now()
      } : n);
    } else {
      const newNote: PersonalNote = {
        id: Date.now().toString() + Math.random(),
        title: noteModal.title.trim().slice(0, 60),
        content: noteModal.content.trim().slice(0, 1000),
        createdAt: Date.now(),
        pinned: false
      };
      newNotes = [newNote, ...notes];
    }

    saveNotesToStorage(newNotes);
    setNoteModal({ open: false, editingId: null, title: '', content: '' });
  };

  const handleDeleteNote = (noteId: string) => {
    showConfirm(
      "¿Estás seguro de que deseas eliminar esta nota personal?",
      () => {
        const newNotes = notes.filter(n => n.id !== noteId);
        saveNotesToStorage(newNotes);
      },
      "Eliminar Nota Personal",
      "Sí, Eliminar",
      "Cancelar"
    );
  };

  // Skill Modifier Edit Modal (Pluma Mágica for all skills)
  const [skillEditModal, setSkillEditModal] = useState<{ open: boolean; skillName: string | null; value: number; turns: string }>({
    open: false, skillName: null, value: 0, turns: ""
  });

  const handleSkillEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillEditModal.skillName || skillEditModal.value === 0) return;
    const isPerm = skillEditModal.turns === "";
    const duration = isPerm ? undefined : parseInt(skillEditModal.turns);

    addModifier({
      id: Date.now().toString(),
      name: `Mod. ${skillEditModal.skillName} (${skillEditModal.value > 0 ? '+'+skillEditModal.value : skillEditModal.value})`,
      description: `Modificador de habilidad ajustado por Pluma Mágica`,
      duration: duration || null,
      targetStat: `skill_${skillEditModal.skillName}`,
      value: skillEditModal.value
    });

    setSkillEditModal({ open: false, skillName: null, value: 0, turns: "" });
  };

  const getEffectiveSkillMod = (skillName: string, statKey: string) => {
    const statVal = getEffectiveStat(statKey);
    const baseMod = getAbilityMod(statVal);
    const skillMods = (character.modifiers || [])
      .filter(m => m.targetStat === `skill_${skillName}` || m.targetStat === skillName)
      .reduce((acc, m) => acc + (m.value || 0), 0);
    return { baseMod, skillMods, totalMod: baseMod + skillMods };
  };

  useEffect(() => {
    if (lastTurnEvent) {
      setTurnToast(true);
      const timer = setTimeout(() => setTurnToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastTurnEvent]);

  // Salvation / Death Modal State
  const [salvationModal, setSalvationModal] = useState<{
    open: boolean;
    title: string;
    desc: string;
    type: 'salvation' | 'death' | 'moribundo';
    onConfirm?: () => void;
  }>({
    open: false, title: '', desc: '', type: 'salvation'
  });
  const [prevStatus, setPrevStatus] = useState<any>(null);

  useEffect(() => {
    if (!character || !character.id) return;
    if (prevStatus === null) {
      setPrevStatus({
        isDead: Boolean(character.isDead)
      });
      return;
    }

    const becameRevived = prevStatus.isDead && !character.isDead;

    if (becameRevived) {
      setSalvationModal({
        open: true,
        type: 'salvation',
        title: '✨ ¡RESURRECCIÓN CELESTIAL Y MILAGRO DIVINO! ✨',
        desc: `¡El Maestro de la Mazmorra (DM) ha invocado el poder sagrado para revivir a ${character.name}! Tu alma ha vuelto a tu cuerpo con ${character.hp.current} ${hpTerminology || 'HP'} y estás de regreso en el mundo de los vivos.`
      });
    }

    setPrevStatus({
      isDead: Boolean(character.isDead)
    });
  }, [character.isDead]);

  const getAbilityMod = (score: number) => Math.floor((score - 10) / 2);

  // Calculate effective stat including modifiers AND equipped items!
  const getEffectiveStat = (statName: string) => {
    if (statName === 'hp_max') {
      const base = character.hp.max;
      const modSum = character.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
      return base + modSum;
    }
    if (statName === 'ac') {
      const base = character.ac;
      const modSum = character.modifiers.filter(m => m.targetStat === 'ac').reduce((acc, m) => acc + (m.value || 0), 0);
      const itemACBonus = character.inventory
        .filter(i => i.equipped && i.acBonus)
        .reduce((acc, i) => acc + (i.acBonus || 0), 0);
      return base + modSum + itemACBonus;
    }
    const base = (character.stats as any)[statName] || 10;
    const modSum = character.modifiers.filter(m => m.targetStat === statName).reduce((acc, m) => acc + (m.value || 0), 0);
    return base + modSum;
  };

  // Modals & Inline Forms
  const [hpModal, setHPModal] = useState<{ open: boolean; type: 'current' | 'max'; amount: number; turns: string }>({ open: false, type: 'current', amount: 0, turns: "" });
  const [statEdit, setStatEdit] = useState<{ stat: string | null; value: number; turns: string }>({ stat: null, value: 0, turns: "" });
  const [statEditMode, setStatEditMode] = useState<"base" | "temp">("base");
  
  // Custom Feature Form (Lore / DM freedom)
  const [newFeature, setNewFeature] = useState({ name: "", type: "active" as "active" | "passive", usage: "", desc: "" });
  const [featureEditModal, setFeatureEditModal] = useState<{ open: boolean; oldName: string; name: string; type: 'active' | 'passive'; usage: string; desc: string }>({
    open: false, oldName: "", name: "", type: "active", usage: "", desc: ""
  });

  // Item Form
  const [newItem, setNewItem] = useState<{ name: string; type: ItemType; desc: string; qty: number; damage: string; acBonus: number; equipped: boolean; turns: string }>({
    name: "", type: "general", desc: "", qty: 1, damage: "", acBonus: 0, equipped: false, turns: ""
  });
  const [inventoryFilter, setInventoryFilter] = useState<ItemType | 'all'>('all');

  // Item & Spell Edit Modal State (Pluma Mágica)
  const [itemEditModal, setItemEditModal] = useState<{ open: boolean; item: Item | null }>({ open: false, item: null });
  const [spellEditModal, setSpellEditModal] = useState<{ open: boolean; spell: Spell | null }>({ open: false, spell: null });

  const handleItemEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditModal.item || !itemEditModal.item.name.trim()) return;
    updateItem(itemEditModal.item.id, itemEditModal.item);
    setItemEditModal({ open: false, item: null });
  };

  const handleSpellEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellEditModal.spell || !spellEditModal.spell.name.trim()) return;
    updateSpell(spellEditModal.spell.id, spellEditModal.spell);
    setSpellEditModal({ open: false, spell: null });
  };

  // Spell Form & Slots
  const [newSpell, setNewSpell] = useState({ name: "", level: 1, school: "Evocación", desc: "", castingTime: "1 Acción", turns: "" });
  const [newSlotLevel, setNewSlotLevel] = useState(1);
  const [newSlotMax, setNewSlotMax] = useState(2);

  const handleStatSave = () => {
    if (!statEdit.stat) return;
    if (statEdit.stat === 'ac') {
      const isPerm = statEdit.turns === "";
      const duration = isPerm ? undefined : parseInt(statEdit.turns);
      modifyAC(statEdit.value, isPerm, duration);
    } else {
      if (statEditMode === "base") {
        setBaseStatScore(statEdit.stat, statEdit.value);
      } else {
        const isPerm = statEdit.turns === "";
        const duration = isPerm ? undefined : parseInt(statEdit.turns);
        updateStat(statEdit.stat, statEdit.value, isPerm, duration);
      }
    }
    setStatEdit({ stat: null, value: 0, turns: "" });
  };

  const handleAddCustomFeature = () => {
    if (!newFeature.name || !newFeature.desc) return;
    addCustomClassFeature({
      name: newFeature.name,
      type: newFeature.type,
      unlockedAtLevel: character.level,
      description: newFeature.desc,
      usage: newFeature.usage || undefined
    });
    showAlert(`📜 Libertad de Campaña / Lore DM: Se ha otorgado el rasgo "${newFeature.name}" a ${character.name}.`, "Rasgo Otorgado", "success");
    setNewFeature({ name: "", type: "active", usage: "", desc: "" });
  };

  const handleHPSave = () => {
    if (hpModal.amount === 0) return;
    if (hpModal.type === 'current') {
      modifyHPCurrent(hpModal.amount);
    } else {
      const isPerm = hpModal.turns === "";
      const duration = isPerm ? undefined : parseInt(hpModal.turns);
      modifyHPMax(hpModal.amount, isPerm, duration);
    }
    setHPModal({ open: false, type: 'current', amount: 0, turns: "" });
  };

  const handleAddItem = () => {
    if (!newItem.name) return;
    const isPerm = newItem.turns === "";
    const duration = isPerm ? undefined : parseInt(newItem.turns);
    addItem({
      id: Date.now().toString(),
      name: newItem.name,
      type: newItem.type,
      description: newItem.desc,
      quantity: newItem.qty,
      damage: newItem.type === 'weapon' ? newItem.damage : undefined,
      acBonus: newItem.type === 'armor' ? newItem.acBonus : undefined,
      equipped: newItem.equipped
    }, !isPerm, duration);
    setNewItem({ name: "", type: "general", desc: "", qty: 1, damage: "", acBonus: 0, equipped: false, turns: "" });
  };

  const handleAddSpell = () => {
    if (!newSpell.name) return;
    const isPerm = newSpell.turns === "";
    const duration = isPerm ? undefined : parseInt(newSpell.turns);
    addSpell({
      id: Date.now().toString(),
      name: newSpell.name,
      level: newSpell.level,
      school: newSpell.school,
      description: newSpell.desc,
      castingTime: newSpell.castingTime
    }, !isPerm, duration);
    setNewSpell({ name: "", level: 1, school: "Evocación", desc: "", castingTime: "1 Acción", turns: "" });
  };

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'weapon': return <Sword className="w-4 h-4 text-magic-red" />;
      case 'armor': return <ShieldAlert className="w-4 h-4 text-magic-gold" />;
      case 'consumable': return <FlaskConical className="w-4 h-4 text-emerald-400" />;
      case 'quest': return <Scroll className="w-4 h-4 text-purple-400" />;
      default: return <Briefcase className="w-4 h-4 text-ink-light" />;
    }
  };

  const effectiveMaxHP = getEffectiveStat('hp_max');
  const effectiveAC = getEffectiveStat('ac');
  const classFeatures = getClassFeaturesForLevel(character.charClass, character.level);
  const officialSavingThrows = character.savingThrows || ['str', 'con'];

  return (
    <main className={`min-h-screen p-2 md:p-6 lg:p-8 relative ${isCombatMode ? 'combat-vignette active' : ''}`}>
      
      {/* Floating Turn Toast Banner */}
      <AnimatePresence>
        {turnToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.8 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.9 }} 
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-magic-gold text-black px-4 md:px-6 py-2.5 rounded-full shadow-[0_0_25px_rgba(245,208,97,0.8)] font-sans font-bold flex items-center gap-2 text-xs md:text-sm border-2 border-white w-[90%] md:w-auto text-center justify-center"
          >
            <Clock className="w-5 h-5 animate-spin shrink-0" />
            <span>¡Pasó 1 Turno! Se actualizaron los efectos temporales.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Item Received Toast Banner */}
      <AnimatePresence>
        {itemToast && itemToast.open && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.8 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.9 }} 
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-magic-gold text-black px-5 py-3 rounded-xl shadow-[0_0_30px_rgba(245,208,97,0.9)] font-sans font-bold flex items-center justify-between gap-3 text-sm border-2 border-white w-[90%] md:w-auto"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 shrink-0 text-black animate-bounce" />
              <span>🎁 ¡Has recibido un nuevo objeto del DM: <strong>{itemToast.itemName}</strong> (x{itemToast.quantity})!</span>
            </div>
            <button 
              onClick={() => setItemToast(null)}
              className="px-3 py-1 bg-black text-white hover:bg-zinc-800 text-xs rounded-lg transition-colors shadow shrink-0 cursor-pointer"
            >
              ¡Entendido!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1300px] mx-auto bg-parchment-dark min-h-[90vh] rounded-sm border-4 md:border-[12px] border-ink/90 shadow-2xl relative p-3 sm:p-6 md:p-10 flex flex-col font-sans">
        
        {/* CHARACTER DEATH BANNER */}
        {character.isDead && (
          <div className="mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-red bg-black/90 text-white shadow-[0_0_30px_rgba(217,56,41,0.8)] font-sans flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">☠️</span>
              <div>
                <h3 className="font-bold text-lg text-magic-red font-cinzel tracking-wider">
                  ¡HÉROE FALLECIDO!
                </h3>
                <p className="text-xs text-ink-light">
                  {character.name} ha caído en combate y se encuentra sin vida. Solo el DM puede revivirlo desmarcando su muerte.
                </p>
              </div>
            </div>
            <span className="text-xs bg-magic-red text-white font-bold px-3 py-1 rounded uppercase animate-pulse">
              Incapaz de Actuar
            </span>
          </div>
        )}

        {/* CHARACTER MORIBUNDO BANNER */}
        {character.isDying && !character.isDead && (
          <div className="mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-red bg-red-950/90 text-white shadow-[0_0_30px_rgba(217,56,41,0.8)] font-sans flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🩸</span>
              <div>
                <h3 className="font-bold text-lg text-magic-gold font-cinzel tracking-wider flex items-center gap-2 flex-wrap">
                  ¡ESTADO MORIBUNDO (0 {hpTerminology || 'HP'})! <span className="text-xs bg-magic-red text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">Inconsciente</span>
                </h3>
                <p className="text-xs text-red-200">
                  Has caído a 0 puntos de golpe. Al inicio de cada turno debes lanzar una Salvación contra la Muerte (d20). Acumula 3 éxitos para estabilizarte o 3 fallos para morir.
                </p>

                {/* Counter tracker */}
                <div className="flex gap-4 sm:gap-6 mt-3 font-sans text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-emerald-500/40">
                    <span className="font-bold text-emerald-400">Éxitos (3):</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className="text-base">{i < (character.deathSaves?.successes || 0) ? '🟢' : '⚪'}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-magic-red/40">
                    <span className="font-bold text-magic-red">Fallos (3):</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className="text-base">{i < (character.deathSaves?.failures || 0) ? '🔴' : '⚪'}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => rollDeathSave(character.id, (modalData) => {
                  setSalvationModal({
                    open: true,
                    type: modalData.type,
                    title: modalData.title,
                    desc: modalData.desc
                  });
                })}
                disabled={isCombatMode && !isMyTurn}
                className={`px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow-[0_0_15px_rgba(245,208,97,0.8)] hover:bg-yellow-500 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer ${isCombatMode && !isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isCombatMode && !isMyTurn ? "Debes esperar a tu turno de combate" : "Lanzar d20 sin modificadores contra la muerte"}
              >
                🎲 Lanzar Salvación (d20)
              </button>
              <button
                onClick={() => stabilizePlayer(character.id, 1)}
                className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title={`Si un compañero te ayuda o cura, recuperas 1 ${hpTerminology || 'HP'} y la consciencia`}
              >
                🩹 Auxilio de Compañero (+1 {hpTerminology || 'HP'})
              </button>
            </div>
          </div>
        )}

        {/* CHARACTER ESTABILIZADO BANNER */}
        {character.isStable && !character.isDead && character.hp.current === 0 && (
          <div className="mb-4 sm:mb-6 p-4 rounded-lg border-4 border-magic-gold bg-black/90 text-white shadow-[0_0_20px_rgba(245,208,97,0.6)] font-sans flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h3 className="font-bold text-lg text-magic-gold font-cinzel tracking-wider">
                  ¡HÉROE ESTABILIZADO (0 {hpTerminology || 'HP'})!
                </h3>
                <p className="text-xs text-ink-light">
                  Alcanzaste 3 Éxitos o fuiste auxiliado. Estás inconsciente pero fuera de peligro mortal.
                </p>
              </div>
            </div>
            <button
              onClick={() => stabilizePlayer(character.id, 1)}
              className="px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              🩹 Recibir Curación (+1 {hpTerminology || 'HP'})
            </button>
          </div>
        )}

        {/* COMBAT TURN STATUS BANNER */}
        {isCombatMode && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-2 shadow-lg flex justify-between items-center flex-wrap gap-3 font-sans animate-fade-in transition-all bg-parchment border-magic-gold">
            <div className="flex items-center gap-3">
              <span className="text-xl sm:text-2xl">⚔️</span>
              <div>
                {isMyTurn ? (
                  <h3 className="font-bold text-sm sm:text-lg text-magic-gold flex items-center gap-2 flex-wrap">
                    ¡ES TU TURNO DE COMBATE! <span className="text-[10px] sm:text-xs bg-magic-gold text-black px-2 py-0.5 rounded font-bold uppercase animate-pulse">Acción Requerida</span>
                  </h3>
                ) : (
                  <h3 className="font-bold text-sm sm:text-base text-ink flex items-center gap-2">
                    Turno de: <span className="text-magic-gold">{currentTurnPlayer?.name || 'Otro Jugador'}</span>
                  </h3>
                )}
                <p className="text-xs text-ink-light">
                  {isMyTurn 
                    ? 'Realiza tu acción o ataque y presiona "¡Terminar mi Turno!"' 
                    : `Iniciativa actual: ${currentTurnPlayer?.initiative?.total || 0}. Por favor espera tu turno.`}
                </p>
              </div>
            </div>

            {character.initiative && (
              <div className="text-xs bg-ink/10 p-2 rounded border border-ink/20 font-sans w-full sm:w-auto text-center sm:text-left">
                <span className="text-ink-light block text-[10px] sm:text-xs">Tu Iniciativa:</span>
                <span className="font-bold text-magic-gold text-sm sm:text-base">
                  {character.initiative.total} <span className="text-[10px] text-ink-light font-normal">(Dado {character.initiative.die} + Mod DEX {character.initiative.dexMod >= 0 ? '+'+character.initiative.dexMod : character.initiative.dexMod})</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Header Navigation Bar */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2 font-sans border-b border-ink/10 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-parchment-dark text-ink hover:text-magic-gold rounded-lg border border-ink/20 text-xs font-bold transition shadow-sm"
              title="Volver a la página principal"
            >
              <Home className="w-3.5 h-3.5 text-magic-gold" /> Inicio
            </Link>

            <div className="flex bg-parchment-dark p-1 rounded-lg border border-ink/20 text-xs font-bold">
              <button
                onClick={() => setViewMode("sheet")}
                className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'sheet' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:text-magic-gold'}`}
              >
                <User className="w-3.5 h-3.5" /> Mi Hoja
              </button>
              {(isDemoMode || isDM) && (
                <button
                  onClick={() => setViewMode("dm")}
                  className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'dm' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:text-magic-gold'}`}
                >
                  <Shield className="w-3.5 h-3.5" /> Panel DM (Maestro)
                </button>
              )}
            </div>

            {isDemoMode && (
              <span className="text-xs bg-magic-gold/20 text-magic-gold border border-magic-gold/40 px-2.5 py-1 rounded font-bold font-cinzel">
                🏰 Mesa de Prueba (Demo & Práctica)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDmMessageModal({ open: true, content: '' })}
              className="flex items-center gap-1.5 bg-parchment-dark text-ink hover:text-magic-gold px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm border border-ink/20 transition cursor-pointer"
              title="Enviar mensaje directo o trasfondo al DM"
            >
              ✉️ Mensaje al DM
            </button>

            <button
              onClick={() => setTutorialOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-3.5 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition cursor-pointer border border-white/40"
            >
              <HelpCircle className="w-4 h-4" /> 📖 Tutorial de Inicio
            </button>
          </div>
        </div>

        {viewMode === "dm" && <DMPage />}
        {viewMode === "sheet" && (
          <div key="sheet-view">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 sm:border-b-4 border-ink pb-4 mb-6 sm:mb-8 gap-4">
              <div className="w-full md:w-auto">
                <div className="flex justify-between items-center md:justify-start gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-5xl font-bold text-ink drop-shadow-sm font-cinzel">{character.name || "Sin Nombre"}</h1>
                  
                  {/* Rests & Inspiration Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setRestMenuOpen(!restMenuOpen)}
                      className={`px-3 py-1.5 rounded-lg border-2 font-sans font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${character.inspiration ? 'bg-magic-gold text-black border-white shadow-[0_0_15px_rgba(245,208,97,0.8)]' : 'bg-parchment text-ink border-ink/20 hover:border-magic-gold'}`}
                    >
                      <Sparkles className={`w-4 h-4 ${character.inspiration ? 'fill-black text-black' : 'text-magic-gold'}`} />
                      <span>⛺ Descansos e Inspiración</span>
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    </button>

                    <AnimatePresence>
                      {restMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                          className="absolute left-0 mt-2 w-56 bg-parchment-dark border-2 border-magic-gold rounded-xl shadow-2xl p-2 z-40 font-sans space-y-1"
                        >
                          <button
                            onClick={() => {
                              toggleInspiration(character.id);
                              setRestMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${character.inspiration ? 'bg-magic-gold text-black' : 'hover:bg-ink/10 text-ink'}`}
                          >
                            <span className="flex items-center gap-2">⭐ Inspiración D&D 5e</span>
                            <span className="text-[10px]">{character.inspiration ? 'ACTIVO' : 'Inactivo'}</span>
                          </button>

                          <button
                            onClick={() => {
                              shortRest(character.id);
                              setRestMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-ink/10 text-ink transition cursor-pointer border-t border-ink/10"
                          >
                            ☕ Descanso Corto (1 hora)
                          </button>

                          <button
                            onClick={() => {
                              longRest(character.id);
                              setRestMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-ink/10 text-ink transition cursor-pointer"
                          >
                            ⛺ Descanso Largo (8 horas)
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {!isCombatMode && (
                  <p className="text-sm sm:text-xl text-ink-light font-sans mt-1">
                    Nivel {character.level} • {character.race} {character.charClass} • {character.background}
                  </p>
                )}
              </div>
          
          <div className="flex gap-4 sm:gap-6 items-center justify-between w-full md:w-auto pt-2 md:pt-0 border-t md:border-0 border-ink/10">
            {/* Armor Class (CA) */}
            <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-parchment-dark rounded-xl border-2 border-magic-gold/60 shadow-md min-w-[85px] sm:min-w-[100px] relative">
              <div className="flex items-center gap-1 mb-0.5">
                <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-magic-gold shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider font-cinzel text-ink">CA</span>
              </div>
              
              <span className={`font-bold text-2xl sm:text-3xl font-sans font-mono leading-none my-0.5 ${effectiveAC !== character.ac ? 'text-magic-gold' : 'text-ink'}`}>
                {effectiveAC}
              </span>

              <span className="text-[9px] text-ink-light font-sans font-semibold">Armadura</span>

              {isEditing && (
                <button
                  onClick={() => setStatEdit({ stat: 'ac', value: 0, turns: "" })}
                  className="absolute -top-2 -right-2 p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow"
                  title="Modificar Clase de Armadura"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Puntos de Vida (HP / PG) */}
            <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-parchment-dark rounded-xl border-2 border-magic-red/60 shadow-md min-w-[130px] sm:min-w-[150px] relative">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-magic-red fill-magic-red shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider font-cinzel text-ink">
                  {hpTerminology || 'HP'}
                </span>
                {character.hp.temp > 0 && (
                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/40 px-1.5 py-0.2 rounded">
                    +{character.hp.temp} Temp
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`font-bold text-2xl sm:text-3xl font-sans font-mono leading-none ${character.hp.current <= 0 ? 'text-magic-red animate-pulse' : 'text-ink'}`}>
                  {character.hp.current}
                </span>
                <span className="text-sm sm:text-base font-bold text-ink-light">/</span>
                <span className={`font-bold text-lg sm:text-xl font-sans font-mono ${effectiveMaxHP !== character.hp.max ? 'text-magic-gold' : 'text-ink-light'}`}>
                  {effectiveMaxHP}
                </span>
              </div>

              <div className="flex gap-1 justify-center mt-1.5 w-full">
                <button 
                  onClick={() => setHPModal({ open: true, type: 'current', amount: 0, turns: "" })}
                  className="text-[10px] bg-magic-red text-white px-2 py-0.5 sm:py-1 rounded font-sans font-bold hover:bg-red-700 transition cursor-pointer shadow-sm flex-1 text-center"
                  title="Ajustar HP Actual / Daño / Curación"
                >
                  +/- HP
                </button>
                {isEditing && (
                  <button 
                    onClick={() => setHPModal({ open: true, type: 'max', amount: 0, turns: "" })}
                    className="text-[10px] bg-parchment text-ink border border-ink/30 px-2 py-0.5 sm:py-1 rounded font-sans font-bold hover:bg-ink/10 transition cursor-pointer shadow-sm flex-1 text-center"
                    title="Modificar HP Máximo"
                  >
                    +Máx
                  </button>
                )}
              </div>
            </div>

            {/* Advance Turn Button (Only available in combat mode) */}
            {isCombatMode && (
              <button 
                onClick={() => advanceTurn()}
                disabled={character.isDead || !isMyTurn}
                className={`flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2.5 rounded shadow transition cursor-pointer font-sans min-h-[44px]
                  ${character.isDead 
                    ? 'bg-red-950 text-red-500 border border-red-800 cursor-not-allowed opacity-60' 
                    : (isMyTurn 
                        ? 'bg-magic-gold text-black hover:bg-yellow-500 shadow-[0_0_15px_rgba(245,208,97,0.8)]' 
                        : 'bg-ink/20 text-ink-light/50 border border-ink/10 cursor-not-allowed')}`}
                title={character.isDead ? "Tu personaje está muerto." : (!isMyTurn ? `Es el turno de ${currentTurnPlayer?.name}.` : "Terminar tu turno y avanzar.")}
              >
                <Clock className="w-4 h-4 shrink-0" /> 
                <span>{character.isDead ? "☠️ Fallecido" : (isMyTurn ? "¡Terminar Turno!" : "Esperando...")}</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-6 border-b border-ink/20 pb-4 font-sans">
          <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto scrollbar-none max-w-full">
            <button onClick={() => setActiveTab("stats")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t whitespace-nowrap cursor-pointer transition-colors ${activeTab === "stats" ? 'bg-ink text-parchment-dark' : 'text-ink hover:bg-ink/10'}`}><Zap className="w-4 h-4" /> Atributos y Salvaciones</button>
            <button onClick={() => setActiveTab("class_features")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t whitespace-nowrap cursor-pointer transition-colors ${activeTab === "class_features" ? 'bg-ink text-parchment-dark' : 'text-ink hover:bg-ink/10'}`}><Sparkles className="w-4 h-4 text-magic-gold" /> Acciones de Clase</button>
            <button onClick={() => setActiveTab("equipment")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t whitespace-nowrap cursor-pointer transition-colors ${activeTab === "equipment" ? 'bg-ink text-parchment-dark' : 'text-ink hover:bg-ink/10'}`}><Shield className="w-4 h-4" /> Equipamiento</button>
            <button onClick={() => setActiveTab("spells")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t whitespace-nowrap cursor-pointer transition-colors ${activeTab === "spells" ? 'bg-ink text-parchment-dark' : 'text-ink hover:bg-ink/10'}`}><BookOpen className="w-4 h-4" /> Hechizos</button>
            <button onClick={() => setActiveTab("notes")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t whitespace-nowrap cursor-pointer transition-colors ${activeTab === "notes" ? 'bg-ink text-parchment-dark' : 'text-ink hover:bg-ink/10'}`}><Scroll className="w-4 h-4 text-magic-gold" /> Notas</button>
          </div>
          
          <button 
            onClick={() => { setIsEditing(!isEditing); setStatEdit({stat:null, value:0, turns:""}); }}
            className={`shrink-0 ml-auto flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded border-2 whitespace-nowrap transition-colors shadow-sm cursor-pointer ${isEditing ? 'bg-magic-red text-white border-magic-red' : 'border-magic-gold text-magic-gold hover:bg-magic-gold/10'}`}
          >
            <PenTool className="w-4 h-4" /> {isEditing ? "Cerrar Edición" : "Pluma Mágica"}
          </button>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 relative">
          
          {/* HP Edit Modal */}
          <AnimatePresence>
            {hpModal.open && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
                <div className="bg-parchment-dark border-4 border-magic-red p-4 sm:p-6 rounded-lg shadow-2xl w-[95%] max-w-md font-sans">
                  <h3 className="font-bold text-xl sm:text-2xl mb-2 font-cinzel text-magic-gold">
                    {hpModal.type === 'current' ? 'Ajustar Vida Actual' : 'Modificar Vida Máxima'}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-light mb-4">
                    {hpModal.type === 'current' ? 'Usa valores positivos para curar o negativos para daño.' : 'Incrementa o reduce el límite máximo de HP del personaje.'}
                  </p>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold mb-1">Cantidad (+ o -)</label>
                      <input 
                        type="number" 
                        value={hpModal.amount || ''} 
                        onChange={e => setHPModal({ ...hpModal, amount: parseInt(e.target.value) || 0 })} 
                        className="w-full p-2 bg-parchment border border-ink/40 text-lg font-bold text-ink" 
                        placeholder="Ej. -5 o 4" 
                      />
                    </div>
                    {hpModal.type === 'max' && (
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1">Duración en Turnos (vacío = Perm)</label>
                        <input 
                          type="number" 
                          placeholder="Ej. 3 (vacío para permanente)" 
                          value={hpModal.turns} 
                          onChange={e => setHPModal({ ...hpModal, turns: e.target.value })} 
                          className="w-full p-2 bg-parchment border border-ink/40 text-ink text-sm" 
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 font-bold text-sm">
                    <button onClick={() => setHPModal({ open: false, type: 'current', amount: 0, turns: "" })} className="px-4 py-2 text-ink-light hover:text-ink">Cancelar</button>
                    <button onClick={handleHPSave} className="px-4 py-2 bg-magic-red text-white rounded shadow hover:bg-red-800">Guardar</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MORIBUNDO / DEATH / ANGELIC SALVATION EVENT MODAL */}
          <AnimatePresence>
            {salvationModal.open && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 30 }} 
                  animate={{ scale: 1, y: 0 }} 
                  exit={{ scale: 0.8, y: 30 }} 
                  className={`w-[95%] max-w-lg rounded-2xl p-6 sm:p-8 text-center font-sans shadow-2xl relative overflow-hidden border-4 ${
                    salvationModal.type === 'salvation'
                      ? 'bg-gradient-to-b from-sky-950 via-slate-900 to-amber-950 border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.9)] text-white'
                      : salvationModal.type === 'death'
                        ? 'bg-gradient-to-b from-black via-red-950 to-black border-magic-red shadow-[0_0_60px_rgba(217,56,41,0.9)] text-white'
                        : 'bg-gradient-to-b from-red-950 via-stone-900 to-black border-amber-500 shadow-[0_0_50px_rgba(217,56,41,0.7)] text-white'
                  }`}
                >
                  {/* Decorative Glow elements */}
                  <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-50 ${
                    salvationModal.type === 'salvation' ? 'bg-yellow-400' : 'bg-red-600'
                  }`}></div>
                  <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-50 ${
                    salvationModal.type === 'salvation' ? 'bg-sky-400' : 'bg-red-900'
                  }`}></div>

                  <div className="relative z-10 space-y-4">
                    <div className="text-5xl sm:text-6xl animate-bounce">
                      {salvationModal.type === 'salvation' ? '🕊️ ✨ 👼' : salvationModal.type === 'death' ? '☠️ 💀 🗡️' : '🩸 ⏳ 💔'}
                    </div>

                    <h2 className={`text-2xl sm:text-3xl font-bold font-cinzel tracking-wider drop-shadow-md ${
                      salvationModal.type === 'salvation'
                        ? 'text-yellow-300 drop-shadow-[0_2px_15px_rgba(250,204,21,0.9)]'
                        : 'text-magic-red drop-shadow-[0_2px_15px_rgba(217,56,41,0.9)]'
                    }`}>
                      {salvationModal.title}
                    </h2>

                    <p className={`text-sm sm:text-base leading-relaxed ${
                      salvationModal.type === 'salvation' ? 'text-sky-100 font-sans' : 'text-red-100 font-sans'
                    }`}>
                      {salvationModal.desc}
                    </p>

                    {salvationModal.type === 'salvation' && (
                      <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-xs text-yellow-200 italic font-cinzel">
                        "La gracia divina envuelve tu alma. Recuperas la respiración y el fuego de la vida renace en tu pecho."
                      </div>
                    )}

                    {salvationModal.type === 'death' && (
                      <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-200 italic font-cinzel">
                        "El velo entre este mundo y el más allá se ha cerrado. Tu cuerpo cae inerte pero tu nombre quedará en la leyenda."
                      </div>
                    )}

                    <div className="pt-4">
                      <button
                        onClick={() => setSalvationModal({ ...salvationModal, open: false })}
                        className={`w-full py-3 rounded-xl font-bold font-cinzel text-base tracking-wider transition-all transform hover:scale-105 cursor-pointer shadow-lg ${
                          salvationModal.type === 'salvation'
                            ? 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                            : 'bg-gradient-to-r from-red-700 via-magic-red to-red-800 text-white hover:brightness-110 shadow-[0_0_20px_rgba(217,56,41,0.8)]'
                        }`}
                      >
                        {salvationModal.type === 'salvation' ? '✨ Aceptar la Luz Divina ✨' : salvationModal.type === 'death' ? '☠️ Entender mi Destino ☠️' : '🩸 Enfrentar a la Muerte 🩸'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stat Edit Modal */}
          <AnimatePresence>
            {statEdit.stat && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
                <div className="bg-parchment-dark border-4 border-magic-gold p-4 sm:p-6 rounded-lg shadow-2xl w-[95%] max-w-md font-sans">
                  <h3 className="font-bold text-xl sm:text-2xl mb-1 font-cinzel text-magic-gold uppercase">
                    Ajustar {statEdit.stat}
                  </h3>
                  <p className="text-xs text-ink-light mb-4">
                    Puntuación actual base: <span className="font-bold text-ink">{character.stats[statEdit.stat as keyof typeof character.stats] || 10}</span>
                  </p>

                  {/* Mode Selector */}
                  <div className="flex gap-2 mb-4 bg-parchment p-1 rounded border border-ink/20 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setStatEditMode("base");
                        const currentBase = character.stats[statEdit.stat as keyof typeof character.stats] || 10;
                        setStatEdit({ ...statEdit, value: currentBase });
                      }}
                      className={`flex-1 py-1.5 rounded transition cursor-pointer ${statEditMode === "base" ? 'bg-magic-gold text-black shadow' : 'text-ink hover:bg-ink/10'}`}
                    >
                      Puntuación Base Perm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatEditMode("temp");
                        setStatEdit({ ...statEdit, value: 0 });
                      }}
                      className={`flex-1 py-1.5 rounded transition cursor-pointer ${statEditMode === "temp" ? 'bg-magic-gold text-black shadow' : 'text-ink hover:bg-ink/10'}`}
                    >
                      Modificador Temporal
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {statEditMode === "base" ? (
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1">Nueva Puntuación Base (Ej. 16)</label>
                        <input 
                          type="number" 
                          value={statEdit.value || ''} 
                          onChange={e => setStatEdit({ ...statEdit, value: parseInt(e.target.value) || 0 })} 
                          className="w-full p-2 bg-parchment border border-ink/40 text-lg font-bold text-ink" 
                          placeholder="Ej. 16" 
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1">Cantidad del Modificador (+ o -)</label>
                          <input 
                            type="number" 
                            value={statEdit.value || ''} 
                            onChange={e => setStatEdit({ ...statEdit, value: parseInt(e.target.value) || 0 })} 
                            className="w-full p-2 bg-parchment border border-ink/40 text-lg font-bold text-ink" 
                            placeholder="Ej. 2 o -1" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1">Duración en Turnos (vacío = Perm)</label>
                          <input 
                            type="number" 
                            placeholder="Ej. 3 (vacío para permanente)" 
                            value={statEdit.turns} 
                            onChange={e => setStatEdit({ ...statEdit, turns: e.target.value })} 
                            className="w-full p-2 bg-parchment border border-ink/40 text-ink text-sm" 
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 font-bold text-sm">
                    <button onClick={() => setStatEdit({ stat: null, value: 0, turns: "" })} className="px-4 py-2 text-ink-light hover:text-ink">Cancelar</button>
                    <button onClick={handleStatSave} className="px-4 py-2 bg-magic-gold text-black rounded shadow hover:bg-yellow-500 font-bold">Guardar</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: STATS & OFFICIAL SAVING THROWS */}
          <AnimatePresence mode="wait">
            {activeTab === "stats" && (
              <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                
                {/* 6 Core Stats & Saving Throws */}
                <div className="col-span-1 space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold border-b border-ink/20 pb-2 flex justify-between items-center font-cinzel">
                    <span>Atributos</span>
                    <span className="text-xs text-ink-light font-sans font-normal">Competencia: +{character.proficiencyBonus}</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-1 gap-2.5 sm:gap-3">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => {
                      const baseVal = character.stats[stat] || 10;
                      const effective = getEffectiveStat(stat);
                      const mod = getAbilityMod(effective);
                      const isProficientSave = officialSavingThrows.includes(stat);
                      const saveBonus = mod + (isProficientSave ? character.proficiencyBonus : 0);

                      return (
                        <div key={stat} className="bg-parchment p-2.5 sm:p-3 border border-ink/10 rounded relative group">
                          {isEditing && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStatEdit({ stat, value: 0, turns: "" }); }} 
                              className="absolute -top-1 -right-1 p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow z-10"
                              title={`Editar atributo ${stat.toUpperCase()}`}
                            >
                              <Plus className="w-3.5 h-3.5"/>
                            </button>
                          )}
                          <div 
                            onClick={() => triggerDiceRoll('d20', mod, `Prueba de ${stat.toUpperCase()} (${character.name})`)}
                            className="flex flex-col lg:flex-row justify-between items-center cursor-pointer hover:bg-ink/5 p-1 rounded transition"
                            title={`Hacer clic para lanzar d20 + ${mod}`}
                          >
                            <div>
                              <span className="font-bold uppercase tracking-wider text-xs sm:text-sm block flex items-center gap-1">
                                🎲 {stat}
                              </span>
                              <span className="text-[10px] text-ink-light font-sans block">Mod: {mod >= 0 ? `+${mod}` : mod}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1 lg:mt-0">
                              {effective !== baseVal && (
                                <span className="text-[10px] font-sans font-bold text-magic-red">({effective > baseVal ? '+'+(effective-baseVal) : (effective-baseVal)})</span>
                              )}
                              <span className={`text-xl sm:text-2xl font-serif font-bold ${effective !== baseVal ? 'text-magic-gold drop-shadow-md' : ''}`}>{effective}</span>
                            </div>
                          </div>

                          {/* Official 2 Class Saving Throws Display (Clickable) */}
                          <div 
                            onClick={() => triggerDiceRoll('d20', saveBonus, `Salvaguardia: ${stat.toUpperCase()} (${character.name})`)}
                            className="mt-2 pt-1.5 border-t border-ink/10 flex justify-between items-center text-[10px] font-sans cursor-pointer hover:bg-ink/5 p-1 rounded transition"
                            title={`Tirada de Salvación ${stat.toUpperCase()}: d20 + ${saveBonus}`}
                          >
                            <span className="text-ink-light">Salvación ({stat.toUpperCase()}):</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded ${isProficientSave ? 'bg-magic-gold text-black' : 'bg-ink/10 text-ink'}`}>
                              {saveBonus >= 0 ? `+${saveBonus}` : saveBonus} {isProficientSave && '✦'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Skills & Modifiers Section */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold border-b border-ink/20 pb-2 mb-4 flex justify-between items-center font-cinzel">
                      <span>Habilidades Destacadas</span>
                      <button 
                        onClick={() => setShowAllSkills(!showAllSkills)}
                        className="text-xs sm:text-sm text-magic-gold flex items-center gap-1 hover:underline font-sans font-normal cursor-pointer"
                      >
                        {showAllSkills ? 'Ocultar Lista' : 'Ver las 18 Habilidades'} 
                        {showAllSkills ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-sans mb-4">
                      {character.pinnedSkills.map(skillName => {
                        const skillDef = SKILLS_5E.find(s => s.name === skillName) || { stat: 'str' };
                        const { baseMod, skillMods, totalMod } = getEffectiveSkillMod(skillName, skillDef.stat);
                        return (
                          <div 
                            key={skillName} 
                            onClick={() => triggerDiceRoll('d20', totalMod, `Prueba de ${skillName} (${character.name})`)}
                            className="p-2.5 bg-parchment border-l-4 border-magic-gold rounded flex justify-between items-center shadow-sm cursor-pointer hover:bg-ink/5 transition relative group"
                            title={`Lanzar d20 + ${totalMod} para ${skillName}`}
                          >
                            <div className="truncate">
                              <span className="font-bold text-xs sm:text-sm block truncate flex items-center gap-1">
                                🎲 {skillName}
                              </span>
                              <span className="text-[10px] text-ink-light uppercase">({skillDef.stat})</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {skillMods !== 0 && (
                                <span className={`text-[10px] font-bold ${skillMods > 0 ? 'text-magic-gold' : 'text-magic-red'}`}>
                                  ({skillMods > 0 ? '+'+skillMods : skillMods})
                                </span>
                              )}
                              <span className="font-bold text-base sm:text-lg text-magic-gold">
                                {totalMod >= 0 ? `+${totalMod}` : totalMod}
                              </span>
                              {isEditing && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSkillEditModal({ open: true, skillName: skillName, value: 0, turns: "" }); }}
                                  className="p-1 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow z-10"
                                  title={`Modificar habilidad ${skillName}`}
                                >
                                  <Plus className="w-3.5 h-3.5"/>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {showAllSkills && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-parchment-dark p-3 sm:p-4 rounded border border-ink/20">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-xs">
                            {SKILLS_5E.map(skill => {
                              const isPinned = character.pinnedSkills.includes(skill.name);
                              const { baseMod, skillMods, totalMod } = getEffectiveSkillMod(skill.name, skill.stat);
                              return (
                                <div key={skill.name} className="flex justify-between items-center p-2 bg-parchment rounded border border-ink/10 hover:bg-ink/5 transition">
                                  <div 
                                    onClick={() => triggerDiceRoll('d20', totalMod, `Prueba de ${skill.name} (${character.name})`)}
                                    className="flex-1 truncate cursor-pointer flex items-center gap-1"
                                    title={`Lanzar d20 + ${totalMod} para ${skill.name}`}
                                  >
                                    <span className="truncate">🎲 {skill.name} <span className="text-ink-light text-[10px]">({skill.stat})</span></span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    {skillMods !== 0 && (
                                      <span className={`text-[10px] font-bold ${skillMods > 0 ? 'text-magic-gold' : 'text-magic-red'}`}>
                                        ({skillMods > 0 ? '+'+skillMods : skillMods})
                                      </span>
                                    )}
                                    <span 
                                      onClick={() => triggerDiceRoll('d20', totalMod, `Prueba de ${skill.name} (${character.name})`)}
                                      className="font-bold cursor-pointer hover:text-magic-gold"
                                    >
                                      {totalMod >= 0 ? `+${totalMod}` : totalMod}
                                    </span>
                                    {isEditing && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSkillEditModal({ open: true, skillName: skill.name, value: 0, turns: "" }); }}
                                        className="p-0.5 bg-magic-gold rounded-full text-black hover:scale-110 transition cursor-pointer shadow"
                                        title={`Modificar habilidad ${skill.name}`}
                                      >
                                        <Plus className="w-3 h-3"/>
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); togglePinSkill(skill.name); }} 
                                      className={`p-1 rounded cursor-pointer ${isPinned ? 'text-magic-gold' : 'text-ink-light opacity-50 hover:opacity-100'}`}
                                      title={isPinned ? "Desfijar habilidad" : "Fijar habilidad"}
                                    >
                                      <Pin className="w-3.5 h-3.5"/>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: ACCIONES DE CLASE (D&D 5e) & LORE DM */}
            {activeTab === "class_features" && (() => {
              const matchFeatureName = (a: string, b: string) => {
                const cleanA = a.toLowerCase().split('(')[0].trim();
                const cleanB = b.toLowerCase().split('(')[0].trim();
                return cleanA === cleanB || a.toLowerCase() === b.toLowerCase();
              };

              const officialMapped = classFeatures.map(f => {
                const tracked = (character.customClassFeatures || []).find(c => matchFeatureName(c.name, f.name));
                if (tracked) {
                  return { ...f, ...tracked, isCustom: false };
                }
                return { ...f, isCustom: false };
              });

              const purelyCustom = (character.customClassFeatures || []).filter(c =>
                !classFeatures.some(f => matchFeatureName(f.name, c.name))
              ).map(f => ({ ...f, isCustom: true }));

              const allFeatures: (ClassFeature & { isCustom?: boolean })[] = [
                ...officialMapped,
                ...purelyCustom
              ];

              const filteredFeatures = allFeatures.filter(f => {
                const matchesSearch = !featureSearch || f.name.toLowerCase().includes(featureSearch.toLowerCase()) || f.description.toLowerCase().includes(featureSearch.toLowerCase());
                if (!matchesSearch) return false;
                if (featureFilter === 'all') return true;
                if (featureFilter === 'active') return f.type === 'active';
                if (featureFilter === 'passive') return f.type === 'passive';
                if (featureFilter === 'short') return f.resetOn === 'short' || (f.usage && f.usage.toLowerCase().includes('corto'));
                if (featureFilter === 'long') return f.resetOn === 'long' || (f.usage && f.usage.toLowerCase().includes('largo'));
                return true;
              });

              return (
                <motion.div key="class_features" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="text-2xl font-bold font-cinzel text-magic-gold">Acciones y Rasgos de Clase ({character.charClass})</h3>
                      <p className="text-xs text-ink-light">Habilidades oficiales de Nivel {character.level} y rasgos otorgados por Lore/DM.</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar + Focus Mode Launcher */}
                  <div className="bg-parchment p-3 rounded-xl border border-ink/20 flex flex-wrap justify-between items-center gap-3 font-sans shadow-sm">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <button
                        onClick={() => setFeatureFilter('all')}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${featureFilter === 'all' ? 'bg-magic-gold text-black' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        Todas ({allFeatures.length})
                      </button>
                      <button
                        onClick={() => setFeatureFilter('active')}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${featureFilter === 'active' ? 'bg-magic-red text-white' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        ⚡ Activas
                      </button>
                      <button
                        onClick={() => setFeatureFilter('passive')}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${featureFilter === 'passive' ? 'bg-ink text-parchment-dark' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        🛡️ Pasivas
                      </button>
                      <button
                        onClick={() => setFeatureFilter('short')}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${featureFilter === 'short' ? 'bg-amber-600 text-white' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        ☕ Descanso Corto
                      </button>
                      <button
                        onClick={() => setFeatureFilter('long')}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${featureFilter === 'long' ? 'bg-indigo-600 text-white' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        ⛺ Descanso Largo
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-48">
                        <input
                          type="text"
                          value={featureSearch}
                          onChange={e => setFeatureSearch(e.target.value)}
                          placeholder="Buscar rasgo..."
                          className="p-1.5 pl-7 text-xs bg-parchment-dark border border-ink/30 rounded text-ink font-bold w-full focus:outline-none focus:border-magic-gold"
                        />
                        <Search className="w-3.5 h-3.5 text-ink-light absolute left-2 top-2" />
                      </div>
                      <button
                        onClick={() => setFocusFeaturesModalOpen(true)}
                        className="px-3 py-1.5 bg-magic-gold text-black text-xs font-bold rounded hover:bg-yellow-500 transition cursor-pointer shadow shrink-0 flex items-center gap-1"
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
                          <Sparkles className="w-5 h-5"/> Otorgar Rasgo por Lore / DM (Libertad de Campaña)
                        </h4>
                      </div>
                      <p className="text-xs text-ink-light italic">
                        📜 Nota: Esta herramienta permite al DM conceder bendiciones, títulos, artefactos o habilidades por historia sin restricción de nivel.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold mb-1">Nombre del Rasgo</label>
                          <input
                            type="text"
                            value={newFeature.name}
                            onChange={e => setNewFeature({ ...newFeature, name: e.target.value })}
                            placeholder="Ej. Bendición del Viento, Don Arcabuce..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Tipo de Habilidad</label>
                          <select
                            value={newFeature.type}
                            onChange={e => setNewFeature({ ...newFeature, type: e.target.value as 'active' | 'passive' })}
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold cursor-pointer"
                          >
                            <option value="active">⚡ Activa</option>
                            <option value="passive">🛡️ Pasiva</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Uso / Recarga (Opcional)</label>
                          <input
                            type="text"
                            value={newFeature.usage}
                            onChange={e => setNewFeature({ ...newFeature, usage: e.target.value })}
                            placeholder="Ej. 1 por Descanso Largo, Reacción..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                        <div className="col-span-full">
                          <label className="block font-bold mb-1">Descripción del Rasgo</label>
                          <input
                            type="text"
                            value={newFeature.desc}
                            onChange={e => setNewFeature({ ...newFeature, desc: e.target.value })}
                            placeholder="Explicación del efecto o bono otorgado..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddCustomFeature}
                          className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow"
                        >
                          <Plus className="w-4 h-4"/> Otorgar Rasgo
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
                          className={`p-4 rounded-xl border-2 space-y-2.5 relative shadow-md ${feat.isCustom ? 'bg-parchment-dark border-magic-gold' : 'bg-parchment border-magic-gold/30'}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-lg text-magic-gold font-cinzel flex items-center gap-2">
                                {feat.isCustom && <span>📜</span>}
                                {feat.name}
                              </h4>
                              {feat.isCustom && (
                                <span className="text-[10px] bg-magic-gold/20 text-magic-gold font-bold px-2 py-0.5 rounded uppercase block mt-0.5">
                                  Otorgado por Lore / DM
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${feat.type === 'active' ? 'bg-magic-red text-white shadow' : 'bg-ink/10 text-ink'}`}>
                                {feat.type === 'active' ? '⚡ Activa' : '🛡️ Pasiva'}
                              </span>
                              {isEditing && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setFeatureEditModal({ open: true, oldName: feat.name, name: feat.name, type: feat.type, usage: feat.usage || '', desc: feat.description })}
                                    className="text-ink-light hover:text-magic-gold p-1 cursor-pointer"
                                    title="Editar Rasgo (Pluma Mágica)"
                                  >
                                    <PenTool className="w-4 h-4" />
                                  </button>
                                  {feat.isCustom && (
                                    <button
                                      onClick={() => removeCustomClassFeature(feat.name)}
                                      className="text-ink-light hover:text-magic-red p-1 cursor-pointer"
                                      title="Retirar Rasgo"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-ink/90 leading-relaxed">{feat.description}</p>

                          {(feat.usage || feat.type === 'active') && (
                            <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs font-bold gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {feat.usage && <span className="text-ink-light">Uso:</span>}
                                {feat.usage && <span className="bg-magic-gold/20 text-magic-gold px-2 py-0.5 rounded">{feat.usage}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {feat.maxUses !== undefined && (
                                  <span className="bg-ink/10 text-ink font-mono px-2 py-0.5 rounded">
                                    {curUses} / {feat.maxUses}
                                  </span>
                                )}
                                {feat.type === 'active' && (
                                  <button
                                    onClick={() => useClassFeature(feat.name, character.id)}
                                    disabled={curUses !== undefined && curUses <= 0}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold text-white transition cursor-pointer ${curUses !== undefined && curUses <= 0 ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'bg-magic-red hover:bg-red-700 shadow-sm'}`}
                                  >
                                    ⚡ Usar
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
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
                        <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col font-sans">
                          <div className="flex justify-between items-center border-b border-ink/20 pb-3 mb-4">
                            <div>
                              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                                🔎 Modo Enfoque — Acciones de Clase ({character.charClass})
                              </h3>
                              <p className="text-xs text-ink-light">Consulta detallada de todas las habilidades de tu héroe.</p>
                            </div>
                            <button onClick={() => setFocusFeaturesModalOpen(false)} className="p-2 text-ink-light hover:text-ink cursor-pointer">
                              <X className="w-6 h-6" />
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredFeatures.map((feat, idx) => {
                              const curUses = feat.currentUses ?? feat.maxUses;
                              return (
                                <div key={idx} className="p-5 bg-parchment rounded-xl border-2 border-magic-gold/40 shadow-lg flex flex-col justify-between space-y-3">
                                  <div>
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                      <h4 className="font-bold text-xl text-magic-gold font-cinzel">{feat.name}</h4>
                                      <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${feat.type === 'active' ? 'bg-magic-red text-white shadow' : 'bg-ink/10 text-ink'}`}>
                                        {feat.type === 'active' ? '⚡ Activa' : '🛡️ Pasiva'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-ink/90 leading-relaxed">{feat.description}</p>
                                  </div>

                                  {(feat.usage || feat.type === 'active') && (
                                    <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs font-bold gap-2">
                                      {feat.usage ? (
                                        <span className="bg-magic-gold/20 text-magic-gold px-2.5 py-1 rounded">Uso: {feat.usage}</span>
                                      ) : <div />}
                                      <div className="flex items-center gap-2">
                                        {feat.maxUses !== undefined && (
                                          <span className="font-mono text-sm bg-ink/10 px-2 py-0.5 rounded">{curUses} / {feat.maxUses}</span>
                                        )}
                                        {feat.type === 'active' && (
                                          <button
                                            onClick={() => useClassFeature(feat.name, character.id)}
                                            disabled={curUses !== undefined && curUses <= 0}
                                            className={`px-3 py-1 rounded font-bold text-white transition cursor-pointer ${curUses !== undefined && curUses <= 0 ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'bg-magic-red hover:bg-red-700'}`}
                                          >
                                            ⚡ Usar Carga
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
            })()}

            {/* TAB 3: EQUIPAMIENTO CON BONOS DE CA AUTOMÁTICOS */}
            {activeTab === "equipment" && (
              <motion.div key="equipment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                
                <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-2xl font-bold font-cinzel text-magic-gold">Equipamiento e Inventario</h3>
                    <p className="text-xs text-ink-light">Haz clic en "Equipar" para activar automáticamente sus bonos a la CA o ataques.</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {(['all', 'weapon', 'armor', 'consumable', 'quest', 'general'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setInventoryFilter(type)}
                        className={`px-3 py-1.5 rounded capitalize font-bold cursor-pointer transition ${inventoryFilter === type ? 'bg-magic-gold text-black' : 'bg-parchment text-ink hover:bg-ink/10'}`}
                      >
                        {type === 'all' ? 'Todos' : type === 'weapon' ? 'Armas' : type === 'armor' ? 'Armaduras' : type === 'consumable' ? 'Consumibles' : type === 'quest' ? 'Misión' : 'General'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SISTEMA DE MONEDAS D&D 5E */}
                {(() => {
                  const cur = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
                  const isStandard = room?.currencyMode === 'standard';
                  const totalGPValue = (cur.pp * 10) + cur.gp + (cur.ep * 0.5) + (cur.sp * 0.1) + (cur.cp * 0.01);
                  return (
                    <div className="bg-parchment-dark p-4 sm:p-5 rounded-xl border-2 border-magic-gold/50 shadow-xl font-sans space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-ink/10 pb-3">
                        <div>
                          <h4 className="font-bold text-lg sm:text-xl font-cinzel text-magic-gold flex items-center gap-2">
                            💰 Bolsa de Monedas ({isStandard ? 'Estándar CP/SP/GP' : 'D&D 5ª Edición'})
                          </h4>
                          <p className="text-xs text-ink-light">Monedas acumuladas en tu monedero y equivalencia en Piezas de Oro (PO / GP).</p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold bg-magic-gold/20 text-magic-gold border border-magic-gold/40 px-3 py-1.5 rounded-lg shadow-sm">
                            Equivalente Total: <strong className="text-sm font-cinzel">{totalGPValue.toFixed(2)} PO</strong>
                          </span>
                          <button
                            onClick={() => {
                              setSpendInput({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, reason: "" });
                              setSpendModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 bg-magic-red text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition shadow cursor-pointer"
                          >
                            🛒 Gastar / Consumir Dinero
                          </button>
                          <button
                            onClick={() => {
                              setEditCurrencyInput({ cp: cur.cp, sp: cur.sp, ep: cur.ep, gp: cur.gp, pp: cur.pp });
                              setEditCurrencyModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 bg-magic-gold text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-500 transition shadow cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" /> Editar Monedas
                          </button>
                        </div>
                      </div>

                      {/* Grid de Monedas */}
                      <div className={`grid gap-3 text-center ${isStandard ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'}`}>
                        {/* CP */}
                        <div className="bg-amber-950/20 border border-amber-700/50 p-3 rounded-lg flex flex-col items-center justify-between shadow-sm">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Cobre (CP)</span>
                          <span className="text-2xl font-bold text-amber-500 font-cinzel my-1">{cur.cp}</span>
                          <span className="text-[9px] text-ink-light">100 CP = 1 GP</span>
                        </div>

                        {/* SP */}
                        <div className="bg-slate-800/20 border border-slate-400/50 p-3 rounded-lg flex flex-col items-center justify-between shadow-sm">
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Plata (SP)</span>
                          <span className="text-2xl font-bold text-slate-200 font-cinzel my-1">{cur.sp}</span>
                          <span className="text-[9px] text-ink-light">10 SP = 1 GP</span>
                        </div>

                        {/* EP */}
                        {!isStandard && (
                          <div className="bg-cyan-950/20 border border-cyan-500/50 p-3 rounded-lg flex flex-col items-center justify-between shadow-sm">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Electrum (EP)</span>
                            <span className="text-2xl font-bold text-cyan-300 font-cinzel my-1">{cur.ep}</span>
                            <span className="text-[9px] text-ink-light">2 EP = 1 GP</span>
                          </div>
                        )}

                        {/* GP */}
                        <div className="bg-yellow-950/30 border-2 border-magic-gold/70 p-3 rounded-lg flex flex-col items-center justify-between shadow-md">
                          <span className="text-[10px] font-bold text-magic-gold uppercase tracking-wider">Oro (GP / PO)</span>
                          <span className="text-2xl font-bold text-magic-gold font-cinzel my-1">{cur.gp}</span>
                          <span className="text-[9px] text-magic-gold/80 font-bold">Moneda Estándar</span>
                        </div>

                        {/* PP */}
                        {!isStandard && (
                          <div className="bg-indigo-950/20 border border-indigo-400/50 p-3 rounded-lg flex flex-col items-center justify-between shadow-sm col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Platino (PP)</span>
                            <span className="text-2xl font-bold text-indigo-200 font-cinzel my-1">{cur.pp}</span>
                            <span className="text-[9px] text-ink-light">1 PP = 10 GP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Form to add item when isEditing is true (Pluma Mágica) */}
                {isEditing && (
                  <div className="p-4 bg-parchment border-2 border-magic-gold rounded-xl space-y-3 font-sans shadow-lg">
                    <h4 className="font-bold text-base sm:text-lg text-magic-gold font-cinzel flex items-center gap-2">
                      <Plus className="w-5 h-5"/> Añadir Objeto al Inventario (Pluma Mágica)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1">Nombre del Objeto</label>
                        <input
                          type="text"
                          value={newItem.name}
                          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="Ej. Espada Flameante"
                          className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs font-bold text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Tipo</label>
                        <select
                          value={newItem.type}
                          onChange={e => setNewItem({ ...newItem, type: e.target.value as ItemType })}
                          className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs font-bold text-ink cursor-pointer"
                        >
                          <option value="weapon">Arma</option>
                          <option value="armor">Armadura</option>
                          <option value="consumable">Consumible</option>
                          <option value="quest">Objeto de Misión</option>
                          <option value="general">General</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={newItem.qty}
                          onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })}
                          className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs text-ink font-bold"
                        />
                      </div>
                      {newItem.type === 'weapon' && (
                        <div>
                          <label className="block text-xs font-bold mb-1">Daño (Ej. 1d8+2)</label>
                          <input
                            type="text"
                            value={newItem.damage}
                            onChange={e => setNewItem({ ...newItem, damage: e.target.value })}
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs text-ink font-bold"
                          />
                        </div>
                      )}
                      {newItem.type === 'armor' && (
                        <div>
                          <label className="block text-xs font-bold mb-1">Bono a CA (Ej. 2)</label>
                          <input
                            type="number"
                            value={newItem.acBonus}
                            onChange={e => setNewItem({ ...newItem, acBonus: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs text-ink font-bold"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold mb-1">Duración en Turnos (vacío = Perm)</label>
                        <input
                          type="number"
                          placeholder="Ej. 5 (vacío = permanente)"
                          value={newItem.turns}
                          onChange={e => setNewItem({ ...newItem, turns: e.target.value })}
                          className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs text-ink font-bold"
                        />
                      </div>
                      <div className="col-span-full">
                        <label className="block text-xs font-bold mb-1">Descripción</label>
                        <input
                          type="text"
                          value={newItem.desc}
                          onChange={e => setNewItem({ ...newItem, desc: e.target.value })}
                          placeholder="Descripción u efectos del objeto..."
                          className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-xs text-ink"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow"
                      >
                        <Plus className="w-4 h-4"/> Añadir Objeto
                      </button>
                    </div>
                  </div>
                )}

                {/* Items Grid with Equip Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  {character.inventory
                    .filter(item => inventoryFilter === 'all' || item.type === inventoryFilter)
                    .map(item => (
                      <div key={item.id} className={`p-4 rounded border-2 transition-all flex justify-between items-start relative ${item.isConsumed ? 'bg-red-950/20 border-magic-red/50 opacity-80' : item.equipped ? 'bg-parchment border-magic-gold shadow-[0_0_15px_rgba(245,208,97,0.2)]' : 'bg-parchment-dark border-ink/20'}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getItemTypeIcon(item.type)}
                            <h4 className={`font-bold text-base sm:text-lg ${item.isConsumed ? 'line-through text-magic-red' : ''}`}>{item.name}</h4>
                            <span className="text-[10px] bg-ink/10 px-2 py-0.5 rounded capitalize">{item.type}</span>
                            {item.isTemporary && (
                              <span className="text-[10px] bg-purple-900/30 text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                                ⏳ Temporal ({item.duration ? `${item.duration} turnos` : 'Perm'})
                              </span>
                            )}
                            {item.isConsumed && (
                              <span className="text-[10px] bg-red-900/40 text-red-300 font-bold px-2 py-0.5 rounded border border-red-500/40">
                                🧪 CONSUMIDO (Se eliminará el próximo turno)
                              </span>
                            )}
                          </div>
                          {item.damage && <p className="text-xs text-magic-red font-bold">Daño: {item.damage}</p>}
                          {item.acBonus ? <p className="text-xs text-magic-gold font-bold">Bono CA: +{item.acBonus} (Aplicado si equipado)</p> : null}
                          <p className="text-xs sm:text-sm text-ink-light">{item.description}</p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {item.isConsumed ? (
                            <span className="text-[10px] text-red-400 font-bold italic">Agotado</span>
                          ) : item.type === 'consumable' ? (
                            <button
                              onClick={() => consumeItem(item.id)}
                              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                              title="Consumir objeto del inventario"
                            >
                              <FlaskConical className="w-3.5 h-3.5"/> Consumir (x{item.quantity})
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleEquipItem(item.id)}
                              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${item.equipped ? 'bg-magic-gold text-black shadow' : 'bg-ink/20 text-ink-light hover:text-ink'}`}
                            >
                              {item.equipped ? <CheckCircle2 className="w-3.5 h-3.5"/> : <Circle className="w-3.5 h-3.5"/>}
                              {item.equipped ? 'EQUIPADO' : 'Equipar'}
                            </button>
                          )}
                          {isEditing && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => setItemEditModal({ open: true, item: { ...item } })} 
                                className="text-ink-light hover:text-magic-gold p-1 cursor-pointer" 
                                title="Editar Objeto (Pluma Mágica)"
                              >
                                <PenTool className="w-4 h-4"/>
                              </button>
                              <button onClick={() => removeItem(item.id)} className="text-ink-light hover:text-magic-red p-1 cursor-pointer" title="Eliminar Objeto">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: SPELLS */}
            {activeTab === "spells" && (
              <motion.div key="spells" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 sm:space-y-8 font-sans">
                
                {/* Form to add spell & set spell slots when isEditing is true */}
                {isEditing && (
                  <div className="space-y-4">
                    <div className="p-4 bg-parchment border-2 border-magic-gold rounded-xl space-y-3 font-sans shadow-lg">
                      <h4 className="font-bold text-base sm:text-lg text-magic-gold font-cinzel flex items-center gap-2">
                        <Plus className="w-5 h-5"/> Añadir Conjuro (Pluma Mágica)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block font-bold mb-1">Nombre del Conjuro</label>
                          <input
                            type="text"
                            value={newSpell.name}
                            onChange={e => setNewSpell({ ...newSpell, name: e.target.value })}
                            placeholder="Ej. Bola de Fuego"
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Nivel (0 = Truco)</label>
                          <input
                            type="number"
                            value={newSpell.level}
                            onChange={e => setNewSpell({ ...newSpell, level: parseInt(e.target.value) || 0 })}
                            min={0}
                            max={9}
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Escuela de Magia</label>
                          <input
                            type="text"
                            value={newSpell.school}
                            onChange={e => setNewSpell({ ...newSpell, school: e.target.value })}
                            placeholder="Evocación, Transmutación..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Tiempo de Lanzamiento</label>
                          <input
                            type="text"
                            value={newSpell.castingTime}
                            onChange={e => setNewSpell({ ...newSpell, castingTime: e.target.value })}
                            placeholder="1 Acción, Reacción..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Duración en Turnos (vacío = Perm)</label>
                          <input
                            type="number"
                            placeholder="Ej. 3 (vacío = permanente)"
                            value={newSpell.turns}
                            onChange={e => setNewSpell({ ...newSpell, turns: e.target.value })}
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                        <div className="col-span-full">
                          <label className="block font-bold mb-1">Descripción del Hechizo</label>
                          <input
                            type="text"
                            value={newSpell.desc}
                            onChange={e => setNewSpell({ ...newSpell, desc: e.target.value })}
                            placeholder="Efecto, daño o salvación requerida..."
                            className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddSpell}
                          className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow"
                        >
                          <Plus className="w-4 h-4"/> Añadir Hechizo
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-parchment border-2 border-ink/20 rounded-xl space-y-3 font-sans">
                      <h4 className="font-bold text-base text-ink font-cinzel">Ajustar Límite de Espacios de Conjuro</h4>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div>
                          <label className="block font-bold mb-1">Nivel del Espacio</label>
                          <input
                            type="number"
                            min={1}
                            max={9}
                            value={newSlotLevel}
                            onChange={e => setNewSlotLevel(parseInt(e.target.value) || 1)}
                            className="p-1.5 bg-parchment-dark border border-ink/30 rounded w-20 text-center font-bold text-ink"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Espacios Máximos</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={newSlotMax}
                            onChange={e => setNewSlotMax(parseInt(e.target.value) || 1)}
                            className="p-1.5 bg-parchment-dark border border-ink/30 rounded w-20 text-center font-bold text-ink"
                          />
                        </div>
                        <button
                          onClick={() => setSpellSlotMax(newSlotLevel, newSlotMax)}
                          className="mt-5 px-3 py-1.5 bg-ink text-parchment-dark font-bold text-xs rounded hover:bg-magic-gold hover:text-black transition cursor-pointer"
                        >
                          Configurar Espacios
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-parchment p-4 sm:p-6 rounded border border-magic-gold/40 space-y-4">
                  <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-magic-gold">Espacios de Hechizo (Spell Slots)</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-sans">
                    {Object.entries(character.spellSlots).map(([levelStr, slot]) => {
                      const level = parseInt(levelStr);
                      return (
                        <div key={level} className="p-3 bg-parchment-dark border border-ink/20 rounded space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs sm:text-sm text-ink">Nivel {level}</span>
                            <div className="flex items-center gap-2">
                              {isEditing && (
                                <div className="flex items-center gap-1 bg-ink/10 p-0.5 rounded border border-ink/20">
                                  <button 
                                    onClick={() => setSpellSlotMax(level, Math.max(0, slot.max - 1))}
                                    className="w-5 h-5 flex items-center justify-center bg-magic-red/80 hover:bg-magic-red text-white rounded font-bold text-xs cursor-pointer shadow-sm"
                                    title="Reducir espacios máximos"
                                  >
                                    -
                                  </button>
                                  <button 
                                    onClick={() => setSpellSlotMax(level, slot.max + 1)}
                                    className="w-5 h-5 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer shadow-sm"
                                    title="Aumentar espacios máximos"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              <span className="text-[10px] text-ink-light font-bold">{slot.current} / {slot.max}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {Array.from({ length: slot.max }).map((_, idx) => {
                              const isAvailable = idx < slot.current;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => isAvailable ? useSpellSlot(level) : restoreSpellSlot(level)}
                                  className={`w-8 h-8 rounded border-2 flex items-center justify-center cursor-pointer transition text-sm ${isAvailable ? 'bg-magic-gold border-magic-gold text-black font-bold' : 'bg-transparent border-ink/30 text-ink/30'}`}
                                >
                                  {isAvailable ? '✦' : '✧'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Known Spells List */}
                {character.spells && character.spells.length > 0 && (
                  <div className="bg-parchment p-4 sm:p-6 rounded border border-ink/20 space-y-4">
                    <h3 className="text-xl font-bold font-cinzel text-ink border-b border-ink/20 pb-2">Conjuros Conocidos ({character.spells.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {character.spells.map(spell => (
                        <div key={spell.id} className="p-3 bg-parchment-dark rounded border border-ink/10 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-ink">{spell.name}</span>
                              <span className="text-[10px] bg-magic-gold/20 text-magic-gold font-bold px-1.5 py-0.5 rounded">
                                {spell.level === 0 ? 'Truco' : `Nivel ${spell.level}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-ink-light block mt-0.5">{spell.school} • {spell.castingTime}</span>
                            <p className="text-xs text-ink/80 mt-1">{spell.description}</p>
                          </div>
                          {isEditing && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => setSpellEditModal({ open: true, spell: { ...spell } })} 
                                className="text-ink-light hover:text-magic-gold p-1 cursor-pointer" 
                                title="Editar Conjuro (Pluma Mágica)"
                              >
                                <PenTool className="w-4 h-4"/>
                              </button>
                              <button onClick={() => removeSpell(spell.id)} className="text-ink-light hover:text-magic-red p-1 cursor-pointer" title="Eliminar Conjuro">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: NOTAS PERSONALES (100% PRIVADAS AL JUGADOR) */}
            {activeTab === "notes" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Header & Privacy Notice */}
                <div className="bg-parchment p-4 sm:p-6 rounded-lg border-2 border-magic-gold shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold font-cinzel text-ink flex items-center gap-2">
                      <Scroll className="w-6 h-6 text-magic-gold" /> Notas Personales de {character.name}
                    </h2>
                    <p className="text-xs text-ink-light mt-1 flex items-center gap-1.5 font-sans flex-wrap">
                      <span className="bg-amber-900/20 text-amber-900 border border-amber-900/30 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
                        ☁️ Respaldado en Firebase ({notes.length}/10)
                      </span>
                      Sincronización automática en la nube para tu personaje. <strong>No son visibles por el DM</strong>.
                    </p>
                  </div>

                  <button
                    onClick={() => setNoteModal({ open: true, editingId: null, title: '', content: '' })}
                    className="px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-xs flex items-center gap-2 cursor-pointer font-sans shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Nueva Nota
                  </button>
                </div>

                {/* Notes List / Grid */}
                {notes.length === 0 ? (
                  <div className="p-8 bg-parchment-dark/80 rounded-xl border border-ink/20 text-center space-y-3 font-sans">
                    <Scroll className="w-12 h-12 text-ink/30 mx-auto" />
                    <h3 className="text-lg font-bold text-ink font-cinzel">Sin notas guardadas</h3>
                    <p className="text-xs text-ink-light max-w-md mx-auto">
                      Anota pistas, nombres de PNJs, objetivos secretos, combinaciones de hechizos o cualquier recuerdo importante para tu partida.
                    </p>
                    <button
                      onClick={() => setNoteModal({ open: true, editingId: null, title: '', content: '' })}
                      className="px-5 py-2 bg-parchment border border-magic-gold text-magic-gold font-bold rounded text-xs hover:bg-magic-gold hover:text-black transition cursor-pointer font-sans"
                    >
                      + Crear Primera Nota
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                    {[...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt).map((note) => (
                      <div 
                        key={note.id} 
                        className={`p-5 bg-parchment rounded-xl border transition flex flex-col justify-between space-y-3 shadow-md ${note.pinned ? 'border-magic-gold shadow-[0_0_15px_rgba(245,208,97,0.3)] bg-amber-950/5' : 'border-ink/20 hover:border-magic-gold/60'}`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 border-b border-ink/10 pb-2 mb-2">
                            <h3 className="text-lg font-bold text-ink font-cinzel break-words flex items-center gap-2">
                              {note.pinned && <span className="text-xs bg-magic-gold text-black font-bold px-1.5 py-0.5 rounded">📌 Fijada</span>}
                              {note.title}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => togglePinNote(note.id)}
                                className={`p-1.5 transition cursor-pointer ${note.pinned ? 'text-magic-gold' : 'text-ink-light opacity-40 hover:opacity-100'}`}
                                title={note.pinned ? "Desfijar Nota" : "Fijar Nota al Inicio"}
                              >
                                <Pin className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setNoteModal({ open: true, editingId: note.id, title: note.title, content: note.content })}
                                className="p-1.5 text-ink-light hover:text-magic-gold transition cursor-pointer"
                                title="Editar Nota"
                              >
                                <PenTool className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 text-ink-light hover:text-magic-red transition cursor-pointer"
                                title="Eliminar Nota"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-ink/90 whitespace-pre-wrap leading-relaxed break-words">
                            {note.content}
                          </p>
                        </div>

                        <div className="text-[10px] text-ink-light border-t border-ink/10 pt-2 flex justify-between items-center flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span>Creado: {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {note.updatedAt && (
                              <span className="italic">Editado: {new Date(note.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>

          {/* NOTE CREATION / EDIT MODAL */}
          <AnimatePresence>
            {noteModal.open && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} 
                  animate={{ scale: 1, y: 0 }} 
                  exit={{ scale: 0.9, y: 20 }} 
                  className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4"
                >
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Scroll className="w-6 h-6" /> {noteModal.editingId ? "Editar Nota Personal" : "Crear Nueva Nota Personal"}
                  </h3>
                  <p className="text-xs text-ink-light">
                    🔒 Esta nota es totalmente privada y no se compartirá con el DM.
                  </p>

                  <form onSubmit={handleSaveNote} className="space-y-4 text-xs sm:text-sm">
                    <div>
                      <label className="block font-bold text-ink mb-1">Título de la Nota</label>
                      <input 
                        type="text" 
                        required 
                        value={noteModal.title}
                        onChange={e => setNoteModal({ ...noteModal, title: e.target.value })}
                        placeholder="Ej. Pistas sobre el mercader de Agua Profunda"
                        className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold text-sm focus:border-magic-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">Texto / Contenido</label>
                      <textarea 
                        rows={6}
                        required
                        value={noteModal.content}
                        onChange={e => setNoteModal({ ...noteModal, content: e.target.value })}
                        placeholder="Escribe aquí los detalles, nombres, secretos o recordatorios..."
                        className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded text-xs sm:text-sm leading-relaxed focus:border-magic-gold focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-ink/20 font-bold">
                      <button 
                        type="button" 
                        onClick={() => setNoteModal({ open: false, editingId: null, title: '', content: '' })} 
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        {noteModal.editingId ? "Guardar Cambios" : "Guardar Nota"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SKILL MODIFIER EDIT MODAL (PLUMA MÁGICA) */}
          <AnimatePresence>
            {skillEditModal.open && skillEditModal.skillName && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} 
                  animate={{ scale: 1, y: 0 }} 
                  exit={{ scale: 0.9, y: 20 }} 
                  className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
                >
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <PenTool className="w-6 h-6" /> Pluma Mágica: Modificar Habilidad
                  </h3>
                  <p className="text-xs text-ink-light">
                    Ajusta un bonificador o penalizador directo para la habilidad <strong>{skillEditModal.skillName}</strong>.
                  </p>

                  <form onSubmit={handleSkillEditSave} className="space-y-4 text-xs sm:text-sm">
                    <div>
                      <label className="block font-bold text-ink mb-1">Valor de Modificador (+ o -)</label>
                      <input 
                        type="number" 
                        required
                        value={skillEditModal.value || ''}
                        onChange={e => setSkillEditModal({ ...skillEditModal, value: parseInt(e.target.value) || 0 })}
                        placeholder="Ej. 2 o -1"
                        className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold text-base focus:border-magic-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">Duración en Turnos (vacío = Permanente)</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 3 (dejar vacío si es permanente)"
                        value={skillEditModal.turns}
                        onChange={e => setSkillEditModal({ ...skillEditModal, turns: e.target.value })}
                        className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded text-xs focus:border-magic-gold focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-ink/20 font-bold">
                      <button 
                        type="button" 
                        onClick={() => setSkillEditModal({ open: false, skillName: null, value: 0, turns: "" })} 
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        Aplicar Modificador
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ITEM EDIT MODAL (Pluma Mágica) */}
          <AnimatePresence>
            {itemEditModal.open && itemEditModal.item && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <PenTool className="w-5 h-5" /> Editar Objeto (Pluma Mágica)
                  </h3>
                  <form onSubmit={handleItemEditSave} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1">Nombre del Objeto</label>
                      <input 
                        type="text" 
                        value={itemEditModal.item.name} 
                        onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, name: e.target.value } })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">Tipo</label>
                        <select 
                          value={itemEditModal.item.type} 
                          onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, type: e.target.value as ItemType } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold cursor-pointer"
                        >
                          <option value="weapon">Arma</option>
                          <option value="armor">Armadura</option>
                          <option value="consumable">Consumible</option>
                          <option value="quest">Objeto de Misión</option>
                          <option value="general">General</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Cantidad</label>
                        <input 
                          type="number" 
                          value={itemEditModal.item.quantity} 
                          onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, quantity: parseInt(e.target.value) || 1 } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          min={1}
                        />
                      </div>
                    </div>
                    {itemEditModal.item.type === 'weapon' && (
                      <div>
                        <label className="block font-bold mb-1">Daño (Ej. 1d6+5)</label>
                        <input 
                          type="text" 
                          value={itemEditModal.item.damage || ''} 
                          onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, damage: e.target.value } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                    )}
                    {itemEditModal.item.type === 'armor' && (
                      <div>
                        <label className="block font-bold mb-1">Bono a CA (Ej. 2)</label>
                        <input 
                          type="number" 
                          value={itemEditModal.item.acBonus || 0} 
                          onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, acBonus: parseInt(e.target.value) || 0 } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-bold mb-1">Descripción</label>
                      <textarea 
                        rows={3}
                        value={itemEditModal.item.description} 
                        onChange={e => setItemEditModal({ ...itemEditModal, item: { ...itemEditModal.item!, description: e.target.value } })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-ink/20 font-bold">
                      <button 
                        type="button" 
                        onClick={() => setItemEditModal({ open: false, item: null })} 
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SPELL EDIT MODAL (Pluma Mágica) */}
          <AnimatePresence>
            {spellEditModal.open && spellEditModal.spell && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <PenTool className="w-5 h-5" /> Editar Conjuro (Pluma Mágica)
                  </h3>
                  <form onSubmit={handleSpellEditSave} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1">Nombre del Conjuro</label>
                      <input 
                        type="text" 
                        value={spellEditModal.spell.name} 
                        onChange={e => setSpellEditModal({ ...spellEditModal, spell: { ...spellEditModal.spell!, name: e.target.value } })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">Nivel (0 = Truco)</label>
                        <input 
                          type="number" 
                          value={spellEditModal.spell.level} 
                          onChange={e => setSpellEditModal({ ...spellEditModal, spell: { ...spellEditModal.spell!, level: parseInt(e.target.value) || 0 } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          min={0}
                          max={9}
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Escuela de Magia</label>
                        <input 
                          type="text" 
                          value={spellEditModal.spell.school || ''} 
                          onChange={e => setSpellEditModal({ ...spellEditModal, spell: { ...spellEditModal.spell!, school: e.target.value } })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Tiempo de Lanzamiento</label>
                      <input 
                        type="text" 
                        value={spellEditModal.spell.castingTime || ''} 
                        onChange={e => setSpellEditModal({ ...spellEditModal, spell: { ...spellEditModal.spell!, castingTime: e.target.value } })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Descripción</label>
                      <textarea 
                        rows={3}
                        value={spellEditModal.spell.description} 
                        onChange={e => setSpellEditModal({ ...spellEditModal, spell: { ...spellEditModal.spell!, description: e.target.value } })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-ink/20 font-bold">
                      <button 
                        type="button" 
                        onClick={() => setSpellEditModal({ open: false, spell: null })} 
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CLASS FEATURE EDIT MODAL (Pluma Mágica) */}
          <AnimatePresence>
            {featureEditModal.open && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <PenTool className="w-5 h-5" /> Editar Rasgo de Clase (Pluma Mágica)
                  </h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!featureEditModal.name.trim()) return;
                    updateCustomClassFeature(featureEditModal.oldName, {
                      name: featureEditModal.name.trim(),
                      type: featureEditModal.type,
                      unlockedAtLevel: character.level,
                      description: featureEditModal.desc.trim(),
                      usage: featureEditModal.usage.trim() || undefined
                    });
                    setFeatureEditModal({ open: false, oldName: "", name: "", type: "active", usage: "", desc: "" });
                  }} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1">Nombre del Rasgo</label>
                      <input 
                        type="text" 
                        value={featureEditModal.name} 
                        onChange={e => setFeatureEditModal({ ...featureEditModal, name: e.target.value })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">Tipo de Habilidad</label>
                        <select 
                          value={featureEditModal.type} 
                          onChange={e => setFeatureEditModal({ ...featureEditModal, type: e.target.value as 'active' | 'passive' })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold cursor-pointer"
                        >
                          <option value="active">⚡ Activa</option>
                          <option value="passive">🛡️ Pasiva</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Uso / Recarga (Opcional)</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 1 por Descanso Largo"
                          value={featureEditModal.usage} 
                          onChange={e => setFeatureEditModal({ ...featureEditModal, usage: e.target.value })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Descripción</label>
                      <textarea 
                        rows={3}
                        value={featureEditModal.desc} 
                        onChange={e => setFeatureEditModal({ ...featureEditModal, desc: e.target.value })}
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-ink/20 font-bold">
                      <button 
                        type="button" 
                        onClick={() => setFeatureEditModal({ open: false, oldName: "", name: "", type: "active", usage: "", desc: "" })} 
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SALVATION / DEATH / MORIBUNDO MODAL */}
          <AnimatePresence>
            {salvationModal.open && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.85, y: 30 }} 
                  animate={{ scale: 1, y: 0 }} 
                  exit={{ scale: 0.85, y: 30 }} 
                  className={`border-4 rounded-xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-center relative ${
                    salvationModal.type === 'death' 
                      ? 'bg-black border-magic-red text-red-100 shadow-[0_0_50px_rgba(217,56,41,0.9)]' 
                      : salvationModal.type === 'moribundo'
                      ? 'bg-red-950/95 border-magic-red text-red-100 shadow-[0_0_40px_rgba(217,56,41,0.7)]'
                      : 'bg-parchment-dark border-magic-gold text-ink shadow-[0_0_50px_rgba(245,208,97,0.8)]'
                  }`}
                >
                  <h3 className={`text-xl sm:text-2xl font-bold font-cinzel tracking-wider leading-snug ${
                    salvationModal.type === 'death' || salvationModal.type === 'moribundo' ? 'text-magic-red' : 'text-magic-gold'
                  }`}>
                    {salvationModal.title}
                  </h3>

                  <p className="text-sm leading-relaxed font-sans">
                    {salvationModal.desc}
                  </p>

                  <div className="pt-4 border-t border-white/20 flex justify-center">
                    <button 
                      onClick={() => setSalvationModal({ ...salvationModal, open: false })} 
                      className={`px-6 py-2.5 font-bold rounded shadow transition text-sm cursor-pointer font-sans ${
                        salvationModal.type === 'death' || salvationModal.type === 'moribundo'
                          ? 'bg-magic-red text-white hover:bg-red-700'
                          : 'bg-magic-gold text-black hover:bg-yellow-500 shadow-[0_0_15px_rgba(245,208,97,0.8)]'
                      }`}
                    >
                      ¡Entendido!
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EDIT CURRENCY MODAL */}
          <AnimatePresence>
            {editCurrencyModalOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    💰 Editar Bolsa de Monedas
                  </h3>
                  <p className="text-xs text-ink-light">Ajusta la cantidad de cada tipo de moneda que posee tu personaje.</p>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateCurrency(character.id, editCurrencyInput);
                    setEditCurrencyModalOpen(false);
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                      <div>
                        <label className="block text-amber-600 mb-1">🔴 Cobre (CP)</label>
                        <input
                          type="number"
                          min="0"
                          value={editCurrencyInput.cp}
                          onChange={e => setEditCurrencyInput({ ...editCurrencyInput, cp: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">⚪ Plata (SP)</label>
                        <input
                          type="number"
                          min="0"
                          value={editCurrencyInput.sp}
                          onChange={e => setEditCurrencyInput({ ...editCurrencyInput, sp: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      {!(useStore.getState().currencyMode === 'standard' || room?.currencyMode === 'standard') && (
                        <div>
                          <label className="block text-cyan-400 mb-1">🔵 Electrum (EP)</label>
                          <input
                            type="number"
                            min="0"
                            value={editCurrencyInput.ep}
                            onChange={e => setEditCurrencyInput({ ...editCurrencyInput, ep: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-magic-gold mb-1">🟡 Oro (GP / PO)</label>
                        <input
                          type="number"
                          min="0"
                          value={editCurrencyInput.gp}
                          onChange={e => setEditCurrencyInput({ ...editCurrencyInput, gp: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      {!(useStore.getState().currencyMode === 'standard' || room?.currencyMode === 'standard') && (
                        <div className="col-span-2">
                          <label className="block text-indigo-300 mb-1">🟣 Platino (PP)</label>
                          <input
                            type="number"
                            min="0"
                            value={editCurrencyInput.pp}
                            onChange={e => setEditCurrencyInput({ ...editCurrencyInput, pp: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-ink/20 font-bold text-xs">
                      <button
                        type="button"
                        onClick={() => setEditCurrencyModalOpen(false)}
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer"
                      >
                        Guardar Monedas
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SPEND CURRENCY MODAL */}
          <AnimatePresence>
            {spendModalOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-red rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    🛒 Gastar / Consumir Monedas
                  </h3>
                  <p className="text-xs text-ink-light">Indica las monedas que deseas pagar o consumir durante tu aventura.</p>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    spendCurrency(character.id, spendInput, spendInput.reason);
                    setSpendModalOpen(false);
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                      <div>
                        <label className="block text-amber-600 mb-1">Gastar Cobre (CP)</label>
                        <input
                          type="number"
                          min="0"
                          value={spendInput.cp || ''}
                          onChange={e => setSpendInput({ ...spendInput, cp: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="0"
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Gastar Plata (SP)</label>
                        <input
                          type="number"
                          min="0"
                          value={spendInput.sp || ''}
                          onChange={e => setSpendInput({ ...spendInput, sp: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="0"
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      {!(useStore.getState().currencyMode === 'standard' || room?.currencyMode === 'standard') && (
                        <div>
                          <label className="block text-cyan-400 mb-1">Gastar Electrum (EP)</label>
                          <input
                            type="number"
                            min="0"
                            value={spendInput.ep || ''}
                            onChange={e => setSpendInput({ ...spendInput, ep: Math.max(0, parseInt(e.target.value) || 0) })}
                            placeholder="0"
                            className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-magic-gold mb-1">Gastar Oro (GP / PO)</label>
                        <input
                          type="number"
                          min="0"
                          value={spendInput.gp || ''}
                          onChange={e => setSpendInput({ ...spendInput, gp: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="0"
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      {!(useStore.getState().currencyMode === 'standard' || room?.currencyMode === 'standard') && (
                        <div className="col-span-2">
                          <label className="block text-indigo-300 mb-1">Gastar Platino (PP)</label>
                          <input
                            type="number"
                            min="0"
                            value={spendInput.pp || ''}
                            onChange={e => setSpendInput({ ...spendInput, pp: Math.max(0, parseInt(e.target.value) || 0) })}
                            placeholder="0"
                            className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Motivo / Concepto del Gasto (Opcional)</label>
                      <input
                        type="text"
                        value={spendInput.reason}
                        onChange={e => setSpendInput({ ...spendInput, reason: e.target.value })}
                        placeholder="Ej. Posada, raciones de viaje, poción..."
                        className="w-full p-2 bg-parchment border border-ink/30 rounded text-xs text-ink font-bold"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-ink/20 font-bold text-xs">
                      <button
                        type="button"
                        onClick={() => setSpendModalOpen(false)}
                        className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-magic-red text-white rounded hover:bg-red-700 transition shadow cursor-pointer"
                      >
                        Confirmar Gasto
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DM DIRECT MESSAGE MODAL */}
          <AnimatePresence>
            {dmMessageModal.open && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 font-sans">
                <div className="bg-parchment-dark border-4 border-magic-gold p-5 rounded-xl shadow-2xl w-[95%] max-w-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-ink/20 pb-3">
                    <h3 className="text-xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                      ✉️ Enviar Mensaje / Trasfondo al DM
                    </h3>
                    <button onClick={() => setDmMessageModal({ open: false, content: '' })} className="p-1 text-ink-light hover:text-ink">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-ink-light">
                    Envía notas de historia, secretos, intenciones o peticiones privadas a tu Maestro de la Mazmorra (DM). Máximo 500 caracteres (máximo 5 mensajes activos).
                  </p>
                  <div>
                    <textarea
                      value={dmMessageModal.content}
                      onChange={(e) => setDmMessageModal({ ...dmMessageModal, content: e.target.value.slice(0, 500) })}
                      placeholder="Escribe tu mensaje privado para el DM..."
                      rows={5}
                      className="w-full p-3 bg-parchment border border-ink/30 rounded-lg text-xs text-ink font-sans leading-relaxed focus:outline-none focus:border-magic-gold"
                    />
                    <div className="flex justify-between items-center text-[10px] text-ink-light mt-1">
                      <span>Solo visible para el DM de la sala.</span>
                      <span className={dmMessageModal.content.length >= 500 ? 'text-magic-red font-bold' : ''}>
                        {dmMessageModal.content.length} / 500
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-ink/20">
                    <button
                      onClick={() => setDmMessageModal({ open: false, content: '' })}
                      className="px-4 py-2 text-xs font-bold text-ink-light hover:text-ink cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!dmMessageModal.content.trim()) return;
                        const roomId = character.roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
                        if (!roomId) {
                          showAlert("Debes estar en una sala de campaña para enviar mensajes al DM.", "Sala Requerida", "warning");
                          return;
                        }
                        await sendDirectMessageToDM(roomId, {
                          senderId: character.id,
                          senderName: character.name,
                          characterName: character.name,
                          content: dmMessageModal.content.trim()
                        });
                        showAlert("✉️ Mensaje enviado con éxito al DM.", "Mensaje Enviado", "success");
                        setDmMessageModal({ open: false, content: '' });
                      }}
                      disabled={!dmMessageModal.content.trim()}
                      className={`px-5 py-2 bg-magic-gold text-black rounded text-xs font-bold hover:bg-yellow-500 transition shadow cursor-pointer ${!dmMessageModal.content.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Enviar Mensaje
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
        )}

      </div>

      {/* 3D DICE ROLLER & DM INBOX FLOATING LAUNCHERS */}
      <DiceRoller />
      {(isDemoMode || isDM) && <DMInboxFloatingButton roomId={room?.id} isDemo={isDemoMode} isDM={isDM} />}

      {/* TUTORIAL MODAL */}
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* ACCOUNT SETTINGS & CHARACTER MANAGEMENT MODAL */}
      <AccountSettingsModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} />
    </main>
  );
}
