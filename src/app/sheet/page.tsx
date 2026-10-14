"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ItemType, Item, Spell, getCharacterHitDice } from "@/store/useStore";
import { getClassFeaturesForLevel } from "@/lib/dndClassFeatures";
import DiceRoller from "@/components/DiceRoller";
import DMInboxFloatingButton from "@/components/DMInboxFloatingButton";
import TutorialModal from "@/components/TutorialModal";
import DMPage from "@/app/dm/page";
import { subscribeRoom, subscribeRoomWhispers, Room, DirectMessage, markDirectMessageAsRead } from "@/lib/rooms";
import { useAuth } from "@/context/AuthContext";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import { 
  PenTool, Shield, Zap, Sparkles, BookOpen, Clock, Scroll, HelpCircle, User, Home, MessageSquare
} from "lucide-react";
import { ASSETS } from "@/lib/assets";
import { CombatStatusBanners } from "@/components/sheet/CombatStatusBanners";
import { DemoSandboxToolbar } from "@/components/sheet/DemoSandboxToolbar";
import { WhisperConversationModal } from "@/components/sheet/WhisperConversationModal";
import { CombatHeader } from "@/components/sheet/CombatHeader";
import { StatsAndSkillsTab } from "@/components/sheet/tabs/StatsAndSkillsTab";
import { ClassFeaturesTab } from "@/components/sheet/tabs/ClassFeaturesTab";
import { EquipmentInventoryTab } from "@/components/sheet/tabs/EquipmentInventoryTab";
import { SpellcastingTab } from "@/components/sheet/tabs/SpellcastingTab";
import { PrivateNotesTab } from "@/components/sheet/tabs/PrivateNotesTab";
import SyncStatusBadge from "@/components/SyncStatusBadge";

export default function CharacterSheetPage({ isDM = false, isDemoOverride = false }: { isDM?: boolean; isDemoOverride?: boolean } = {}) {
  const { 
    players, activePlayerId, setActivePlayerId, isCombatMode, initiativeOrder, currentTurnIndex, combatMonsters,
    advanceTurn, addModifier, removeModifier, updateStat, setBaseStatScore, modifyHPMax, modifyHPCurrent, modifyAC,
    togglePinSkill, toggleEquipItem, useSpellSlot, restoreSpellSlot, setSpellSlotMax, spendHitDie, shortRest, longRest, useClassFeature,
    addItem, updateItem, removeItem, addSpell, updateSpell, removeSpell, addCustomClassFeature, updateCustomClassFeature, removeCustomClassFeature, consumeItem,
    lastTurnEvent, lastItemReceivedEvent, rollDeathSave, stabilizePlayer, togglePlayerDeathState, hpTerminology, toggleInspiration, loadFamousDemoCharacter,
    loadDemoSandboxParty, resetDemoSandbox,
    updateCurrency, spendCurrency, convertPlayerCurrencyToStandard, showAlert, showConfirm
  } = useStore();

  const { user } = useAuth();

  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"sheet" | "dm">("sheet");
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  // New Feature & Interaction States
  const [dmMessageModal, setDmMessageModal] = useState<{ open: boolean; content: string; tab: 'compose' | 'history' }>({ open: false, content: '', tab: 'compose' });
  const [mySentMessages, setMySentMessages] = useState<DirectMessage[]>([]);
  const [itemToast, setItemToast] = useState<{ open: boolean; itemName: string; quantity: number } | null>(null);

  // Currency Modals State
  const [editCurrencyModalOpen, setEditCurrencyModalOpen] = useState(false);
  const [editCurrencyInput, setEditCurrencyInput] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const [spendInput, setSpendInput] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, reason: "" });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isDemo = isDemoOverride || params.get('demo') === 'true' || window.location.pathname.startsWith('/demo');
      setIsDemoMode(isDemo);
      if (isDemo) {
        loadDemoSandboxParty();
      }
    }
  }, [isDemoOverride]);

  const character = players.find(p => p.id === activePlayerId) || players[0] || {
    id: 'default', name: 'Aventurero', race: 'Humano', charClass: 'Guerrero', background: 'Soldado', level: 1,
    hp: { current: 10, max: 10, temp: 0 }, ac: 14, proficiencyBonus: 2,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: ['str', 'con'], pinnedSkills: [], spellSlots: {}, inventory: [], spells: [], customClassFeatures: [], modifiers: []
  };

  const characterHitDice = getCharacterHitDice(character);

  const unreadFromDMCount = mySentMessages.filter(m => m.isFromDM && !m.read).length;

  const currentTurnPlayerId = initiativeOrder[currentTurnIndex];
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId);
  const currentTurnMonster = combatMonsters.find(m => m.id === currentTurnPlayerId);
  const isMyTurn = !isCombatMode || (currentTurnPlayerId === character.id);

  const [activeTab, setActiveTab] = useState<"stats" | "class_features" | "equipment" | "spells" | "notes">("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [turnToast, setTurnToast] = useState(false);

  useEffect(() => {
    if (!isDemoMode && character && character.roomId) {
      const unsub = subscribeRoom(character.roomId, setRoom);
      return () => unsub();
    }
  }, [character?.roomId, isDemoMode]);

  useEffect(() => {
    const effectiveRoomId = isDemoMode ? 'demo_sandbox_room' : character?.roomId;
    if (!effectiveRoomId) {
      setMySentMessages([]);
      return;
    }
    const unsub = subscribeRoomWhispers(
      effectiveRoomId,
      { isDM: false, senderUid: user?.uid, characterId: character?.id },
      (whispers) => setMySentMessages(whispers)
    );
    return () => unsub();
  }, [character?.roomId, character?.id, user?.uid, isDemoMode]);

  // Mark unread DM whispers as read when player views the conversation history
  useEffect(() => {
    if (dmMessageModal.open && dmMessageModal.tab === 'history') {
      const effectiveRoomId = isDemoMode ? 'demo_sandbox_room' : character?.roomId;
      const unreadWhispers = mySentMessages.filter(m => m.isFromDM && !m.read);
      if (unreadWhispers.length > 0 && effectiveRoomId) {
        unreadWhispers.forEach(msg => {
          markDirectMessageAsRead(effectiveRoomId, msg.id);
        });
        setMySentMessages(prev => prev.map(m => m.isFromDM ? { ...m, read: true } : m));
      }
    }
  }, [dmMessageModal.open, dmMessageModal.tab, mySentMessages, isDemoMode, character?.roomId]);

  useEffect(() => {
    if (
      lastItemReceivedEvent &&
      lastItemReceivedEvent.playerId === character.id &&
      (!lastItemReceivedEvent.roomId || lastItemReceivedEvent.roomId === character.roomId)
    ) {
      // Must be recent (within 2 minutes) so past campaign events don't trigger toasts on rejoin
      const isFresh = (Date.now() - (lastItemReceivedEvent.timestamp || 0)) < 120000;
      const eventKey = `seen_item_evt_${lastItemReceivedEvent.id || lastItemReceivedEvent.itemName + '_' + lastItemReceivedEvent.timestamp}`;
      if (isFresh && typeof window !== 'undefined' && !localStorage.getItem(eventKey)) {
        localStorage.setItem(eventKey, 'true');
        setItemToast({ open: true, itemName: lastItemReceivedEvent.itemName, quantity: lastItemReceivedEvent.quantity });
      }
    }
  }, [lastItemReceivedEvent, character.id, character.roomId]);

  useEffect(() => {
    if (itemToast?.open) {
      const timer = setTimeout(() => setItemToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [itemToast]);

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
        title: '¡RESURRECCIÓN CELESTIAL Y MILAGRO DIVINO!',
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
  
  // Feature Edit Modal State (Pluma Mágica)
  const [featureEditModal, setFeatureEditModal] = useState<{ open: boolean; oldName: string; name: string; type: 'active' | 'passive'; usage: string; desc: string }>({
    open: false, oldName: "", name: "", type: "active", usage: "", desc: ""
  });

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

      {/* High-Impact Fullscreen DM Gift Modal (Zero Emojis) */}
      <AnimatePresence>
        {itemToast && itemToast.open && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.85, y: 30 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.85, y: 30 }} 
              className="w-full max-w-xl sm:max-w-2xl rounded-3xl overflow-hidden border-4 border-magic-gold shadow-[0_0_80px_rgba(245,208,97,0.85)] bg-gradient-to-b from-stone-950 via-zinc-900 to-black text-white relative text-center"
            >
              <div className="relative w-full h-48 sm:h-64 border-b-2 border-magic-gold/50 overflow-hidden">
                <img 
                  src={ASSETS.banners.dmGift} 
                  alt="Tesoro del DM" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold tracking-widest drop-shadow-[0_2px_15px_rgba(245,208,97,0.6)] uppercase">
                    TESORO DEL MAESTRO DE LA MAZMORRA
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 font-sans mt-2">
                    El Dungeon Master ha otorgado una nueva recompensa a tu inventario.
                  </p>
                </div>

                {/* Object Showcase Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border-2 border-magic-gold/60 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <img 
                      src={ASSETS.icons.potion} 
                      alt="Recompensa" 
                      className="w-12 h-12 object-contain shrink-0 filter drop-shadow" 
                    />
                    <div>
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-magic-gold/80 block font-cinzel font-bold">
                        Objeto Recibido
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-white leading-tight">
                        {itemToast.itemName}
                      </h3>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 rounded-full bg-magic-gold/20 border border-magic-gold text-magic-gold font-bold text-base shrink-0 font-cinzel">
                    x{itemToast.quantity}
                  </span>
                </div>

                <div>
                  <button 
                    onClick={() => setItemToast(null)}
                    className="w-full bg-gradient-to-r from-yellow-500 via-magic-gold to-yellow-600 text-black font-cinzel font-bold text-base py-3 px-6 rounded-xl hover:brightness-110 shadow-lg cursor-pointer tracking-wider transition-all transform hover:scale-[1.02]"
                  >
                    RECLAMAR RECOMPENSA
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1300px] mx-auto bg-parchment-dark min-h-[90vh] rounded-sm border-4 md:border-[12px] border-ink/90 shadow-2xl relative p-3 sm:p-6 md:p-10 flex flex-col font-sans">
        
        {/* COMBAT AND HEALTH STATUS BANNERS */}
        <CombatStatusBanners
          character={character}
          hpTerminology={hpTerminology}
          isCombatMode={isCombatMode}
          isMyTurn={isMyTurn}
          currentTurnPlayer={currentTurnPlayer}
          currentTurnMonster={currentTurnMonster}
          rollDeathSave={rollDeathSave}
          stabilizePlayer={stabilizePlayer}
          setSalvationModal={setSalvationModal}
        />

        {/* DEMO / SHOWCASE SANDBOX CONTROL BAR */}
        {isDemoMode && (
          <DemoSandboxToolbar
            character={character}
            players={players}
            viewMode={viewMode}
            setViewMode={setViewMode}
            setActivePlayerId={setActivePlayerId}
            resetDemoSandbox={resetDemoSandbox}
            modifyHPCurrent={modifyHPCurrent}
            longRest={longRest}
            addItem={addItem}
            toggleInspiration={toggleInspiration}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
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

            {!isDemoMode && (
              <div className="flex bg-parchment-dark p-1 rounded-lg border border-ink/20 text-xs font-bold">
                <button
                  onClick={() => setViewMode("sheet")}
                  className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'sheet' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:text-magic-gold'}`}
                >
                  <User className="w-3.5 h-3.5" /> Mi Hoja
                </button>
                {isDM && (
                  <button
                    onClick={() => setViewMode("dm")}
                    className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'dm' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:text-magic-gold'}`}
                  >
                    <Shield className="w-3.5 h-3.5" /> Panel DM (Maestro)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SyncStatusBadge />
            <button
              onClick={() => setDmMessageModal({ 
                open: true, 
                content: '', 
                tab: unreadFromDMCount > 0 ? 'history' : 'compose' 
              })}
              className="relative flex items-center gap-1.5 bg-parchment-dark text-ink hover:text-magic-gold px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm border border-ink/20 transition cursor-pointer"
              title="Enviar mensaje directo o consultar conversación con el DM"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Mensaje al DM
              {unreadFromDMCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-magic-red text-white text-[10px] font-extrabold rounded-full border border-white animate-bounce shadow">
                  {unreadFromDMCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTutorialOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-3.5 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition cursor-pointer border border-white/40"
            >
              <HelpCircle className="w-4 h-4" /> Tutorial de Inicio
            </button>
          </div>
        </div>

        {viewMode === "dm" && <DMPage />}
        {viewMode === "sheet" && (
          <div key="sheet-view">
            {/* Header */}
            <CombatHeader
              character={character}
              effectiveAC={effectiveAC}
              effectiveMaxHP={effectiveMaxHP}
              characterHitDice={characterHitDice}
              hpTerminology={hpTerminology}
              isEditing={isEditing}
              isCombatMode={isCombatMode}
              onOpenHPModal={(type) => setHPModal({ open: true, type, amount: 0, turns: "" })}
              onOpenStatEdit={(stat) => setStatEdit({ stat, value: 0, turns: "" })}
              toggleInspiration={toggleInspiration}
              shortRest={shortRest}
              longRest={longRest}
              spendHitDie={spendHitDie}
              advanceTurn={advanceTurn}
              isMyTurn={isMyTurn}
              currentTurnPlayerName={currentTurnPlayer?.name}
            />

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

          {/* MORIBUNDO / DEATH / ANGELIC SALVATION FULLSCREEN HIGH-IMPACT MODAL (CERO EMOJIS) */}
          <AnimatePresence>
            {salvationModal.open && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/92 backdrop-blur-xl p-4 sm:p-6 font-sans"
              >
                {salvationModal.type === 'death' ? (
                  /* MODAL DE MUERTE DE ALTO IMPACTO */
                  <motion.div 
                    initial={{ scale: 0.85, y: 30 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.85, y: 30 }} 
                    className="w-full max-w-xl sm:max-w-2xl rounded-3xl overflow-hidden border-4 border-magic-red shadow-[0_0_80px_rgba(217,56,41,0.85)] bg-gradient-to-b from-black via-zinc-950 to-black text-white relative text-center"
                  >
                    <div className="relative w-full h-52 sm:h-64 border-b-2 border-magic-red/50 overflow-hidden">
                      <img 
                        src={ASSETS.banners.death} 
                        alt="El Velo de la Muerte" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-red tracking-wider drop-shadow-[0_2px_15px_rgba(217,56,41,0.9)] uppercase">
                        EL HILO DE LA VIDA SE HA CORTADO
                      </h2>

                      <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
                        {salvationModal.desc ? salvationModal.desc.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : `${character.name} ha sucumbido a sus heridas y ha fallecido.`}
                      </p>

                      <div className="p-4 bg-red-950/40 border border-magic-red/40 rounded-xl text-sm sm:text-base text-red-200 italic font-serif leading-relaxed">
                        "El velo entre este mundo y el más allá se ha cerrado. Tu cuerpo cae inerte, pero tus hazañas perdurarán grabadas en la memoria de las leyendas."
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setSalvationModal({ ...salvationModal, open: false })}
                          className="w-full bg-gradient-to-r from-red-800 via-magic-red to-red-900 text-white font-cinzel font-bold text-base py-3 px-6 rounded-xl hover:brightness-110 shadow-lg cursor-pointer tracking-wider transition-all transform hover:scale-[1.02]"
                        >
                          ASIMILAR DESTINO
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : salvationModal.type === 'salvation' ? (
                  /* MODAL DE REVIVIR DE ALTO IMPACTO */
                  <motion.div 
                    initial={{ scale: 0.85, y: 30 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.85, y: 30 }} 
                    className="w-full max-w-xl sm:max-w-2xl rounded-3xl overflow-hidden border-4 border-magic-gold shadow-[0_0_80px_rgba(245,208,97,0.85)] bg-gradient-to-b from-sky-950 via-slate-950 to-amber-950 text-white relative text-center"
                  >
                    <div className="relative w-full h-52 sm:h-64 border-b-2 border-magic-gold/50 overflow-hidden">
                      <img 
                        src={ASSETS.banners.revive} 
                        alt="Milagro Divino" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/90 via-sky-950/40 to-transparent" />
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold tracking-wider drop-shadow-[0_2px_15px_rgba(245,208,97,0.9)] uppercase">
                        RESURRECCIÓN CELESTIAL Y MILAGRO DIVINO
                      </h2>

                      <p className="text-sm sm:text-base text-sky-100 font-sans leading-relaxed">
                        {salvationModal.desc ? salvationModal.desc.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : `La chispa de la vida regresa al cuerpo de ${character.name}.`}
                      </p>

                      <div className="p-4 bg-amber-950/40 border border-magic-gold/40 rounded-xl text-sm sm:text-base text-amber-200 italic font-serif leading-relaxed">
                        "La gracia divina envuelve tu alma. Recuperas el aliento y la llama de la vida renace ardiente en tu pecho."
                      </div>

                      <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider font-sans">
                        Puntos de Golpe Restaurados: {character.hp.current} {hpTerminology || 'HP'}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setSalvationModal({ ...salvationModal, open: false })}
                          className="w-full bg-gradient-to-r from-yellow-500 via-magic-gold to-yellow-600 text-black font-cinzel font-bold text-base py-3 px-6 rounded-xl hover:brightness-110 shadow-lg cursor-pointer tracking-wider transition-all transform hover:scale-[1.02]"
                        >
                          RENACER EN LA LUZ
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* MODAL DE RESULTADO DE SALVACIÓN / MORIBUNDO */
                  <motion.div 
                    initial={{ scale: 0.85, y: 30 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.85, y: 30 }} 
                    className="w-full max-w-lg rounded-3xl overflow-hidden border-4 border-amber-600 shadow-[0_0_60px_rgba(217,119,6,0.6)] bg-gradient-to-b from-stone-950 via-zinc-900 to-black text-white relative text-center p-6 sm:p-8 space-y-5"
                  >
                    <div className="flex justify-center">
                      <img src={ASSETS.icons.d20} className="w-14 h-14 object-contain filter drop-shadow" alt="Tirada d20" />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-amber-400 tracking-wider uppercase">
                      {salvationModal.title ? salvationModal.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : 'Salvación contra la Muerte'}
                    </h2>

                    <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
                      {salvationModal.desc ? salvationModal.desc.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : ''}
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => setSalvationModal({ ...salvationModal, open: false })}
                        className="w-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-black font-cinzel font-bold text-base py-3 px-6 rounded-xl hover:brightness-110 shadow-lg cursor-pointer tracking-wider transition-all transform hover:scale-[1.02]"
                      >
                        CONTINUAR
                      </button>
                    </div>
                  </motion.div>
                )}
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
              <StatsAndSkillsTab
                character={character}
                officialSavingThrows={officialSavingThrows}
                isEditing={isEditing}
                getEffectiveStat={getEffectiveStat}
                getAbilityMod={getAbilityMod}
                getEffectiveSkillMod={getEffectiveSkillMod}
                togglePinSkill={togglePinSkill}
                onOpenStatEdit={(stat) => setStatEdit({ stat, value: 0, turns: "" })}
                onOpenSkillEdit={(skillName) => setSkillEditModal({ open: true, skillName, value: 0, turns: "" })}
              />
            )}

            {activeTab === "class_features" && (
              <ClassFeaturesTab
                character={character}
                classFeatures={classFeatures}
                isEditing={isEditing}
                useClassFeature={useClassFeature}
                addCustomClassFeature={addCustomClassFeature}
                removeCustomClassFeature={removeCustomClassFeature}
                onOpenFeatureEdit={(feat) => setFeatureEditModal({ open: true, oldName: feat.name, ...feat })}
                showAlert={showAlert}
              />
            )}

            {activeTab === "equipment" && (
              <EquipmentInventoryTab
                character={character}
                currencyMode={room?.currencyMode}
                isEditing={isEditing}
                toggleEquipItem={toggleEquipItem}
                consumeItem={consumeItem}
                removeItem={removeItem}
                addItem={addItem}
                onOpenItemEdit={(item) => setItemEditModal({ open: true, item })}
                onOpenSpendModal={() => {
                  setSpendInput({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, reason: "" });
                  setSpendModalOpen(true);
                }}
                onOpenEditCurrencyModal={() => {
                  const cur = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
                  setEditCurrencyInput({ cp: cur.cp, sp: cur.sp, ep: cur.ep, gp: cur.gp, pp: cur.pp });
                  setEditCurrencyModalOpen(true);
                }}
              />
            )}

            {activeTab === "spells" && (
              <SpellcastingTab
                character={character}
                isEditing={isEditing}
                getEffectiveStat={getEffectiveStat}
                getAbilityMod={getAbilityMod}
                useSpellSlot={useSpellSlot}
                restoreSpellSlot={restoreSpellSlot}
                setSpellSlotMax={setSpellSlotMax}
                addSpell={addSpell}
                removeSpell={removeSpell}
                onOpenSpellEdit={(spell) => setSpellEditModal({ open: true, spell })}
              />
            )}

            {/* TAB: NOTAS PERSONALES (100% PRIVADAS AL JUGADOR) */}
            {activeTab === "notes" && (
              <PrivateNotesTab
                characterName={character.name}
                notes={notes}
                onOpenNewNote={() => setNoteModal({ open: true, editingId: null, title: '', content: '' })}
                onOpenEditNote={(note) => setNoteModal({ open: true, editingId: note.id, title: note.title, content: note.content })}
                onDeleteNote={handleDeleteNote}
                onTogglePinNote={togglePinNote}
              />
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
                    Esta nota es totalmente privada y no se compartirá con el DM.
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
                          <option value="active">Activa</option>
                          <option value="passive">Pasiva</option>
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

          {/* EDIT CURRENCY MODAL */}
          <AnimatePresence>
            {editCurrencyModalOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    Editar Bolsa de Monedas
                  </h3>
                  <p className="text-xs text-ink-light">Ajusta la cantidad de cada tipo de moneda que posee tu personaje.</p>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateCurrency(character.id, editCurrencyInput);
                    setEditCurrencyModalOpen(false);
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                      <div>
                        <label className="block text-amber-600 mb-1">Cobre (CP)</label>
                        <input
                          type="number"
                          min="0"
                          value={editCurrencyInput.cp}
                          onChange={e => setEditCurrencyInput({ ...editCurrencyInput, cp: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Plata (SP)</label>
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
                          <label className="block text-cyan-400 mb-1">Electrum (EP)</label>
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
                        <label className="block text-magic-gold mb-1">Oro (GP / PO)</label>
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
                          <label className="block text-indigo-300 mb-1">Platino (PP)</label>
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
                    Gastar / Consumir Monedas
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

          {/* DM DIRECT MESSAGE MODAL WITH SENT HISTORY & READ RECEIPTS */}
          <WhisperConversationModal
            isOpen={dmMessageModal.open}
            tab={dmMessageModal.tab}
            content={dmMessageModal.content}
            character={character}
            user={user}
            isDemoMode={isDemoMode}
            mySentMessages={mySentMessages}
            unreadFromDMCount={unreadFromDMCount}
            onClose={() => setDmMessageModal({ open: false, content: '', tab: 'compose' })}
            onTabChange={(tab) => setDmMessageModal((prev) => ({ ...prev, tab }))}
            onContentChange={(content) => setDmMessageModal((prev) => ({ ...prev, content }))}
            setMySentMessages={setMySentMessages}
            showAlert={showAlert}
          />
        </div>
        </div>
        )}

      </div>

      {/* DICE ROLLER & DM INBOX FLOATING LAUNCHERS */}
      <DiceRoller />
      {(isDemoMode || isDM) && <DMInboxFloatingButton roomId={room?.id} isDemo={isDemoMode} isDM={isDM} />}

      {/* TUTORIAL MODAL */}
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* ACCOUNT SETTINGS & CHARACTER MANAGEMENT MODAL */}
      <AccountSettingsModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} />
    </main>
  );
}
