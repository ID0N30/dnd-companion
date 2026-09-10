"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useStore, CharacterState, syncAllLocalPlayersToStorage } from "@/store/useStore";
import { verifyRoomPassword, Room, deletePlayerFromRoom, fetchUserCharactersAcrossRooms } from "@/lib/rooms";
import { User, Settings, Trash2, X, CheckCircle2, Shield, Heart, Sparkles, FolderKey, AlertCircle, Pin, Search, Lock, Key } from "lucide-react";

export default function AccountSettingsModal({
  open,
  onClose,
  availableRooms = []
}: {
  open: boolean;
  onClose: () => void;
  availableRooms?: Room[];
}) {
  const { user, updateUserDisplayName } = useAuth();
  const { players, deleteCharacter, assignCharacterToRoom, rehydrateLocalPlayers, showAlert, showConfirm } = useStore();

  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "characters">("profile");

  // Re-assign campaign state
  const [reassignModal, setReassignModal] = useState<{ open: boolean; charId: string; charName: string; currentRoomId: string }>({
    open: false, charId: '', charName: '', currentRoomId: ''
  });
  const [searchRoomQuery, setSearchRoomQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [validatingPassword, setValidatingPassword] = useState(false);

  // Rehydrate characters on modal open (local + cloud recovery)
  useEffect(() => {
    if (open) {
      rehydrateLocalPlayers();
      setDisplayNameInput(user?.displayName || "");
      if (user?.uid && availableRooms && availableRooms.length > 0) {
        fetchUserCharactersAcrossRooms(user.uid, availableRooms.map(r => r.id)).then(cloudChars => {
          if (cloudChars && cloudChars.length > 0) {
            useStore.setState((state) => {
              const map = new Map<string, CharacterState>();
              state.players.forEach(p => map.set(p.id, p));
              cloudChars.forEach(p => map.set(p.id, { ...map.get(p.id), ...p }));
              return { players: Array.from(map.values()) };
            });
            syncAllLocalPlayersToStorage(cloudChars);
          }
        });
      }
    }
  }, [open, rehydrateLocalPlayers, user?.uid, user?.displayName, availableRooms]);

  if (!open) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    setSavingName(true);
    try {
      await updateUserDisplayName(displayNameInput.trim());
      showAlert("Tu nombre de usuario se actualizó con éxito.", "Perfil Actualizado", "success");
    } catch (err: any) {
      showAlert(err.message || "No se pudo actualizar el nombre.", "Error de Perfil", "warning");
    } finally {
      setSavingName(false);
    }
  };

  // Filter characters belonging to user (excluding demo/practice characters like Drizzt)
  const myCharacters = players.filter(p => {
    if (!p) return false;
    if (p.id === 'drizzt_dourden_demo' || p.id?.includes('demo') || p.name?.toLowerCase().includes('drizzt')) {
      return false;
    }
    if (!user?.uid) return true;
    return !p.ownerId || p.ownerId === user.uid;
  });

  const getCampaignDisplayName = (roomIdKey: string) => {
    if (!roomIdKey || roomIdKey === 'sin_campaña') return 'Sin Campaña Asignada';
    const foundRoom = availableRooms.find(r => r.id === roomIdKey || r.name === roomIdKey);
    if (foundRoom) return foundRoom.name;
    return roomIdKey;
  };

  // Group characters by campaign (roomId)
  const charactersByCampaign = myCharacters.reduce((acc, char) => {
    const key = char.roomId || 'sin_campaña';
    if (!acc[key]) acc[key] = [];
    acc[key].push(char);
    return acc;
  }, {} as Record<string, CharacterState[]>);

  const handleDeleteChar = (char: CharacterState) => {
    showConfirm(
      `¿Estás seguro de que deseas eliminar permanentemente a "${char.name}" (${char.race} ${char.charClass} Nivel ${char.level})? Esta acción liberará el espacio en la cuenta y lo retirará de la campaña.`,
      async () => {
        await deleteCharacter(char.id);
        if (char.roomId && char.roomId !== 'sin_campaña') {
          await deletePlayerFromRoom(char.roomId, char.id);
        }
        // Purge from all other available rooms to eliminate zombie/leaked copies
        availableRooms.forEach(room => {
          if (room.id !== char.roomId) {
            deletePlayerFromRoom(room.id, char.id);
          }
        });
        showAlert(`Personaje "${char.name}" eliminado con éxito de la cuenta y de la campaña.`, "Personaje Eliminado", "success");
      },
      "🔥 Confirmar Eliminación de Personaje",
      "Sí, Eliminar Personaje",
      "Cancelar"
    );
  };

  const handleOpenReassign = (char: CharacterState) => {
    setReassignModal({
      open: true,
      charId: char.id,
      charName: char.name,
      currentRoomId: char.roomId || ''
    });
    setSelectedRoomId(char.roomId || '');
    setSearchRoomQuery("");
    setEnteredPassword("");
    setPasswordError("");
  };

  const filteredAvailableRooms = availableRooms.filter(r => {
    const nameLower = r.name.toLowerCase();
    const idLower = r.id.toLowerCase();
    if (nameLower.includes("prueba") || nameLower.includes("demo") || idLower.includes("demo") || idLower.includes("prueba")) {
      return false;
    }
    return !searchRoomQuery.trim() || 
      nameLower.includes(searchRoomQuery.toLowerCase()) || 
      idLower.includes(searchRoomQuery.toLowerCase());
  });

  const submitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomId = selectedRoomId.trim();
    if (!finalRoomId) return;

    // Find if target room is protected by password
    const targetRoom = availableRooms.find(r => r.id === finalRoomId);
    if (targetRoom && targetRoom.hasPassword) {
      if (!enteredPassword) {
        setPasswordError("⚠️ Esta campaña requiere contraseña para transferir el personaje.");
        return;
      }
      setValidatingPassword(true);
      const isValid = await verifyRoomPassword(targetRoom.id, enteredPassword);
      setValidatingPassword(false);

      if (!isValid) {
        setPasswordError("❌ Contraseña de la campaña incorrecta.");
        return;
      }
    }

    const oldRoomId = reassignModal.currentRoomId;
    if (oldRoomId && oldRoomId !== finalRoomId && oldRoomId !== 'sin_campaña') {
      await deletePlayerFromRoom(oldRoomId, reassignModal.charId);
    }

    await assignCharacterToRoom(reassignModal.charId, finalRoomId);
    setReassignModal({ open: false, charId: '', charName: '', currentRoomId: '' });
    const friendlyName = getCampaignDisplayName(finalRoomId);
    showAlert(`El personaje "${reassignModal.charName}" ha sido transferido a la campaña "${friendlyName}".`, "Transferencia Exitosa", "success");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="account-settings-main-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-parchment-dark border-4 border-magic-gold rounded-2xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 text-ink relative max-h-[88vh] flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-ink-light hover:text-magic-red transition cursor-pointer"
              title="Cerrar Ajustes de Cuenta"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-ink/20 pb-3">
              <div className="p-2.5 bg-magic-gold/20 rounded-xl border border-magic-gold/40 text-magic-gold">
                <Settings className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-cinzel text-magic-gold">
                  Ajustes de Cuenta y Personajes
                </h3>
                <p className="text-xs text-ink-light">
                  Gestiona la información de tu perfil y administra tus héroes por campaña.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-parchment p-1 rounded-xl border border-ink/20 font-bold text-xs">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'profile' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:bg-ink/10'
                }`}
              >
                <User className="w-4 h-4" /> Perfil de Usuario
              </button>
              <button
                onClick={() => setActiveTab("characters")}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'characters' ? 'bg-magic-gold text-black shadow' : 'text-ink hover:bg-ink/10'
                }`}
              >
                <FolderKey className="w-4 h-4" /> Personajes por Campaña ({myCharacters.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === "profile" ? (
                <form onSubmit={handleUpdateName} className="space-y-4 py-2">
                  <div className="p-4 bg-parchment rounded-xl border border-ink/20 space-y-3">
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                      Nombre de Usuario / Aventurero
                    </label>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="w-full p-3 bg-parchment-dark border border-ink/30 rounded-lg text-ink font-bold text-base focus:outline-none focus:border-magic-gold"
                      placeholder="Ej. Gandalf el Gris"
                      required
                    />
                    <p className="text-[11px] text-ink-light leading-relaxed">
                      Este nombre se mostrará en los registros de la mesa de juego y en las salas del DM.
                    </p>
                  </div>

                  <div className="p-3 bg-ink/5 rounded-xl border border-ink/10 text-xs space-y-1 text-ink-light">
                    <p><strong>Correo electrónico:</strong> {user?.email || "Cuenta de invitado / Anónimo"}</p>
                    <p><strong>ID de Usuario:</strong> <span className="font-mono text-[10px]">{user?.uid || "Local"}</span></p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingName || !displayNameInput.trim()}
                    className={`w-full py-3 bg-magic-gold text-black font-bold rounded-xl shadow hover:bg-yellow-500 transition text-sm cursor-pointer flex items-center justify-center gap-2 ${
                      savingName ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {savingName ? "Guardando..." : "Guardar Cambios de Perfil"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 py-2">
                  {Object.keys(charactersByCampaign).length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <AlertCircle className="w-10 h-10 text-ink/30 mx-auto" />
                      <p className="text-sm font-bold text-ink-light">No tienes personajes registrados actualmente.</p>
                      <p className="text-xs text-ink/50">Crea un personaje al unirte a cualquier campaña para comenzar tu aventura.</p>
                    </div>
                  ) : (
                    Object.entries(charactersByCampaign).map(([roomIdKey, chars]) => (
                      <div key={roomIdKey} className="p-4 bg-parchment rounded-xl border border-ink/20 shadow-sm space-y-3">
                        <h4 className="font-bold font-cinzel text-sm text-magic-gold flex items-center justify-between border-b border-ink/10 pb-1.5">
                          <span>🏰 Campaña: <strong className="text-ink">{getCampaignDisplayName(roomIdKey)}</strong></span>
                          <span className="text-xs font-mono text-ink-light">({chars.length} héroe{chars.length > 1 ? 's' : ''})</span>
                        </h4>

                        <div className="space-y-2">
                          {chars.map((char) => (
                            <div
                              key={char.id}
                              className="p-3 bg-parchment-dark rounded-lg border border-ink/15 flex items-center justify-between gap-3 flex-wrap hover:border-magic-gold/40 transition"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-sm text-ink block font-cinzel">
                                  {char.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-ink-light">
                                  <span>{char.race}</span>
                                  <span>•</span>
                                  <span className="text-magic-gold font-bold">{char.charClass} (Niv. {char.level})</span>
                                  <span>•</span>
                                  <span>❤️ {char.hp.current}/{char.hp.max} HP</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenReassign(char)}
                                  className="px-3 py-1.5 bg-magic-gold/20 text-magic-gold rounded-lg border border-magic-gold/30 hover:bg-magic-gold hover:text-black transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                  title="Cambiar este personaje a otra campaña"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>Cambiar Campaña</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteChar(char)}
                                  className="px-3 py-1.5 bg-red-950/20 text-red-600 rounded-lg border border-red-500/30 hover:bg-magic-red hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                  title="Eliminar este personaje permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* REASSIGN / TRANSFER CAMPAIGN MODAL */}
      {reassignModal.open && (
        <motion.div
          key="account-settings-reassign-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4 font-sans backdrop-blur-sm"
        >
          <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl max-w-lg w-full text-ink space-y-4 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setReassignModal({ open: false, charId: '', charName: '', currentRoomId: '' })}
              className="absolute top-4 right-4 text-ink-light hover:text-magic-red p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-ink/20 pb-2">
              <Pin className="w-5 h-5 text-magic-gold" />
              <h3 className="font-cinzel font-bold text-lg text-magic-gold">
                Cambiar Campaña de Personaje
              </h3>
            </div>

            <p className="text-xs text-ink-light leading-relaxed">
              Selecciona o busca la campaña de destino a la que deseas transferir al héroe <strong className="text-ink font-bold">"{reassignModal.charName}"</strong>.
            </p>

            <form onSubmit={submitReassign} className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchRoomQuery}
                  onChange={(e) => setSearchRoomQuery(e.target.value)}
                  className="w-full p-2.5 pl-8 bg-parchment border border-ink/30 rounded-lg text-ink font-bold text-xs focus:outline-none focus:border-magic-gold"
                  placeholder="Buscar campaña por nombre o ID..."
                />
                <Search className="w-4 h-4 text-ink-light absolute left-2.5 top-2.5" />
              </div>

              {/* Campaign Options List */}
              <div className="flex-1 overflow-y-auto space-y-2 border border-ink/20 rounded-lg p-2 bg-parchment/50 max-h-44">

                {filteredAvailableRooms.map((room) => (
                  <label
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setEnteredPassword("");
                      setPasswordError("");
                    }}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer text-xs font-bold transition ${
                      selectedRoomId === room.id ? 'bg-magic-gold text-black border-magic-gold shadow' : 'bg-parchment border-ink/20 text-ink hover:bg-ink/5'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>🏰 {room.name}</span>
                        {room.hasPassword && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="text-[10px] opacity-75 block font-mono">ID: {room.id} • DM: {room.dmName}</span>
                    </div>
                    {room.hasPassword && (
                      <span className="text-[10px] bg-amber-950/20 text-amber-800 px-1.5 py-0.5 rounded border border-amber-500/30">
                        🔒 Clave
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Manual Input Fallback */}
              <div>
                <label className="block text-[11px] font-bold text-ink uppercase mb-1">
                  O ingresar ID / Nombre de sala manualmente:
                </label>
                <input
                  type="text"
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setPasswordError("");
                  }}
                  className="w-full p-2.5 bg-parchment border border-ink/30 rounded-lg text-ink font-bold text-xs focus:outline-none focus:border-magic-gold font-mono"
                  placeholder="Ej. MaresDeCodicia"
                  required
                />
              </div>

              {/* Password prompt if selected room is protected */}
              {availableRooms.find(r => r.id === selectedRoomId.trim())?.hasPassword && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" /> Contraseña de la Campaña Requerida:
                  </label>
                  <input
                    type="password"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full p-2 bg-parchment border border-ink/30 rounded text-ink font-bold text-xs focus:outline-none focus:border-magic-gold"
                    placeholder="Escribe la contraseña de la campaña..."
                    required
                  />
                </div>
              )}

              {passwordError && (
                <p className="text-xs text-red-600 font-bold bg-red-950/10 p-2 rounded border border-red-500/30">
                  {passwordError}
                </p>
              )}

              <div className="flex justify-end gap-2 font-bold text-xs pt-2 border-t border-ink/20">
                <button
                  type="button"
                  onClick={() => setReassignModal({ open: false, charId: '', charName: '', currentRoomId: '' })}
                  className="px-4 py-2 bg-ink/10 text-ink rounded hover:bg-ink/20 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={validatingPassword || !selectedRoomId.trim()}
                  className="px-5 py-2 bg-magic-gold text-black rounded hover:bg-yellow-500 transition cursor-pointer shadow flex items-center gap-1"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{validatingPassword ? "Verificando..." : "Confirmar Transferencia"}</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
