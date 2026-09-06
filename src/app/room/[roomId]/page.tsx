"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useStore, CharacterState } from "@/store/useStore";
import { CLASS_SAVING_THROWS, CLASS_HIT_DIE, calculateMaxHP } from "@/lib/dndClassFeatures";
import { 
  subscribeRoom, subscribeRoomPlayers, subscribeRoomLogs, savePlayerInRoom, updateRoomState, addRoomLog, Room 
} from "@/lib/rooms";
import CharacterSheetPage from "@/app/sheet/page";
import DMPage from "@/app/dm/page";
import DiceRoller from "@/components/DiceRoller";
import CelestialLevelUpModal from "@/components/CelestialLevelUpModal";
import { Swords, Shield, Heart, Users, ScrollText, Eye, ArrowLeft, LogOut, Sparkles, Plus, CheckCircle, Skull, UserCheck, Clock } from "lucide-react";

const RACES = ["Humano", "Elfo", "Enano", "Mediano", "Dracónido", "Tieflling", "Gnomo", "Semielfo", "Semiorco"];
const CLASSES = ["Guerrero", "Mago", "Pícaro", "Clérigo", "Bardo", "Bárbaro", "Paladín", "Explorador", "Brujo", "Hechicero", "Monje"];

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user, isGuest, isLoggedIn, signInAsGuest } = useAuth();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomTab, setRoomTab] = useState<"sheet" | "party" | "dm">("sheet");

  const { players, activePlayerId, setActivePlayerId, createCharacter, isCombatMode, initiativeOrder, currentTurnIndex } = useStore();

  // Character Creator Modal State
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCharForm, setNewCharForm] = useState({
    name: "",
    race: "Humano",
    charClass: "Guerrero",
    background: "Soldado",
    level: 1
  });

  const isDM = Boolean(user && room && user.uid === room.dmId);
  const lastRemoteSnapshot = useRef<string>("");
  const wasKickedRef = useRef<boolean>(false);
  const sessionJoinedAt = useRef<number>(Date.now());
  const [turnToast, setTurnToast] = useState<boolean>(false);

  const { lastTurnEvent } = useStore();

  useEffect(() => {
    if (lastTurnEvent) {
      setTurnToast(true);
      const timer = setTimeout(() => setTurnToast(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [lastTurnEvent]);

  // Ensure user is authenticated
  useEffect(() => {
    if (!user) {
      signInAsGuest();
    }
  }, [user]);

  // Subscribe to Room Data
  useEffect(() => {
    if (!roomId) return;
    const unsubRoom = subscribeRoom(roomId, (data) => {
      setRoom(data);
      setLoadingRoom(false);
      
      if (data) {
        useStore.setState({
          isCombatMode: data.isCombatMode,
          initiativeOrder: data.initiativeOrder || [],
          currentTurnIndex: data.currentTurnIndex || 0,
          lastLevelUpEvent: data.lastLevelUpEvent || null,
          hpTerminology: data.hpTerminology || 'HP'
        });
      }
    });

    const unsubPlayers = subscribeRoomPlayers(roomId, (roomPlayers) => {
      lastRemoteSnapshot.current = JSON.stringify(roomPlayers);

      // Check if current user was kicked
      if (user && activePlayerId && !isDM && !wasKickedRef.current) {
        const myRemoteChar = roomPlayers.find(p => p.id === activePlayerId);
        if (myRemoteChar && (myRemoteChar as any).kicked === true) {
          const isJustJoined = (Date.now() - sessionJoinedAt.current) < 5000;
          if (isJustJoined) {
            // Player just re-entered the room! Reset kicked flag in Firestore
            const myLocalChar = useStore.getState().players.find(p => p.id === activePlayerId);
            if (myLocalChar) {
              const resetChar = { ...myLocalChar, isOnline: true };
              delete (resetChar as any).kicked;
              savePlayerInRoom(roomId, resetChar, true);
            }
          } else {
            wasKickedRef.current = true;
            alert("⚡ El DM te ha retirado de la campaña.");
            router.push('/');
            return;
          }
        }
      }

      // Filter out kicked flags from room players for rendering
      const activeRoomPlayers = roomPlayers.filter(p => !(p as any).kicked);

      // Preserve user's local owned characters so they are NEVER permanently lost
      const currentPlayers = useStore.getState().players;
      const myOwnedLocalChars = currentPlayers.filter(p => user && p.ownerId === user.uid);
      
      const combined = [...activeRoomPlayers];
      myOwnedLocalChars.forEach(localChar => {
        if (!combined.some(p => p.id === localChar.id)) {
          combined.push(localChar);
        }
      });

      useStore.setState({ players: combined });
    });

    const unsubLogs = subscribeRoomLogs(roomId, (roomLogs) => {
      useStore.setState({ logs: roomLogs });
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubLogs();
    };
  }, [roomId, user, activePlayerId, isDM, router]);

  // Auto-land DM on DM Panel without character prompts
  useEffect(() => {
    if (isDM) {
      setRoomTab("dm");
      setShowSelectModal(false);
    }
  }, [isDM]);

  // Non-DM Player character selection logic (Scoped strictly to user.uid)
  useEffect(() => {
    if (isDM || !room || !user) return;
    
    const userOwnedPlayers = players.filter(p => p.ownerId === user.uid || (!p.ownerId && p.id === activePlayerId));
    const activeChar = userOwnedPlayers.find(p => p.id === activePlayerId);

    if (!activeChar) {
      const livingMyChar = userOwnedPlayers.find(p => !p.isDead) || userOwnedPlayers[0];
      if (livingMyChar) {
        setActivePlayerId(livingMyChar.id);
      } else {
        setActivePlayerId("");
      }
    }
  }, [players, activePlayerId, isDM, room, user]);

  // Auto-sync active character to Firestore ONLY when mutated locally
  useEffect(() => {
    if (!roomId || !activePlayerId || isDM) return;
    const activeChar = players.find(p => p.id === activePlayerId);
    if (!activeChar) return;

    const currentJSON = JSON.stringify(activeChar);
    if (lastRemoteSnapshot.current && !lastRemoteSnapshot.current.includes(currentJSON)) {
      const isCriticalState = Boolean(activeChar.isDead || activeChar.isStable || !activeChar.isDying);
      savePlayerInRoom(roomId, activeChar, isCriticalState);
    }
  }, [players, activePlayerId, roomId, isDM]);

  // Heartbeat & Presence tracking for active character in room
  useEffect(() => {
    if (!roomId || !activePlayerId || isDM) return;

    const updatePresence = (onlineStatus: boolean) => {
      const activeChar = useStore.getState().players.find(p => p.id === activePlayerId);
      if (activeChar) {
        savePlayerInRoom(roomId, { ...activeChar, isOnline: onlineStatus, lastSeen: Date.now() }, true);
      }
    };

    updatePresence(true);
    const interval = setInterval(() => updatePresence(true), 15000);

    const handleBeforeUnload = () => updatePresence(false);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence(false);
    };
  }, [roomId, activePlayerId, isDM]);

  const handleExitRoom = () => {
    if (roomId && activePlayerId && !isDM) {
      const activeChar = players.find(p => p.id === activePlayerId);
      if (activeChar) {
        savePlayerInRoom(roomId, { ...activeChar, isOnline: false, lastSeen: Date.now() }, true);
      }
    }
    router.push('/');
  };

  const handleCreateHeroInRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharForm.name) return;
    const ownerId = user?.uid;
    const ownerName = user?.displayName || user?.email || (isGuest ? 'Invitado' : 'Jugador');
    const newId = createCharacter(
      newCharForm.name, 
      newCharForm.race, 
      newCharForm.charClass, 
      newCharForm.background, 
      newCharForm.level,
      undefined,
      ownerId,
      ownerName
    );
    if (!newId) return;
    
    // Save to Firestore room
    const createdChar = useStore.getState().players.find(p => p.id === newId);
    if (createdChar && roomId) {
      await savePlayerInRoom(roomId, createdChar);
    }
    
    setShowCreateModal(false);
    setShowSelectModal(false);
  };

  if (loadingRoom) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center font-sans space-y-4">
          <Sparkles className="w-12 h-12 text-magic-gold animate-spin mx-auto" />
          <h2 className="text-2xl font-bold font-cinzel text-magic-gold">Ingresando a la Campaña...</h2>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center font-sans space-y-4 bg-parchment-dark p-8 rounded-xl border border-magic-red">
          <h2 className="text-3xl font-bold font-cinzel text-magic-red">Campaña No Encontrada</h2>
          <p className="text-ink-light">La campaña especificada no existe o fue eliminada por el DM.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition"
          >
            Volver al Inicio
          </button>
        </div>
      </main>
    );
  }

  const activeChar = players.find(p => p.id === activePlayerId);

  return (
    <main className="min-h-screen relative flex flex-col font-sans">
      
      {/* Floating Turn Toast Banner for Players */}
      <AnimatePresence>
        {turnToast && isCombatMode && initiativeOrder.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.8 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.9 }} 
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 md:px-6 py-2.5 rounded-full shadow-2xl font-sans font-bold flex items-center gap-2 text-xs md:text-sm border-2 w-[90%] md:w-auto text-center justify-center
              ${initiativeOrder[currentTurnIndex] === activePlayerId 
                ? 'bg-magic-gold text-black border-white shadow-[0_0_30px_rgba(245,208,97,0.9)] animate-pulse' 
                : 'bg-slate-900 text-amber-300 border-amber-400/60 shadow-[0_0_20px_rgba(0,0,0,0.8)]'}`}
          >
            <Clock className="w-5 h-5 animate-spin shrink-0 text-magic-gold" />
            <span>
              {initiativeOrder[currentTurnIndex] === activePlayerId 
                ? '⚔️ ¡ES TU TURNO DE ACTUAR!' 
                : `🗡️ Siguiente Turno: ${players.find(p => p.id === initiativeOrder[currentTurnIndex])?.name || 'Jugador'}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROOM TOP HEADER BAR */}
      <header className="w-full bg-parchment-dark/95 border-b-2 border-magic-gold p-3 sm:p-4 flex justify-between items-center backdrop-blur-md z-30 font-sans text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExitRoom}
            className="flex items-center gap-1 text-ink-light hover:text-ink font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Inicio
          </button>
          
          <div className="h-4 w-px bg-ink/20 hidden sm:block"></div>
          
          <div>
            <h1 className="font-cinzel font-bold text-base sm:text-lg text-magic-gold flex items-center gap-2">
              {room.name}
            </h1>
            <p className="text-[10px] sm:text-xs text-ink-light">Creado por DM: <span className="text-ink font-bold">{room.dmName}</span></p>
          </div>
        </div>

        {/* Room Navigation & Character Selector Button */}
        <div className="flex items-center gap-2">
          {/* Active Logged-in User Session Pill */}
          <div className="hidden md:flex items-center gap-1.5 bg-ink/5 px-2.5 py-1 rounded text-xs font-bold text-ink border border-ink/15">
            <span className="text-ink-light font-medium">Sesión:</span>
            <span className="text-magic-gold font-bold">{user?.displayName || user?.email || (isGuest ? 'Invitado' : 'Jugador')}</span>
          </div>

          {activeChar && (
            <button
              onClick={() => setShowSelectModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-parchment border border-ink/30 px-3 py-1.5 rounded font-bold text-xs hover:border-magic-gold cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-magic-gold" /> {activeChar.name}
            </button>
          )}

          {/* Room Navigation Tabs */}
          <div className="flex items-center gap-2 bg-parchment p-1 rounded-lg border border-ink/20">
            {!isDM && (
              <button 
                onClick={() => setRoomTab("sheet")}
                className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${roomTab === 'sheet' ? 'bg-magic-gold text-black' : 'text-ink hover:bg-ink/10'}`}
              >
                Mi Hoja
              </button>
            )}
            
            <button 
              onClick={() => setRoomTab("party")}
              className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${roomTab === 'party' ? 'bg-magic-gold text-black' : 'text-ink hover:bg-ink/10'}`}
            >
              Party ({players.length})
            </button>

            {isDM && (
              <button 
                onClick={() => setRoomTab("dm")}
                className={`px-3 py-1.5 rounded font-bold transition cursor-pointer flex items-center gap-1 ${roomTab === 'dm' ? 'bg-magic-red text-white shadow' : 'text-magic-red border border-magic-red/30 hover:bg-magic-red/10'}`}
              >
                <Swords className="w-3.5 h-3.5" /> DM Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mount DiceRoller & Celestial Level Up System */}
      <DiceRoller />
      <CelestialLevelUpModal isDM={isDM} />

      {/* ROOM TAB CONTENT */}
      <div className="flex-1">
        {roomTab === "sheet" && (
          players.length === 0 || !activeChar || (activeChar.ownerId && user && activeChar.ownerId !== user.uid && !isDM) ? (
            <div className="flex items-center justify-center min-h-[70vh] p-6 text-center">
              <div className="bg-parchment-dark p-8 rounded-xl border-2 border-magic-gold shadow-2xl max-w-md w-full space-y-4">
                <Sparkles className="w-12 h-12 text-magic-gold mx-auto" />
                <h3 className="text-2xl font-bold font-cinzel text-magic-gold">Bienvenido a {room.name}</h3>
                <p className="text-xs text-ink-light">Crea o selecciona un aventurero para unirte a esta campaña.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-3 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-sm cursor-pointer"
                >
                  + Crear Nuevo Héroe
                </button>
              </div>
            </div>
          ) : (
            <CharacterSheetPage />
          )
        )}
        
        {roomTab === "dm" && isDM && <DMPage roomId={roomId} />}

        {roomTab === "party" && (
          <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 font-sans">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-3xl font-bold font-cinzel text-magic-gold flex items-center gap-3">
                <Users className="w-8 h-8" /> Integrantes de {room.name}
              </h2>
              <span className="text-xs font-bold text-ink-light bg-parchment px-3 py-1.5 rounded border border-ink/20">
                🟢 {players.filter(p => p.isOnline !== false && (!p.lastSeen || (Date.now() - p.lastSeen) < 45000)).length} en línea / {players.length} totales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {players.map(p => {
                const online = p.isOnline !== false && (!p.lastSeen || (Date.now() - p.lastSeen) < 45000);
                return (
                  <div key={p.id} className={`p-6 rounded-xl border-2 shadow-xl space-y-4 ${p.isDead ? 'bg-black/80 border-magic-red text-white' : 'bg-parchment-dark border-magic-gold/40'} ${!online ? 'opacity-70' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                          {p.name}
                          {online ? (
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">🟢 En línea</span>
                          ) : (
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">🔴 Ausente</span>
                          )}
                        </h3>
                        <p className="text-xs text-ink-light">{p.race} {p.charClass} (Lvl {p.level})</p>
                        <span className="text-[10px] bg-ink/10 text-ink px-2 py-0.5 rounded font-bold inline-block mt-1">
                          Jugador: {p.ownerName || (p.ownerId ? 'Registrado' : 'Sin asignar')} {p.ownerId === user?.uid ? '✦ (Tuyo)' : ''}
                        </span>
                      </div>
                      {p.isDead ? (
                        <span className="text-xs bg-magic-red text-white font-bold px-2.5 py-1 rounded">☠️ Fallecido</span>
                      ) : (
                        p.initiative && (
                          <span className="text-xs bg-magic-gold/20 text-magic-gold font-bold px-2 py-1 rounded">
                            Iniciativa: {p.initiative.total}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex justify-around bg-parchment p-3 rounded text-center border border-ink/10 text-ink">
                      <div>
                        <Heart className="w-6 h-6 text-magic-red mx-auto mb-1" />
                        <span className="font-bold text-lg">{p.hp.current}/{p.hp.max}</span>
                      </div>
                      <div>
                        <Shield className="w-6 h-6 text-ink mx-auto mb-1" />
                        <span className="font-bold text-lg">{p.ac}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CHARACTER SELECTOR MODAL */}
      <AnimatePresence>
        {showSelectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Users className="w-6 h-6" /> Seleccionar Aventurero
              </h3>
              <p className="text-xs text-ink-light">Elige tu personaje activo para esta campaña o crea uno nuevo.</p>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {(user ? players.filter(p => p.ownerId === user.uid || (!p.ownerId && p.id === activePlayerId)) : []).map(p => (
                  <div 
                    key={p.id} 
                    className={`p-3.5 rounded border-2 flex justify-between items-center transition ${p.isDead ? 'bg-black/60 border-red-900 opacity-60' : (p.id === activePlayerId ? 'bg-parchment border-magic-gold' : 'bg-parchment/50 border-ink/20')}`}
                  >
                    <div>
                      <h4 className="font-bold text-base text-ink flex items-center gap-2">
                        {p.name} {p.isDead && <span className="text-xs text-magic-red font-bold">☠️ (Fallecido)</span>}
                      </h4>
                      <p className="text-xs text-ink-light">{p.race} {p.charClass} (Nivel {p.level})</p>
                    </div>

                    <button
                      disabled={p.isDead}
                      onClick={() => {
                        const updatedChar = { 
                          ...p, 
                          ownerId: user?.uid || p.ownerId, 
                          ownerName: user?.displayName || user?.email || p.ownerName || 'Jugador',
                          isOnline: true,
                          lastSeen: Date.now()
                        };
                        delete (updatedChar as any).kicked;
                        useStore.getState().updateActiveCharacter(updatedChar);
                        if (roomId) savePlayerInRoom(roomId, updatedChar, true);
                        setActivePlayerId(p.id);
                        setShowSelectModal(false);
                      }}
                      className={`px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition ${p.isDead ? 'bg-red-950 text-red-500 cursor-not-allowed' : (p.id === activePlayerId ? 'bg-magic-gold text-black' : 'bg-ink text-parchment-dark hover:bg-magic-gold hover:text-black')}`}
                    >
                      {p.isDead ? 'Fallecido' : (p.id === activePlayerId ? 'Seleccionado' : 'Elegir')}
                    </button>
                  </div>
                ))}
                {(user ? players.filter(p => p.ownerId === user.uid || (!p.ownerId && p.id === activePlayerId)) : []).length === 0 && (
                  <p className="text-xs italic text-ink-light text-center py-4">No tienes ningún aventurero creado en esta campaña. ¡Crea el tuyo para comenzar!</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-ink/20">
                <button onClick={() => setShowSelectModal(false)} className="px-4 py-2 text-ink-light hover:text-ink text-xs font-bold">Cerrar</button>
                <button 
                  onClick={() => {
                    setShowSelectModal(false);
                    setShowCreateModal(true);
                  }}
                  className="px-5 py-2 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition text-xs shadow"
                >
                  + Crear Nuevo Personaje
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INLINE CHARACTER CREATOR MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold font-cinzel text-magic-red flex items-center gap-2">
                <Sparkles className="w-6 h-6" /> Crear Nuevo Aventurero (D&D 5e)
              </h3>

              <form onSubmit={handleCreateHeroInRoom} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1">Nombre del Personaje</label>
                  <input 
                    type="text" 
                    required 
                    value={newCharForm.name}
                    onChange={e => setNewCharForm({...newCharForm, name: e.target.value})}
                    placeholder="Ej. Valeros"
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Raza</label>
                    <select value={newCharForm.race} onChange={e => setNewCharForm({...newCharForm, race: e.target.value})} className="w-full p-2 bg-parchment border border-ink/30 text-ink rounded">
                      {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Clase Principal</label>
                    <select value={newCharForm.charClass} onChange={e => setNewCharForm({...newCharForm, charClass: e.target.value})} className="w-full p-2 bg-parchment border border-ink/30 text-ink rounded">
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Trasfondo</label>
                    <input type="text" value={newCharForm.background} onChange={e => setNewCharForm({...newCharForm, background: e.target.value})} className="w-full p-2 bg-parchment border border-ink/30 text-ink rounded" placeholder="Soldado, Noble..." />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Nivel (1 - 20)</label>
                    <input type="number" min={1} max={20} value={newCharForm.level} onChange={e => setNewCharForm({...newCharForm, level: parseInt(e.target.value)||1})} className="w-full p-2 bg-parchment border border-ink/30 text-ink rounded font-bold" />
                  </div>
                </div>

                <div className="bg-parchment p-3 rounded border border-ink/10 text-xs space-y-1">
                  <span className="font-bold text-magic-gold block">Cálculo Automático D&D 5e:</span>
                  <p className="text-ink-light">HP Inicial: <strong className="text-ink">{calculateMaxHP(newCharForm.charClass, newCharForm.level, 14)} HP</strong> (Dado d{CLASS_HIT_DIE[newCharForm.charClass]||8})</p>
                  <p className="text-ink-light">Salvaguardias Oficiales: <strong className="text-ink uppercase">{CLASS_SAVING_THROWS[newCharForm.charClass]?.join(', ')}</strong></p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-ink/20 font-bold">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-ink-light hover:text-ink">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition shadow">Guardar e Ingresar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
