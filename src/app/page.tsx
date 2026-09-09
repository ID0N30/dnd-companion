"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/store/useStore";
import { subscribePublicRooms, createRoom, verifyRoomPassword, Room } from "@/lib/rooms";
import AuthModal from "@/components/AuthModal";
import { 
  Book, Shield, Swords, LogIn, LogOut, Plus, Lock, Globe, Users, Key, AlertCircle, Sparkles, UserCheck, Search, Edit3
} from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { user, isLoggedIn, isGuest, isFirebaseReady, signInGoogle, signInAsGuest, updateUserDisplayName, logout } = useAuth();
  const showAlert = useStore((state) => state.showAlert);
  
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joinModalRoom, setJoinModalRoom] = useState<Room | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Search & Edit Name States
  const [searchQuery, setSearchQuery] = useState("");
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // New Room Form
  const [roomForm, setRoomForm] = useState({
    name: "",
    isPublic: true,
    password: "",
    allowGuests: true,
  });

  // Subscribe to realtime public rooms
  useEffect(() => {
    const unsub = subscribePublicRooms((rooms) => {
      setPublicRooms(rooms);
    });
    return () => unsub();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      showAlert("Debes iniciar sesión con Google para crear una sala y ser DM.", "Acceso Requerido", "warning");
      return;
    }
    if (!roomForm.name) return;

    try {
      const roomId = await createRoom({
        name: roomForm.name,
        isPublic: roomForm.isPublic,
        password: roomForm.password,
        allowGuests: roomForm.allowGuests,
        dmId: user.uid,
        dmName: user.displayName || user.email || "Dungeon Master"
      });
      setCreateModalOpen(false);
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      showAlert("Error al crear la sala: " + err.message, "Error al Crear Sala", "danger");
    }
  };

  const handleJoinRoom = async (room: Room) => {
    // Check if guest is trying to join a room that forbids guests
    if (isGuest && !room.allowGuests) {
      showAlert("Esta sala requiere que inicies sesión con Google para entrar.", "Cuenta Requerida", "warning");
      return;
    }

    // Check if room requires password
    if (room.hasPassword) {
      setJoinModalRoom(room);
      setEnteredPassword("");
      setPasswordError("");
    } else {
      // Direct join if no password
      if (!user) {
        await signInAsGuest();
      }
      router.push(`/room/${room.id}`);
    }
  };

  const submitJoinPassword = async () => {
    if (!joinModalRoom) return;
    const isValid = await verifyRoomPassword(joinModalRoom.id, enteredPassword);
    if (isValid) {
      if (!user) {
        await signInAsGuest();
      }
      const roomId = joinModalRoom.id;
      setJoinModalRoom(null);
      router.push(`/room/${roomId}`);
    } else {
      setPasswordError("Contraseña incorrecta.");
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 relative flex flex-col items-center">
      
      {/* AUTH TOP BAR */}
      <header className="w-full max-w-6xl flex justify-between items-center bg-parchment-dark/80 p-3 sm:p-4 rounded-xl border border-magic-gold/40 mb-8 backdrop-blur-sm font-sans text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-magic-gold" />
          <span className="font-cinzel font-bold text-base text-ink">D&D Companion</span>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-ink font-bold hidden sm:inline flex items-center gap-1.5 bg-ink/5 px-3 py-1.5 rounded border border-ink/10">
                <UserCheck className="w-4 h-4 text-magic-gold" /> {user?.displayName || user?.email}
              </span>
              <button
                onClick={() => { setNameInput(user?.displayName || ''); setNameModalOpen(true); }}
                className="flex items-center gap-1 bg-parchment text-ink hover:text-magic-gold p-1.5 rounded border border-ink/20 transition text-xs font-bold cursor-pointer"
                title="Editar Nombre de Cuenta"
              >
                <Edit3 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Editar Nombre</span>
              </button>
              <button 
                onClick={logout}
                className="flex items-center gap-1.5 bg-ink/10 text-ink hover:text-magic-red p-2 rounded transition font-bold cursor-pointer text-xs"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-3">
              <span className="text-ink-light italic">Modo Invitado</span>
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 bg-magic-gold text-black px-3 py-1.5 rounded font-bold hover:bg-yellow-500 transition shadow cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Iniciar Sesión / Registrarse
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-magic-gold text-black px-4 py-2 rounded font-bold hover:bg-yellow-500 transition shadow cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Iniciar Sesión / Registrarse
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center max-w-3xl w-full mb-12"
      >
        <h1 className="text-4xl sm:text-6xl md:text-7xl text-magic-red font-bold mb-4 drop-shadow-md font-cinzel">
          Dungeon & Dragons
        </h1>
        <p className="text-lg sm:text-2xl text-ink-light mb-6 italic">
          El grimorio ancestral y sincronizado en tiempo real para tu mesa de D&D
        </p>
        <p className="text-xs sm:text-sm text-ink/80 max-w-xl mx-auto font-sans leading-relaxed">
          Diseñado para complementar tus partidas por Discord o presenciales. Puedes jugar como invitado sin necesidad de registrarte o iniciar sesión con Google para crear tus propias salas y actuar como Dungeon Master.
        </p>
      </motion.div>

      {/* ACTION & ROOMS CONTAINER */}
      <div className="w-full max-w-5xl space-y-8 font-sans">
        
        {/* ROOM CREATION & QUICK ACCESS HEADER */}
        <div className="bg-parchment-dark/70 p-4 sm:p-6 rounded-xl border border-ink/20 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Globe className="w-7 h-7 text-magic-gold" /> Campañas de Juego Disponibles
              </h2>
              <p className="text-xs text-ink-light">Únete a una campaña activa o crea una nueva mesa para tu grupo.</p>
            </div>

            <button
              onClick={() => {
                if (!isLoggedIn) {
                  showAlert("Debes iniciar sesión con Google para crear una campaña y ser DM.", "Acceso Requerido", "warning");
                  signInGoogle();
                } else {
                  setCreateModalOpen(true);
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-magic-gold text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-500 transition shadow-md text-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Crear Nueva Campaña (DM)
            </button>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-ink-light absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar campaña por nombre o Dungeon Master..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-parchment border border-ink/30 text-ink rounded-lg font-sans text-xs font-bold focus:border-magic-gold focus:outline-none shadow-inner"
            />
          </div>
        </div>

        {/* PUBLIC ROOMS LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Demo / Off-line Test Room (Always Available) */}
          <div className="bg-parchment-dark p-6 rounded-xl border-2 border-magic-gold shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-magic-gold text-black text-[9px] font-bold px-3 py-1 rounded-bl uppercase font-sans">
              ✦ DEMO & TUTORIAL
            </div>
            <div>
              <div className="flex justify-between items-start mb-2 pt-1">
                <h3 className="text-xl font-bold text-magic-gold font-cinzel">Mesa de Prueba (Demo)</h3>
              </div>
              <p className="text-xs text-ink-light mb-3 leading-relaxed">
                Experimenta con el héroe legendario <strong>Drizzt Do'Urden</strong> (Elfo Oscuro Nivel 5), prueba el Panel Maestro (DM) libre y consulta el <strong>Tutorial Inicial Guiado</strong>.
              </p>
              <div className="flex gap-1.5 flex-wrap text-[10px]">
                <span className="bg-ink/10 text-ink px-2 py-0.5 rounded font-bold">⭐ Drizzt Do'Urden</span>
                <span className="bg-ink/10 text-ink px-2 py-0.5 rounded font-bold">🛡️ Panel DM Libre</span>
                <span className="bg-ink/10 text-ink px-2 py-0.5 rounded font-bold">📖 Tutorial Guiado</span>
              </div>
            </div>
            <Link 
              href="/sheet?demo=true" 
              className="w-full text-center py-2.5 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition text-sm block shadow cursor-pointer"
            >
              Entrar a Mesa de Prueba
            </Link>
          </div>

          {/* Realtime Rooms from Firestore */}
          {publicRooms
            .filter(room => room.name.toLowerCase().includes(searchQuery.toLowerCase()) || room.dmName.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(room => (
            <div key={room.id} className="bg-parchment-dark p-6 rounded-xl border-2 border-ink/20 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-ink font-cinzel truncate">{room.name}</h3>
                  {room.hasPassword ? (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Privada
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase">Pública</span>
                  )}
                </div>

                <p className="text-xs text-ink-light mb-3">DM: <span className="text-ink font-bold">{room.dmName}</span></p>

                <div className="flex gap-2 flex-wrap text-[10px]">
                  <span className={`px-2 py-0.5 rounded border ${room.allowGuests ? 'bg-ink/10 text-ink' : 'bg-magic-red/10 text-magic-red border-magic-red/30'}`}>
                    {room.allowGuests ? 'Permite Invitados' : 'Requiere Login'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleJoinRoom(room)}
                className="w-full py-2.5 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition text-sm cursor-pointer shadow"
              >
                {room.hasPassword ? 'Ingresar Contraseña' : 'Unirse a la Sala'}
              </button>
            </div>
          ))}

        </div>

      </div>

      {/* CREATE ROOM MODAL (DM ONLY) */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-lg w-full shadow-2xl font-sans space-y-4">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Swords className="w-6 h-6" /> Crear Nueva Sala de Juego
              </h3>

              <form onSubmit={handleCreateRoom} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold mb-1">Nombre de la Sala</label>
                  <input 
                    type="text" 
                    required 
                    value={roomForm.name}
                    onChange={e => setRoomForm({...roomForm, name: e.target.value})}
                    placeholder="Ej. La Cripta del Dragón"
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPublic"
                    checked={roomForm.isPublic}
                    onChange={e => setRoomForm({...roomForm, isPublic: e.target.checked})}
                    className="w-4 h-4 accent-magic-gold cursor-pointer"
                  />
                  <label htmlFor="isPublic" className="font-bold cursor-pointer">Mostrar en la lista pública de salas</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="allowGuests"
                    checked={roomForm.allowGuests}
                    onChange={e => setRoomForm({...roomForm, allowGuests: e.target.checked})}
                    className="w-4 h-4 accent-magic-gold cursor-pointer"
                  />
                  <label htmlFor="allowGuests" className="font-bold cursor-pointer">Permitir que ingresen jugadores invitados (sin registrarse)</label>
                </div>

                <div>
                  <label className="block font-bold mb-1">Contraseña de Acceso (Opcional)</label>
                  <input 
                    type="password" 
                    name="room_creation_pass_code"
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    value={roomForm.password}
                    onChange={e => setRoomForm({...roomForm, password: e.target.value})}
                    placeholder="Dejar vacío para entrada libre"
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-ink/20">
                  <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-ink-light hover:text-ink font-bold">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition shadow">Crear Sala</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOIN PASSWORD MODAL (Wrapped in Form for Enter Key & Anti-Autofill) */}
      <AnimatePresence>
        {joinModalRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl font-sans space-y-4">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Key className="w-6 h-6" /> Sala Protegida con Contraseña
              </h3>
              <p className="text-xs text-ink-light">Ingresa la contraseña proporcionada por el DM para unirte a <strong>{joinModalRoom.name}</strong>.</p>

              <form onSubmit={async (e) => { e.preventDefault(); await submitJoinPassword(); }} className="space-y-4">
                <div>
                  <input 
                    type="password"
                    name="room_access_pass_code"
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    value={enteredPassword}
                    onChange={e => setEnteredPassword(e.target.value)}
                    placeholder="Contraseña de la sala..."
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                    autoFocus
                  />
                  {passwordError && <p className="text-xs text-magic-red mt-1 font-bold">{passwordError}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setJoinModalRoom(null)} className="px-4 py-2 text-ink-light hover:text-ink font-bold">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition shadow">Ingresar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT DISPLAY NAME MODAL */}
      <AnimatePresence>
        {nameModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-6 max-w-md w-full shadow-2xl font-sans space-y-4">
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <Edit3 className="w-6 h-6" /> Editar Nombre de Usuario
              </h3>
              <p className="text-xs text-ink-light">Este es el nombre visible para otros jugadores y maestros en las salas.</p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateUserDisplayName(nameInput);
                  setNameModalOpen(false);
                  showAlert("¡Nombre de usuario actualizado con éxito!", "Perfil Actualizado", "success");
                } catch (err: any) {
                  showAlert(err.message || "Error al cambiar nombre.", "Error al Cambiar Nombre", "danger");
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Nombre Visible</label>
                  <input 
                    type="text"
                    required
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Nuevo nombre visible..."
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setNameModalOpen(false)} className="px-4 py-2 text-ink-light hover:text-ink font-bold">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-magic-gold text-black font-bold rounded hover:bg-yellow-500 transition shadow">Guardar Nombre</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

    </main>
  );
}
