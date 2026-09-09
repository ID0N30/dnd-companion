"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, CharacterState, ItemType, Item, Spell } from "@/store/useStore";
import { kickPlayerFromRoom, updateCampaignDetails, savePlayerInRoom, subscribeRoom, deleteDirectMessage, Room, getLogCategory, LogCategory, DirectMessage, deleteRoom } from "@/lib/rooms";
import { triggerDiceRoll } from "@/components/DiceRoller";
import TutorialModal from "@/components/TutorialModal";
import { 
  Swords, Shield, Heart, Clock, Users, ScrollText, Eye, X, Zap, Package, BookOpen, Sparkles, ChevronDown, ChevronUp, UserX, Settings, Lock, Award, Plus, Trash2, CheckCircle2, Circle, ShieldAlert, FlaskConical, Scroll, Briefcase, Sword, HelpCircle, Mail, Search, Maximize2, Filter
} from "lucide-react";

export default function DMPage({ roomId }: { roomId?: string }) {
  const { 
    players, isCombatMode, initiativeOrder, currentTurnIndex, toggleCombatMode, advanceTurn, togglePlayerDeath, togglePlayerDeathState, logs, lastTurnEvent, rollDeathSave, stabilizePlayer, levelUpPlayer, levelUpParty,
    toggleInspiration, updatePlayerStatsByDM, updatePlayerHPByDM, addItemToPlayer, removeItemFromPlayer, addSpellToPlayer, removeSpellToPlayer, convertPlayerCurrencyToStandard, showAlert, showConfirm
  } = useStore();
  const [turnToast, setTurnToast] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<"stats" | "inventory" | "spells">("stats");
  const [showLogsMobile, setShowLogsMobile] = useState(false);
  const [levelUpConfirm, setLevelUpConfirm] = useState<{ open: boolean; type: 'player' | 'party'; playerId?: string; playerName?: string; currentLevel?: number }>({ open: false, type: 'party' });

  const [onlyPresentFilter, setOnlyPresentFilter] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  // DM Action Log Search & Filter States
  const [logCategoryFilter, setLogCategoryFilter] = useState<LogCategory>('all');
  const [logSearchText, setLogSearchText] = useState('');
  const [fullLogModalOpen, setFullLogModalOpen] = useState(false);

  // DM Inbox States & Demo Fallbacks
  const [inboxPlayerFilter, setInboxPlayerFilter] = useState<string>('all');
  const [inboxSearchText, setInboxSearchText] = useState<string>('');
  const [fullInboxModalOpen, setFullInboxModalOpen] = useState<boolean>(false);
  const [demoMessages, setDemoMessages] = useState<DirectMessage[]>([
    {
      id: 'demo_msg_1',
      senderId: 'drizzt_dourden_demo',
      senderName: "Drizzt Do'Urden",
      characterName: "Drizzt Do'Urden",
      content: 'DM, encontré una extraña runa drow en la cueva. ¿Puedo hacer una prueba de Historia o Arcanos para identificar su origen?',
      timestamp: Date.now() - 1000 * 60 * 15
    },
    {
      id: 'demo_msg_2',
      senderId: 'demo_player_2',
      senderName: 'Gimli',
      characterName: 'Gimli',
      content: 'Tengo un mal presagio sobre la puerta de hierro... Me preparo para lanzar un ataque de oportunidad si algo emerge.',
      timestamp: Date.now() - 1000 * 60 * 45
    }
  ]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeRoom(roomId, (roomData) => {
      setRoom(roomData);
    });
    return () => unsub();
  }, [roomId]);

  const isDemo = !roomId;
  const activeId = useStore.getState().activePlayerId;
  const effectivePlayers = isDemo 
    ? players.filter(p => p.id === activeId || p.id === 'drizzt_dourden_demo')
    : players;

  const effectiveDirectMessages: DirectMessage[] = room?.directMessages || (isDemo ? demoMessages : []);

  const handleDeleteDirectMessage = async (msgId: string) => {
    const activeRoomId = roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
    if (activeRoomId) {
      await deleteDirectMessage(activeRoomId, msgId);
    } else {
      setDemoMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const playerNamesInParty = players.map(p => p.name);
  const messageSenderNames = effectiveDirectMessages.map(m => m.characterName || m.senderName);
  const allPlayerOptions = Array.from(new Set([...playerNamesInParty, ...messageSenderNames])).filter(Boolean);

  const filteredInboxMessages = effectiveDirectMessages.filter(msg => {
    const senderName = msg.characterName || msg.senderName || '';
    const matchesPlayer = inboxPlayerFilter === 'all' || 
      senderName.toLowerCase() === inboxPlayerFilter.toLowerCase() || 
      msg.senderId === inboxPlayerFilter;
    const matchesSearch = !inboxSearchText.trim() || 
      senderName.toLowerCase().includes(inboxSearchText.toLowerCase()) || 
      msg.content.toLowerCase().includes(inboxSearchText.toLowerCase());
    return matchesPlayer && matchesSearch;
  });

  const isPlayerOnline = (p: CharacterState) => {
    if (p.isOnline === false) return false;
    if (!p.lastSeen) return true;
    return (Date.now() - p.lastSeen) < 65000;
  };

  const handleCleanAbsentPlayers = () => {
    const absentPlayers = players.filter(p => !isPlayerOnline(p));
    if (absentPlayers.length === 0) {
      showAlert("No hay jugadores ausentes en la campaña.", "Sin Ausentes", "info");
      return;
    }
    showConfirm(
      `¿Deseas eliminar a los ${absentPlayers.length} personaje(s) ausente(s) de la campaña?`,
      async () => {
        const activeRoomId = roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
        for (const p of absentPlayers) {
          if (activeRoomId) {
            await kickPlayerFromRoom(activeRoomId, p.id, p.name);
          }
        }
      },
      "Limpiar Jugadores Ausentes",
      "Sí, Limpiar Ausentes",
      "Cancelar"
    );
  };

  const syncPlayer = (playerId: string) => {
    let effectiveRoomId = roomId;
    if (!effectiveRoomId && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      if (parts[1] === 'room' && parts[2]) {
        effectiveRoomId = parts[2];
      }
    }
    if (!effectiveRoomId) return;

    setTimeout(() => {
      const targetPlayer = useStore.getState().players.find(p => p.id === playerId);
      if (targetPlayer) {
        savePlayerInRoom(effectiveRoomId!, targetPlayer);
      }
    }, 50);
  };

  // Campaign Admin Modal State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    password: "",
    isPublic: true,
    allowGuests: true,
    hpTerminology: (useStore.getState().hpTerminology || 'HP') as 'PG' | 'HP',
    currencyMode: (room?.currencyMode || 'all') as 'standard' | 'all'
  });

  const inspectedPlayer = players.find(p => p.id === inspectedPlayerId) || players[0];

  // Combat Specific Player Selection State
  const [combatSelectModal, setCombatSelectModal] = useState(false);
  const [selectedCombatPlayerIds, setSelectedCombatPlayerIds] = useState<string[]>([]);

  // DM Inspect Edit Forms State
  const [dmNewItem, setDmNewItem] = useState<{ name: string; type: ItemType; desc: string; qty: number; damage: string; acBonus: number; equipped: boolean }>({
    name: "", type: "general", desc: "", qty: 1, damage: "", acBonus: 0, equipped: false
  });
  const [dmNewSpell, setDmNewSpell] = useState({ name: "", level: 1, school: "Evocación", desc: "", castingTime: "1 Acción" });
  const [dmHPEdit, setDmHPEdit] = useState({ current: 0, max: 0, temp: 0 });
  const [dmStatsEdit, setDmStatsEdit] = useState<{ str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number }>({});

  useEffect(() => {
    if (room) {
      setAdminForm({
        name: room.name || "",
        password: room.password || "",
        isPublic: room.isPublic ?? true,
        allowGuests: room.allowGuests ?? true,
        hpTerminology: (room.hpTerminology || useStore.getState().hpTerminology || 'HP') as 'PG' | 'HP',
        currencyMode: (room.currencyMode || 'all') as 'standard' | 'all'
      });
    }
  }, [room]);

  useEffect(() => {
    if (inspectedPlayer) {
      setDmHPEdit({ current: inspectedPlayer.hp.current, max: inspectedPlayer.hp.max, temp: inspectedPlayer.hp.temp || 0 });
      setDmStatsEdit({ ...inspectedPlayer.stats });
    }
  }, [inspectedPlayerId]);

  useEffect(() => {
    if (lastTurnEvent) {
      setTurnToast(true);
      const timer = setTimeout(() => setTurnToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastTurnEvent]);

  const getAbilityMod = (score: number) => Math.floor((score - 10) / 2);

  const getEffectiveStat = (p: CharacterState, statName: string) => {
    if (statName === 'hp_max') {
      const base = p.hp.max;
      const modSum = p.modifiers.filter(m => m.targetStat === 'hp_max').reduce((acc, m) => acc + (m.value || 0), 0);
      return base + modSum;
    }
    if (statName === 'ac') {
      const base = p.ac;
      const modSum = p.modifiers.filter(m => m.targetStat === 'ac').reduce((acc, m) => acc + (m.value || 0), 0);
      const itemACBonus = p.inventory
        .filter(i => i.equipped && i.acBonus)
        .reduce((acc, i) => acc + (i.acBonus || 0), 0);
      return base + modSum + itemACBonus;
    }
    const base = (p.stats as any)[statName] || 10;
    const modSum = p.modifiers.filter(m => m.targetStat === statName).reduce((acc, m) => acc + (m.value || 0), 0);
    return base + modSum;
  };

  const handleKickPlayer = (p: CharacterState) => {
    showConfirm(
      `¿Estás seguro de que deseas expulsar a ${p.name} de la campaña?`,
      async () => {
        const activeRoomId = roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
        if (activeRoomId) {
          await kickPlayerFromRoom(activeRoomId, p.id, p.name);
        } else {
          useStore.setState({ players: players.filter(item => item.id !== p.id) });
        }
      },
      "Expulsar Jugador",
      "Sí, Expulsar",
      "Cancelar"
    );
  };

  const handleDeleteCampaign = () => {
    showConfirm(
      `⚠️ ATENCIÓN: ¿Estás completamente seguro de que deseas ELIMINAR PERMANENTEMENTE la campaña "${room?.name || 'actual'}"?\n\nSe borrará la sala, el registro de acciones y todos los datos sincronizados para los jugadores. Esta acción no se puede deshacer.`,
      async () => {
        const effectiveRoomId = roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
        if (effectiveRoomId) {
          await deleteRoom(effectiveRoomId);
          setAdminModalOpen(false);
          showAlert("La campaña ha sido eliminada permanentemente.", "Campaña Eliminada", "warning");
          setTimeout(() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }, 1000);
        } else {
          setAdminModalOpen(false);
          showAlert("Se ha reiniciado la campaña en la Mesa de Pruebas.", "Mesa Reiniciada", "info");
        }
      },
      "🔥 Eliminar Campaña Permanentemente",
      "Sí, Eliminar Campaña",
      "Cancelar"
    );
  };

  const handleSaveCampaignSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveRoomId = roomId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '');
    if (effectiveRoomId) {
      const finalName = adminForm.name.trim() || room?.name || "Campaña de D&D";
      const finalPassword = adminForm.password.trim() || room?.password || "";
      await updateCampaignDetails(effectiveRoomId, {
        name: finalName,
        hasPassword: Boolean(finalPassword),
        password: finalPassword,
        isPublic: adminForm.isPublic,
        allowGuests: adminForm.allowGuests,
        hpTerminology: adminForm.hpTerminology,
        currencyMode: adminForm.currencyMode
      });
      if (adminForm.currencyMode === 'standard') {
        const state = useStore.getState();
        state.players.forEach(p => {
          if (!p.roomId || p.roomId === effectiveRoomId) {
            convertPlayerCurrencyToStandard(p.id);
          }
        });
      }
      useStore.setState({ 
        hpTerminology: adminForm.hpTerminology,
        currencyMode: adminForm.currencyMode 
      });
      setAdminModalOpen(false);
      showAlert("Ajustes de la campaña actualizados con éxito.", "Ajustes Guardados", "success");
    }
  };

  return (
    <main className="min-h-screen p-3 md:p-6 lg:p-8 relative font-sans">
      
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
            <span>¡Turno Avanzado! Todos los efectos temporales de la party se actualizaron.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* Sidebar Controls & Logs */}
        <div className="w-full lg:w-5/12 xl:w-4/12 space-y-4 lg:space-y-6 flex flex-col lg:h-[90vh] shrink-0">
          
          {/* DM Master Control Panel */}
          <div className="bg-parchment-dark p-4 sm:p-6 rounded-xl text-ink shadow-2xl border-2 border-magic-gold shrink-0 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold flex items-center gap-3">
                <Swords className="w-6 h-6 sm:w-8 sm:h-8" /> Panel Maestro
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullInboxModalOpen(true)}
                  className="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2.5 py-1.5 rounded font-bold text-xs shadow hover:scale-105 transition cursor-pointer border border-yellow-300"
                  title="Abrir Buzón del DM"
                >
                  <Mail className="w-4 h-4 text-black" />
                  <span>Buzón</span>
                  {effectiveDirectMessages.length > 0 && (
                    <span className="bg-magic-red text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow animate-bounce ml-0.5">
                      {effectiveDirectMessages.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTutorialOpen(true)}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2.5 py-1.5 rounded font-bold text-xs shadow hover:scale-105 transition cursor-pointer"
                  title="Ver Tutorial Inicial"
                >
                  <HelpCircle className="w-4 h-4" /> <span>Tutorial</span>
                </button>
                <button 
                  onClick={() => setAdminModalOpen(true)}
                  className="p-2 bg-parchment border border-ink/20 rounded hover:border-magic-gold text-magic-gold transition cursor-pointer"
                  title="Administrar Campaña (Cambiar nombre / contraseña)"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => {
                const isStarting = !isCombatMode;
                if (isStarting) {
                  const activePresent = players.filter(p => isPlayerOnline(p)).map(p => p.id);
                  setSelectedCombatPlayerIds(activePresent.length > 0 ? activePresent : players.map(p => p.id));
                  setCombatSelectModal(true);
                } else {
                  toggleCombatMode(false, roomId);
                }
              }}
              className={`w-full py-3 sm:py-4 text-lg sm:text-xl font-bold font-sans rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]
                ${isCombatMode 
                  ? 'bg-magic-red text-white shadow-[0_0_20px_rgba(217,56,41,0.8)] hover:bg-red-700' 
                  : 'bg-magic-gold text-black hover:bg-yellow-500 shadow-md'}`}
            >
              <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
              {isCombatMode ? "Finalizar Combate" : "¡INICIAR COMBATE!"}
            </button>

            <button
              onClick={() => advanceTurn(roomId)}
              className="w-full py-3 sm:py-4 text-lg sm:text-xl font-bold font-sans rounded-lg bg-parchment text-ink border border-ink/20 hover:bg-parchment/80 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-magic-gold" /> Siguiente Turno
            </button>

            <button
              onClick={() => setLevelUpConfirm({ open: true, type: 'party', playerName: 'Toda la Party' })}
              className="w-full py-3.5 text-base sm:text-lg font-bold font-sans rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-sky-500 text-slate-950 shadow-[0_0_20px_rgba(245,208,97,0.6)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Award className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> Subir de Nivel a Toda la Party
            </button>
          </div>

          {/* Action Logs (Advanced Search & Filter) */}
          {(() => {
            const filteredLogs = logs.filter(log => {
              const cat = getLogCategory(log.message);
              const matchesCategory = logCategoryFilter === 'all' || cat.type === logCategoryFilter;
              const matchesSearch = !logSearchText.trim() || log.message.toLowerCase().includes(logSearchText.toLowerCase());
              return matchesCategory && matchesSearch;
            });

            return (
              <div className="bg-parchment-dark p-4 sm:p-5 rounded-xl border-2 border-ink/20 shadow-lg flex flex-col overflow-hidden space-y-3 min-h-[260px]">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-cinzel text-ink flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-magic-red" /> Registro de Acciones ({filteredLogs.length})
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFullLogModalOpen(true)}
                      className="px-2.5 py-1 bg-magic-gold text-black rounded text-xs font-bold hover:bg-yellow-500 transition shadow flex items-center gap-1 cursor-pointer"
                      title="Abrir historial completo en pantalla amplia"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Ampliar
                    </button>
                    <button 
                      onClick={() => setShowLogsMobile(!showLogsMobile)}
                      className="lg:hidden text-xs text-magic-gold flex items-center gap-1 font-sans font-bold cursor-pointer p-1"
                    >
                      {showLogsMobile ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="space-y-2 font-sans text-xs">
                  <div className="relative">
                    <input
                      type="text"
                      value={logSearchText}
                      onChange={e => setLogSearchText(e.target.value)}
                      placeholder="Buscar por jugador o palabra..."
                      className="w-full p-1.5 pl-7 bg-parchment border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold"
                    />
                    <Search className="w-3.5 h-3.5 text-ink-light absolute left-2 top-2" />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {(['all', 'combat', 'currency', 'rests', 'features', 'rolls'] as const).map(catKey => {
                      const labels: Record<string, string> = {
                        all: 'Todos',
                        combat: '⚔️ Combate',
                        currency: '💰 Economía',
                        rests: '⛺ Descansos',
                        features: '📜 Conjuros',
                        rolls: '🎲 Tiradas'
                      };
                      return (
                        <button
                          key={catKey}
                          onClick={() => setLogCategoryFilter(catKey)}
                          className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer transition ${logCategoryFilter === catKey ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
                        >
                          {labels[catKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-y-auto pr-1 space-y-2 font-sans text-xs h-[175px] min-h-[175px] shrink-0 block">
                  {filteredLogs.length === 0 ? (
                    <p className="text-ink/50 italic text-center py-4">No hay acciones registradas con los filtros actuales.</p>
                  ) : (
                    filteredLogs.map(log => {
                      const categoryInfo = getLogCategory(log.message);
                      return (
                        <div key={log.id} className="p-2.5 bg-parchment border border-ink/15 rounded-lg shadow-sm leading-relaxed space-y-1">
                          <div className="flex justify-between items-center border-b border-ink/10 pb-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${categoryInfo.badgeClass}`}>
                              {categoryInfo.icon} {categoryInfo.label}
                            </span>
                            <span className="text-[10px] text-ink/50 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-bold text-ink text-xs break-words">{log.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

        </div>

        {/* Party Overview */}
        <div className="w-full lg:w-7/12 xl:w-8/12 lg:h-[90vh] lg:overflow-y-auto space-y-4 sm:space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-ink flex items-center gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-magic-gold" /> Integrantes ({players.filter(p => isPlayerOnline(p)).length} en línea / {players.length} totales)
            </h2>

            <div className="flex items-center gap-3 flex-wrap text-xs font-sans font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer bg-parchment px-3 py-1.5 rounded border border-ink/20 hover:border-magic-gold">
                <input 
                  type="checkbox" 
                  checked={onlyPresentFilter} 
                  onChange={e => setOnlyPresentFilter(e.target.checked)} 
                  className="w-4 h-4 accent-magic-gold cursor-pointer"
                />
                <span>Solo presentes</span>
              </label>

              {players.some(p => !isPlayerOnline(p)) && (
                <button
                  onClick={handleCleanAbsentPlayers}
                  className="px-3 py-1.5 bg-red-950/20 text-red-600 border border-red-500/40 rounded hover:bg-magic-red hover:text-white transition cursor-pointer flex items-center gap-1"
                  title="Eliminar personajes ausentes/desconectados de la campaña"
                >
                  🧹 Limpiar Ausentes ({players.filter(p => !isPlayerOnline(p)).length})
                </button>
              )}
            </div>
          </div>

          {/* COMBAT INITIATIVE ORDER TRACKER */}
          {isCombatMode && initiativeOrder.length > 0 && (
            <div className="bg-parchment-dark p-3 sm:p-4 rounded-xl border-2 border-magic-gold shadow-lg space-y-3 font-sans">
              <h3 className="font-bold font-cinzel text-base sm:text-lg text-magic-gold flex items-center gap-2 flex-wrap">
                <span>🎲 Orden de Iniciativa D&D 5e</span>
                <span className="text-[10px] sm:text-xs bg-magic-gold text-black px-2 py-0.5 rounded font-bold uppercase">Turno Actual: {players.find(p => p.id === initiativeOrder[currentTurnIndex])?.name}</span>
              </h3>

              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {initiativeOrder.map((pid, idx) => {
                  const p = players.find(player => player.id === pid);
                  const isCurrent = idx === currentTurnIndex;
                  if (!p) return null;
                  return (
                    <div 
                      key={pid}
                      className={`p-2.5 rounded-lg border-2 min-w-[130px] sm:min-w-[150px] transition-all flex flex-col justify-between shrink-0
                        ${isCurrent 
                          ? 'bg-magic-gold text-black border-white shadow-[0_0_15px_rgba(245,208,97,0.8)] scale-105 font-bold' 
                          : 'bg-parchment text-ink border-ink/20 opacity-80'}`}
                    >
                      <div className="flex justify-between items-center mb-1 text-[10px] sm:text-xs">
                        <span>#{idx + 1}</span>
                        {isCurrent && <span className="bg-black text-magic-gold px-1.5 py-0.5 rounded text-[9px]">TURNO</span>}
                      </div>
                      <span className="text-sm sm:text-base truncate block">{p.name}</span>
                      <span className="text-[10px] sm:text-xs mt-1 block">
                        Iniciativa: <span className="font-bold">{p.initiative?.total || 0}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {(onlyPresentFilter ? effectivePlayers.filter(p => isPlayerOnline(p)) : effectivePlayers).map(p => {
              const effMaxHP = getEffectiveStat(p, 'hp_max');
              const effAC = getEffectiveStat(p, 'ac');
              const online = isPlayerOnline(p);
              return (
                <motion.div 
                  key={p.id}
                  layout
                  className={`p-4 sm:p-6 rounded-xl border-2 sm:border-4 transition-all ${isCombatMode ? 'bg-parchment-dark border-magic-red shadow-[0_0_20px_rgba(217,56,41,0.3)]' : 'bg-parchment border-ink/20'} ${!online ? 'opacity-70' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 flex-wrap">
                        {p.name}
                        {online ? (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">🟢 En línea</span>
                        ) : (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">🔴 Ausente</span>
                        )}
                        {p.isDying && <span className="text-[10px] bg-magic-red text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">🩸 Moribundo</span>}
                        {p.isStable && <span className="text-[10px] bg-magic-gold text-black px-2 py-0.5 rounded font-bold uppercase">🛡️ Estabilizado</span>}
                        {p.isDead && <span className="text-[10px] bg-black text-magic-red border border-magic-red px-2 py-0.5 rounded font-bold uppercase">☠️ Muerto</span>}
                      </h3>
                      <p className="font-sans text-ink-light text-xs sm:text-sm">{p.race} {p.charClass} (Nivel {p.level})</p>
                    </div>

                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {/* Inspiration Toggle Button */}
                      <button
                        onClick={() => {
                          toggleInspiration(p.id);
                          syncPlayer(p.id);
                        }}
                        className={`flex items-center gap-1 text-xs font-bold font-sans px-2 py-1.5 rounded transition cursor-pointer shrink-0 ${p.inspiration ? 'bg-magic-gold text-black shadow-[0_0_10px_rgba(245,208,97,0.8)]' : 'bg-parchment text-ink/70 border border-ink/20 hover:border-magic-gold'}`}
                        title={p.inspiration ? "Revocar Inspiración D&D 5e" : "Otorgar Inspiración D&D 5e"}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {p.inspiration ? '⭐ Inspirado' : '⭐ Inspirar'}
                      </button>

                      <button
                        onClick={() => setInspectedPlayerId(p.id)}
                        className="flex items-center gap-1 text-xs font-bold font-sans bg-magic-gold text-black px-2 py-1.5 rounded hover:bg-yellow-500 transition cursor-pointer shadow shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspeccionar
                      </button>

                      {/* Individual Level Up Button */}
                      <button
                        onClick={() => setLevelUpConfirm({ open: true, type: 'player', playerId: p.id, playerName: p.name, currentLevel: p.level })}
                        className="flex items-center gap-1 text-xs font-bold font-sans bg-slate-900 text-amber-300 border border-amber-400/60 px-2 py-1.5 rounded hover:bg-amber-400 hover:text-slate-950 transition cursor-pointer shrink-0 shadow-sm"
                        title={`Subir a ${p.name} al Nivel ${Math.min(20, p.level + 1)}`}
                      >
                        <Award className="w-3.5 h-3.5" /> +1 Nivel
                      </button>

                      {/* State Quick Controls Dropdown / Buttons */}
                      <div className="flex gap-1 flex-wrap">
                        {!p.isDying && !p.isDead && (
                          <button
                            onClick={() => {
                              togglePlayerDeathState(p.id, 'dying');
                              syncPlayer(p.id);
                            }}
                            className="flex items-center gap-1 text-xs font-bold font-sans bg-magic-red/80 text-white px-2 py-1.5 rounded hover:bg-magic-red transition cursor-pointer shrink-0 shadow-sm"
                            title="Marcar como Moribundo (0 HP)"
                          >
                            🩸 Moribundo
                          </button>
                        )}

                        {p.isDying && (
                          <button
                            onClick={() => {
                              togglePlayerDeathState(p.id, 'stable');
                              syncPlayer(p.id);
                            }}
                            className="flex items-center gap-1 text-xs font-bold font-sans bg-magic-gold text-black px-2 py-1.5 rounded hover:bg-yellow-500 transition cursor-pointer shrink-0 shadow-sm"
                            title="Estabilizar a 0 HP"
                          >
                            🛡️ Estabilizar
                          </button>
                        )}

                        {(p.isDead || p.isDying || p.isStable) && (
                          <button
                            onClick={() => {
                              togglePlayerDeathState(p.id, 'revive');
                              syncPlayer(p.id);
                            }}
                            className="flex items-center gap-1 text-xs font-bold font-sans bg-emerald-600 text-white px-2 py-1.5 rounded hover:bg-emerald-700 transition cursor-pointer shrink-0 shadow-sm"
                            title="Revivir Personaje"
                          >
                            ✨ Revivir
                          </button>
                        )}

                        {!p.isDead && (
                          <button
                            onClick={() => {
                              showConfirm(
                                `⚠️ ¿Estás seguro de que deseas marcar como FALLECIDO a ${p.name}?`,
                                () => {
                                  togglePlayerDeathState(p.id, 'dead');
                                  syncPlayer(p.id);
                                },
                                "Declarar Fallecido",
                                "Sí, Fallecido",
                                "Cancelar"
                              );
                            }}
                            className="flex items-center gap-1 text-xs font-bold font-sans bg-black text-red-400 border border-red-500/40 px-2 py-1.5 rounded hover:bg-magic-red hover:text-white transition cursor-pointer shrink-0"
                            title="Declarar Fallecido"
                          >
                            ☠️ Fallecido
                          </button>
                        )}
                      </div>

                      {/* Kick Player Button */}
                      <button
                        onClick={() => handleKickPlayer(p)}
                        className="flex items-center gap-1 text-xs font-bold font-sans bg-magic-red/20 text-magic-red border border-magic-red/40 px-2 py-1.5 rounded hover:bg-magic-red hover:text-white transition cursor-pointer shrink-0"
                        title="Expulsar de la Campaña"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Moribundo DM Action Controls */}
                  {p.isDying && !p.isDead && (
                    <div className="mb-3 p-2.5 bg-red-950/80 border border-magic-red rounded-lg font-sans text-xs space-y-2 text-white">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="font-bold text-magic-gold">Salvaciones contra la Muerte:</span>
                        <div className="flex gap-3">
                          <span className="text-emerald-400 font-bold">🟢 Éxitos: {p.deathSaves?.successes || 0}/3</span>
                          <span className="text-magic-red font-bold">🔴 Fallos: {p.deathSaves?.failures || 0}/3</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        <button
                          onClick={() => {
                            rollDeathSave(p.id);
                            syncPlayer(p.id);
                          }}
                          className="px-2.5 py-1 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 text-[11px] cursor-pointer"
                        >
                          🎲 Tirar Salvación (d20)
                        </button>
                        <button
                          onClick={() => {
                            stabilizePlayer(p.id, 1);
                            syncPlayer(p.id);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 text-[11px] cursor-pointer"
                          title="Un compañero otorga auxilio o curación"
                        >
                          🩹 Auxilio (+1 HP)
                        </button>
                        <button
                          onClick={() => {
                            stabilizePlayer(p.id, 0);
                            syncPlayer(p.id);
                          }}
                          className="px-2.5 py-1 bg-ink/50 text-white font-bold rounded hover:bg-ink text-[11px] cursor-pointer"
                          title="Estabilizar a 0 HP"
                        >
                          🛡️ Estabilizar (0 HP)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* HP & AC summary */}
                  <div className="grid grid-cols-2 gap-3 mb-3 font-sans">
                    <div className="flex items-center gap-2.5 bg-parchment-dark p-2.5 rounded-lg border border-magic-red/40 shadow-sm">
                      <Heart className="w-5 h-5 text-magic-red fill-magic-red shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light block font-cinzel">HP / PG</span>
                        <span className={`font-bold font-mono text-base sm:text-lg leading-tight ${effMaxHP !== p.hp.max ? 'text-magic-gold' : 'text-ink'}`}>
                          {p.hp.current} / {effMaxHP}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-parchment-dark p-2.5 rounded-lg border border-magic-gold/40 shadow-sm">
                      <Shield className="w-5 h-5 text-magic-gold shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light block font-cinzel">CA</span>
                        <span className={`font-bold font-mono text-base sm:text-lg leading-tight ${effAC !== p.ac ? 'text-magic-gold' : 'text-ink'}`}>
                          {effAC}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Modifiers Overview */}
                  <div className="mt-3 pt-3 border-t border-ink/10">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-ink-light mb-2 font-sans flex items-center justify-between">
                      Efectos Activos
                      <span className="text-[10px] bg-ink text-parchment-dark px-2 py-0.5 rounded-full font-bold">{p.modifiers.length}</span>
                    </h4>
                    {p.modifiers.length === 0 ? (
                      <p className="text-xs font-sans italic text-ink/50">Sin efectos temporales activos.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {p.modifiers.map(mod => (
                          <div key={mod.id} className="flex justify-between items-center bg-parchment-dark p-1.5 px-2 rounded border border-ink/10 text-xs">
                            <span className="font-bold font-sans text-ink truncate">{mod.name}</span>
                            <span className="font-bold font-sans bg-magic-gold/20 text-magic-gold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                              {mod.duration !== null ? `${mod.duration}t` : 'Perm'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

          </div>
        </div>

      </div>

      {/* DM CAMPAIGN ADMIN MODAL */}
      <AnimatePresence>
        {adminModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl font-sans space-y-4">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Settings className="w-6 h-6" /> Administrar Campaña
              </h3>

              <form onSubmit={handleSaveCampaignSettings} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold mb-1">Nombre de la Campaña</label>
                  <input 
                    type="text" 
                    value={adminForm.name}
                    onChange={e => setAdminForm({...adminForm, name: e.target.value})}
                    placeholder="Nuevo nombre..."
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Cambiar / Eliminar Contraseña</label>
                  <input 
                    type="password" 
                    name="campaign_admin_pass_code"
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    value={adminForm.password}
                    onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                    placeholder="Dejar vacío para entrada libre sin clave"
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Nomenclatura de Puntos de Vida</label>
                  <select 
                    value={adminForm.hpTerminology} 
                    onChange={e => setAdminForm({...adminForm, hpTerminology: e.target.value as 'PG' | 'HP'})}
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                  >
                    <option value="HP">HP (Hit Points)</option>
                    <option value="PG">PG (Puntos de Golpe)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Sistema de Monedas D&D</label>
                  <select 
                    value={adminForm.currencyMode} 
                    onChange={e => setAdminForm({...adminForm, currencyMode: e.target.value as 'standard' | 'all'})}
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                  >
                    <option value="all">🪙 Todas las Monedas (CP, SP, EP, GP, PP)</option>
                    <option value="standard">🪙 Monedas Estándar (CP, SP, GP)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPublicAdmin"
                    checked={adminForm.isPublic}
                    onChange={e => setAdminForm({...adminForm, isPublic: e.target.checked})}
                    className="w-4 h-4 accent-magic-gold cursor-pointer"
                  />
                  <label htmlFor="isPublicAdmin" className="font-bold cursor-pointer">Visible en la lista pública</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="allowGuestsAdmin"
                    checked={adminForm.allowGuests}
                    onChange={e => setAdminForm({...adminForm, allowGuests: e.target.checked})}
                    className="w-4 h-4 accent-magic-gold cursor-pointer"
                  />
                  <label htmlFor="allowGuestsAdmin" className="font-bold cursor-pointer">Permitir entrada a usuarios invitados</label>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-ink/20 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteCampaign}
                    className="px-3.5 py-2 bg-red-950/40 text-red-400 border border-red-500/40 rounded font-bold hover:bg-magic-red hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs"
                    title="Eliminar permanentemente esta campaña para todos los jugadores"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar Campaña
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAdminModalOpen(false)} className="px-4 py-2 text-ink-light hover:text-ink font-bold text-xs cursor-pointer">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition shadow cursor-pointer">Guardar Ajustes</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAYER INSPECTION MODAL */}
      <AnimatePresence>
        {inspectedPlayerId && inspectedPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-lg w-[95%] max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl relative">
              <div className="flex justify-between items-start border-b border-ink/20 pb-3 mb-3">
                <div>
                  <h3 className="text-xl sm:text-3xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> {inspectedPlayer.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-light font-sans">
                    {inspectedPlayer.race} {inspectedPlayer.charClass} • Nivel {inspectedPlayer.level}
                  </p>
                </div>
                <button onClick={() => setInspectedPlayerId(null)} className="p-1.5 text-ink-light hover:text-magic-red cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-2 border-b border-ink/20 pb-3 mb-3 font-sans font-bold text-xs sm:text-sm overflow-x-auto whitespace-nowrap">
                <button onClick={() => setInspectTab("stats")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${inspectTab === 'stats' ? 'bg-magic-gold text-black' : 'text-ink hover:bg-ink/10'}`}><Zap className="w-4 h-4"/> Atributos</button>
                <button onClick={() => setInspectTab("inventory")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${inspectTab === 'inventory' ? 'bg-magic-gold text-black' : 'text-ink hover:bg-ink/10'}`}><Package className="w-4 h-4"/> Inventario ({inspectedPlayer.inventory.length})</button>
                <button onClick={() => setInspectTab("spells")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${inspectTab === 'spells' ? 'bg-magic-gold text-black' : 'text-ink hover:bg-ink/10'}`}><BookOpen className="w-4 h-4"/> Hechizos</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 font-sans text-xs sm:text-sm">
                {inspectTab === "stats" && (
                  <div className="space-y-6">
                    {/* Stats overview & quick roll */}
                    <div>
                      <h4 className="font-bold font-cinzel text-magic-gold mb-2 text-sm">🎲 Tiradas de Atributo</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {Object.entries(inspectedPlayer.stats).map(([stat, baseVal]) => {
                          const eff = getEffectiveStat(inspectedPlayer, stat);
                          const mod = getAbilityMod(eff);
                          return (
                            <div 
                              key={stat} 
                              onClick={() => triggerDiceRoll('d20', mod, `Prueba de ${stat.toUpperCase()} (${inspectedPlayer.name})`)}
                              className="bg-parchment p-2 rounded border border-ink/10 text-center cursor-pointer hover:bg-ink/5 transition"
                              title={`Lanzar d20 + ${mod} para ${inspectedPlayer.name}`}
                            >
                              <span className="font-bold text-[10px] uppercase text-ink-light block">🎲 {stat}</span>
                              <span className="text-lg font-serif font-bold text-ink block">{eff}</span>
                              <span className="text-[10px] text-magic-gold font-bold">Mod: {mod >= 0 ? `+${mod}` : mod}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DM Base Stats Edit Form */}
                    <div className="p-3 bg-parchment rounded border border-ink/20 space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">✏️ Modificar Atributos Base del Jugador (DM)</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(statKey => (
                          <div key={statKey}>
                            <label className="text-[10px] font-bold uppercase text-ink-light block mb-0.5">{statKey}</label>
                            <input 
                              type="number" 
                              value={dmStatsEdit[statKey] !== undefined ? dmStatsEdit[statKey] : inspectedPlayer.stats[statKey]}
                              onChange={e => setDmStatsEdit({ ...dmStatsEdit, [statKey]: parseInt(e.target.value) || 10 })}
                              className="w-full p-1 bg-parchment-dark border border-ink/30 rounded text-center font-bold text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          updatePlayerStatsByDM(inspectedPlayer.id, dmStatsEdit);
                          syncPlayer(inspectedPlayer.id);
                          showAlert(`Puntuaciones base de ${inspectedPlayer.name} actualizadas por el DM.`, "Atributos Guardados", "success");
                        }}
                        className="mt-2 px-3 py-1.5 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer"
                      >
                        Guardar Puntuaciones Base
                      </button>
                    </div>

                    {/* DM HP Edit Form */}
                    <div className="p-3 bg-parchment rounded border border-ink/20 space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">❤️ Modificar Puntos de Vida (DM)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-light block mb-0.5">HP Actual</label>
                          <input 
                            type="number" 
                            value={dmHPEdit.current}
                            onChange={e => setDmHPEdit({ ...dmHPEdit, current: parseInt(e.target.value) || 0 })}
                            className="w-full p-1 bg-parchment-dark border border-ink/30 rounded text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-light block mb-0.5">HP Máximo</label>
                          <input 
                            type="number" 
                            value={dmHPEdit.max}
                            onChange={e => setDmHPEdit({ ...dmHPEdit, max: parseInt(e.target.value) || 1 })}
                            className="w-full p-1 bg-parchment-dark border border-ink/30 rounded text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-light block mb-0.5">HP Temporal</label>
                          <input 
                            type="number" 
                            value={dmHPEdit.temp}
                            onChange={e => setDmHPEdit({ ...dmHPEdit, temp: parseInt(e.target.value) || 0 })}
                            className="w-full p-1 bg-parchment-dark border border-ink/30 rounded text-center font-bold text-xs"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          updatePlayerHPByDM(inspectedPlayer.id, dmHPEdit);
                          syncPlayer(inspectedPlayer.id);
                          showAlert(`Puntos de Vida de ${inspectedPlayer.name} actualizados.`, "HP Actualizado", "success");
                        }}
                        className="mt-2 px-3 py-1.5 bg-magic-red text-white font-bold text-xs rounded hover:bg-red-700 transition cursor-pointer"
                      >
                        Guardar Puntos de Vida
                      </button>
                    </div>
                  </div>
                )}

                {inspectTab === "inventory" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">🎒 Inventario de {inspectedPlayer.name}</h4>
                      {inspectedPlayer.inventory.length === 0 ? (
                        <p className="text-xs italic text-ink/50">El inventario está vacío.</p>
                      ) : (
                        inspectedPlayer.inventory.map(item => (
                          <div key={item.id} className="p-2.5 bg-parchment rounded border border-ink/10 flex justify-between items-center gap-2">
                            <div>
                              <span className="font-bold text-xs text-ink block">{item.name} {item.equipped && '✦ (Equipado)'}</span>
                              <span className="text-ink-light text-[10px]">{item.description}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-xs bg-ink/10 px-2 py-0.5 rounded">x{item.quantity}</span>
                              <button
                                onClick={() => {
                                  removeItemFromPlayer(inspectedPlayer.id, item.id);
                                  syncPlayer(inspectedPlayer.id);
                                }}
                                className="p-1 text-magic-red hover:bg-red-950/20 rounded cursor-pointer"
                                title="Eliminar objeto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* DM Add Item Form */}
                    <div className="p-3 bg-parchment rounded border border-ink/20 space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">🎁 Otorgar Objeto al Jugador (DM)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <input 
                          type="text" 
                          placeholder="Nombre del Objeto..."
                          value={dmNewItem.name}
                          onChange={e => setDmNewItem({ ...dmNewItem, name: e.target.value })}
                          className="p-1.5 bg-parchment-dark border border-ink/30 rounded font-bold"
                        />
                        <select 
                          value={dmNewItem.type}
                          onChange={e => setDmNewItem({ ...dmNewItem, type: e.target.value as ItemType })}
                          className="p-1.5 bg-parchment-dark border border-ink/30 rounded font-bold"
                        >
                          <option value="general">General</option>
                          <option value="weapon">Arma</option>
                          <option value="armor">Armadura</option>
                          <option value="consumable">Consumible</option>
                          <option value="quest">Misión</option>
                        </select>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Descripción corta del objeto..."
                        value={dmNewItem.desc}
                        onChange={e => setDmNewItem({ ...dmNewItem, desc: e.target.value })}
                        className="w-full p-1.5 bg-parchment-dark border border-ink/30 rounded text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!dmNewItem.name) return;
                          addItemToPlayer(inspectedPlayer.id, {
                            id: Date.now().toString(),
                            name: dmNewItem.name,
                            type: dmNewItem.type,
                            description: dmNewItem.desc,
                            quantity: dmNewItem.qty
                          });
                          syncPlayer(inspectedPlayer.id);
                          setDmNewItem({ name: "", type: "general", desc: "", qty: 1, damage: "", acBonus: 0, equipped: false });
                        }}
                        className="px-3 py-1.5 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer"
                      >
                        + Otorgar Objeto
                      </button>
                    </div>
                  </div>
                )}

                {inspectTab === "spells" && (
                  <div className="space-y-4">
                    {/* Spell Slots Display */}
                    <div className="p-3 bg-parchment rounded border border-ink/20 space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">✨ Ranuras de Conjuro ({inspectedPlayer.name})</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(inspectedPlayer.spellSlots || {}).map(([lvlStr, slot]) => (
                          <div key={lvlStr} className="p-2 bg-parchment-dark rounded border border-ink/10 text-center">
                            <span className="font-bold text-[10px] uppercase text-ink-light block">Nivel {lvlStr}</span>
                            <span className="text-sm font-bold text-magic-gold">{slot.current} / {slot.max}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prepared Spells List */}
                    <div className="space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">📜 Grimorio y Conjuros Preparados</h4>
                      {inspectedPlayer.spells.length === 0 ? (
                        <p className="text-xs italic text-ink/50">No tiene conjuros registrados.</p>
                      ) : (
                        inspectedPlayer.spells.map(spell => (
                          <div key={spell.id} className="p-2.5 bg-parchment rounded border border-ink/10 flex justify-between items-center gap-2">
                            <div>
                              <span className="font-bold text-xs text-ink block">
                                ✨ {spell.name} <span className="text-[10px] text-magic-gold">({spell.level === 0 ? 'Truco' : `Nivel ${spell.level}`})</span>
                              </span>
                              <span className="text-ink-light text-[10px]">{spell.description}</span>
                            </div>
                            <button
                              onClick={() => {
                                removeSpellToPlayer(inspectedPlayer.id, spell.id);
                                syncPlayer(inspectedPlayer.id);
                              }}
                              className="p-1 text-magic-red hover:bg-red-950/20 rounded cursor-pointer shrink-0"
                              title="Eliminar conjuro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* DM Add Spell Form */}
                    <div className="p-3 bg-parchment rounded border border-ink/20 space-y-2">
                      <h4 className="font-bold font-cinzel text-magic-gold text-xs">📖 Otorgar Conjuro al Jugador (DM)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <input 
                          type="text" 
                          placeholder="Nombre del Conjuro..."
                          value={dmNewSpell.name}
                          onChange={e => setDmNewSpell({ ...dmNewSpell, name: e.target.value })}
                          className="p-1.5 bg-parchment-dark border border-ink/30 rounded font-bold"
                        />
                        <select 
                          value={dmNewSpell.level}
                          onChange={e => setDmNewSpell({ ...dmNewSpell, level: parseInt(e.target.value) || 1 })}
                          className="p-1.5 bg-parchment-dark border border-ink/30 rounded font-bold"
                        >
                          <option value={0}>Truco (Nivel 0)</option>
                          <option value={1}>Nivel 1</option>
                          <option value={2}>Nivel 2</option>
                          <option value={3}>Nivel 3</option>
                          <option value={4}>Nivel 4</option>
                          <option value={5}>Nivel 5</option>
                        </select>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Descripción corta del hechizo..."
                        value={dmNewSpell.desc}
                        onChange={e => setDmNewSpell({ ...dmNewSpell, desc: e.target.value })}
                        className="w-full p-1.5 bg-parchment-dark border border-ink/30 rounded text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!dmNewSpell.name) return;
                          addSpellToPlayer(inspectedPlayer.id, {
                            id: Date.now().toString(),
                            name: dmNewSpell.name,
                            level: dmNewSpell.level,
                            school: dmNewSpell.school,
                            description: dmNewSpell.desc,
                            castingTime: dmNewSpell.castingTime
                          });
                          syncPlayer(inspectedPlayer.id);
                          setDmNewSpell({ name: "", level: 1, school: "Evocación", desc: "", castingTime: "1 Acción" });
                        }}
                        className="px-3 py-1.5 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer"
                      >
                        + Otorgar Conjuro
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-ink/20 flex justify-end">
                <button onClick={() => setInspectedPlayerId(null)} className="px-4 py-2 bg-magic-gold text-black text-xs font-bold rounded cursor-pointer">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMBAT PLAYER SELECTION MODAL (DM ONLY) */}
      <AnimatePresence>
        {combatSelectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-ink">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Swords className="w-6 h-6 text-magic-red" /> Seleccionar Integrantes para Combate
              </h3>

              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                Selecciona los jugadores que participarán en esta rueda de combate. Solo los jugadores seleccionados tirarán iniciativa y entrarán en el orden de turnos.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {players.map(p => {
                  const online = isPlayerOnline(p);
                  const isSelected = selectedCombatPlayerIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCombatPlayerIds(selectedCombatPlayerIds.filter(id => id !== p.id));
                        } else {
                          setSelectedCombatPlayerIds([...selectedCombatPlayerIds, p.id]);
                        }
                      }}
                      className={`p-3 rounded-lg border-2 flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'bg-parchment border-magic-gold text-ink shadow-sm' : 'bg-parchment/40 border-ink/20 opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? <CheckCircle2 className="w-5 h-5 text-magic-gold" /> : <Circle className="w-5 h-5 text-ink/30" />}
                        <div>
                          <span className="font-bold text-sm block">{p.name}</span>
                          <span className="text-[10px] text-ink-light">{p.race} {p.charClass} (Nivel {p.level})</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${online ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {online ? '🟢 En línea' : '🔴 Ausente'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-ink/20 font-bold text-xs sm:text-sm">
                <button 
                  onClick={() => setCombatSelectModal(false)}
                  className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (selectedCombatPlayerIds.length === 0) {
                      showAlert("Debes seleccionar al menos 1 jugador para iniciar el combate.", "Selección Vaciada", "warning");
                      return;
                    }
                    toggleCombatMode(true, roomId, selectedCombatPlayerIds);
                    triggerDiceRoll('d20', 0, 'Iniciativa de Combate');
                    setCombatSelectModal(false);
                  }}
                  className="px-5 py-2 bg-magic-red text-white rounded hover:bg-red-700 transition shadow-[0_0_15px_rgba(217,56,41,0.6)] cursor-pointer font-bold flex items-center gap-2"
                >
                  <Swords className="w-4 h-4" /> Comenzar Combate ({selectedCombatPlayerIds.length})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEVEL UP CONFIRMATION MODAL (DM ONLY) */}
      <AnimatePresence>
        {levelUpConfirm.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 grid place-items-center z-50 p-4 font-sans backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-ink my-auto">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Award className="w-6 h-6 text-magic-gold" /> Confirmar Ascenso de Nivel
              </h3>

              <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
                {levelUpConfirm.type === 'party' 
                  ? '¿Confirmas elevar a toda la Party de Nivel? Se recalcularán automáticamente sus Puntos de Vida Máximos, Bonificadores de Competencia y Espacios de Conjuro.'
                  : `¿Confirmas elevar a ${levelUpConfirm.playerName} al Nivel ${Math.min(20, (levelUpConfirm.currentLevel || 1) + 1)}?`}
              </p>

              <div className="bg-parchment p-3 rounded border border-ink/10 text-xs space-y-1">
                <span className="font-bold text-magic-gold block">Efectos Automáticos D&D 5e:</span>
                <p className="text-ink-light">• Incremento de Nivel y Bonificador de Competencia.</p>
                <p className="text-ink-light">• Incremento automático de Vida Máxima.</p>
                <p className="text-ink-light">• Se notificará a los jugadores en su pantalla.</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-ink/20 font-bold text-xs sm:text-sm">
                <button 
                  onClick={() => setLevelUpConfirm({ open: false, type: 'party' })}
                  className="px-4 py-2 text-ink-light hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (levelUpConfirm.type === 'party') {
                      levelUpParty(roomId);
                    } else if (levelUpConfirm.playerId) {
                      levelUpPlayer(levelUpConfirm.playerId, roomId);
                    }
                    setLevelUpConfirm({ open: false, type: 'party' });
                  }}
                  className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow cursor-pointer font-bold"
                >
                  Confirmar Ascenso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL LOG HISTORY MODAL (SCREEN-WIDE AUDIT FOR DM) */}
      <AnimatePresence>
        {fullLogModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
            <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col text-ink space-y-4">
              <div className="flex justify-between items-center border-b border-ink/20 pb-3">
                <div>
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <ScrollText className="w-6 h-6 text-magic-red" /> Historial Completo de la Partida ({logs.length} registros)
                  </h3>
                  <p className="text-xs text-ink-light mt-0.5">Consulta cronológica de todos los acontecimientos de la partida.</p>
                </div>
                <button onClick={() => setFullLogModalOpen(false)} className="p-2 text-ink-light hover:text-ink cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-parchment p-3 rounded-xl border border-ink/20 text-xs">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={logSearchText}
                    onChange={e => setLogSearchText(e.target.value)}
                    placeholder="Buscar por jugador o palabra clave..."
                    className="w-full p-2 pl-8 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold"
                  />
                  <Search className="w-4 h-4 text-ink-light absolute left-2.5 top-2.5" />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                  {(['all', 'combat', 'currency', 'rests', 'features', 'rolls', 'settings'] as const).map(catKey => {
                    const labels: Record<string, string> = {
                      all: 'Todos',
                      combat: '⚔️ Combate',
                      currency: '💰 Economía',
                      rests: '⛺ Descansos',
                      features: '📜 Conjuros/Rasgos',
                      rolls: '🎲 Tiradas',
                      settings: '⚙️ DM'
                    };
                    return (
                      <button
                        key={catKey}
                        onClick={() => setLogCategoryFilter(catKey)}
                        className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${logCategoryFilter === catKey ? 'bg-magic-gold text-black shadow' : 'bg-parchment-dark text-ink hover:bg-ink/10'}`}
                      >
                        {labels[catKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Log Cards */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
                {logs
                  .filter(log => {
                    const cat = getLogCategory(log.message);
                    const matchesCat = logCategoryFilter === 'all' || cat.type === logCategoryFilter;
                    const matchesSearch = !logSearchText.trim() || log.message.toLowerCase().includes(logSearchText.toLowerCase());
                    return matchesCat && matchesSearch;
                  })
                  .map(log => {
                    const categoryInfo = getLogCategory(log.message);
                    return (
                      <div key={log.id} className="p-3.5 bg-parchment rounded-xl border border-ink/20 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-magic-gold/60 transition">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded border shrink-0 ${categoryInfo.badgeClass}`}>
                            {categoryInfo.icon} {categoryInfo.label}
                          </span>
                          <span className="font-bold text-sm text-ink leading-relaxed break-words">{log.message}</span>
                        </div>
                        <span className="text-xs text-ink/60 font-mono shrink-0">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL DM INBOX MODAL (EXPANDED VIEW & PLAYER FILTER) */}
      <AnimatePresence>
        {fullInboxModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
            <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col text-ink space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-ink/20 pb-3">
                <div>
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-magic-gold" /> Buzón del DM ({effectiveDirectMessages.length} mensajes)
                  </h3>
                  <p className="text-xs text-ink-light mt-0.5">Consulta y gestiona todos los mensajes directos, notas secretas y trasfondos enviados por tus jugadores.</p>
                </div>
                <button onClick={() => setFullInboxModalOpen(false)} className="p-2 text-ink-light hover:text-ink cursor-pointer" title="Cerrar buzón">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-parchment p-3.5 rounded-xl border border-ink/20 text-xs">
                {/* Player Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                  <span className="font-bold text-ink whitespace-nowrap flex items-center gap-1">
                    <Filter className="w-4 h-4 text-magic-gold" /> Filtrar por Jugador:
                  </span>
                  <select
                    value={inboxPlayerFilter}
                    onChange={e => setInboxPlayerFilter(e.target.value)}
                    className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold cursor-pointer"
                  >
                    <option value="all">👥 Todos los Jugadores ({effectiveDirectMessages.length})</option>
                    {allPlayerOptions.map(name => {
                      const count = effectiveDirectMessages.filter(m => (m.characterName || m.senderName) === name).length;
                      return (
                        <option key={name} value={name}>
                          ⚔️ {name} ({count} msgs)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Text Search Input */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={inboxSearchText}
                    onChange={e => setInboxSearchText(e.target.value)}
                    placeholder="Buscar contenido de mensaje..."
                    className="w-full p-2 pl-8 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold"
                  />
                  <Search className="w-4 h-4 text-ink-light absolute left-2.5 top-2.5" />
                </div>

                {/* Reset Filters Button */}
                {(inboxPlayerFilter !== 'all' || inboxSearchText !== '') && (
                  <button
                    onClick={() => {
                      setInboxPlayerFilter('all');
                      setInboxSearchText('');
                    }}
                    className="px-3 py-1.5 bg-red-950/20 text-red-600 border border-red-500/40 rounded font-bold hover:bg-magic-red hover:text-white transition cursor-pointer whitespace-nowrap"
                  >
                    Restablecer
                  </button>
                )}
              </div>

              {/* Scrollable Message Cards */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {filteredInboxMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                    <Mail className="w-12 h-12 text-ink/20" />
                    <p className="text-sm font-bold text-ink-light">No hay mensajes en el buzón que coincidan con el filtro.</p>
                    <p className="text-xs text-ink/50">Prueba seleccionando otro jugador o borrando el texto de búsqueda.</p>
                  </div>
                ) : (
                  filteredInboxMessages.map(msg => (
                    <div key={msg.id} className="p-4 bg-parchment rounded-xl border border-ink/20 shadow-md space-y-2 hover:border-magic-gold transition">
                      <div className="flex justify-between items-center border-b border-ink/15 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-magic-gold px-2.5 py-0.5 rounded bg-magic-gold/10 border border-magic-gold/30 flex items-center gap-1.5">
                            ⚔️ {msg.characterName || msg.senderName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ink/60 font-mono">
                          <span>
                            📅 {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleDeleteDirectMessage(msg.id)}
                            className="px-2 py-1 bg-red-950/20 text-red-600 rounded border border-red-500/30 hover:bg-magic-red hover:text-white transition cursor-pointer flex items-center gap-1 font-sans text-xs font-bold"
                            title="Eliminar este mensaje"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans bg-parchment-dark/50 p-3 rounded-lg border border-ink/10">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TUTORIAL MODAL */}
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* Floating DM Inbox Button (Positioned next to DiceRoller to prevent overlap) */}
      <div className="fixed bottom-6 right-20 sm:right-24 z-40">
        <button
          onClick={() => setFullInboxModalOpen(true)}
          className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 via-gold-500 to-yellow-500 text-black px-4 py-3 rounded-full shadow-[0_0_20px_rgba(245,208,97,0.7)] hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white font-sans font-bold text-sm"
          title="Abrir Buzón del DM"
        >
          <Mail className="w-5 h-5 text-black" />
          <span className="hidden sm:inline">Buzón DM</span>
          {effectiveDirectMessages.length > 0 && (
            <span className="bg-magic-red text-white text-xs font-extrabold px-2 py-0.5 rounded-full shadow border border-white animate-bounce">
              {effectiveDirectMessages.length}
            </span>
          )}
        </button>
      </div>

    </main>
  );
}
