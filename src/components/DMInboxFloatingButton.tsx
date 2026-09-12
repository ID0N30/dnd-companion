"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, Search, Filter, Trash2, CheckCheck, Check } from "lucide-react";
import { subscribeRoom, deleteDirectMessage, markDirectMessageAsRead, markAllDirectMessagesAsRead, DirectMessage, Room } from "@/lib/rooms";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/context/AuthContext";
import { DEMO_INITIAL_MESSAGES } from "@/lib/demoData";

const INITIAL_DEMO_MESSAGES: DirectMessage[] = DEMO_INITIAL_MESSAGES;

let globalActiveDMInboxId: string | null = null;

export default function DMInboxFloatingButton({
  roomId,
  isDemo = false,
  isDM
}: {
  roomId?: string;
  isDemo?: boolean;
  isDM?: boolean;
}) {
  const { user } = useAuth();
  const showAlert = useStore(state => state.showAlert);
  const showConfirm = useStore(state => state.showConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerFilter, setPlayerFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  
  const [instanceId] = useState(() => 'inbox_' + Math.random().toString(36).substring(2, 9));
  const [isPrimary, setIsPrimary] = useState(true);

  // Singleton protection to prevent duplicate button rendering
  useEffect(() => {
    globalActiveDMInboxId = instanceId;
    setIsPrimary(true);

    return () => {
      if (globalActiveDMInboxId === instanceId) {
        globalActiveDMInboxId = null;
      }
    };
  }, [instanceId]);

  // Load messages from realtime Firestore room or local demo state
  useEffect(() => {
    if (isDemo || !roomId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('dnd_demo_direct_messages');
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch (e) {
            setMessages(INITIAL_DEMO_MESSAGES);
          }
        } else {
          setMessages(INITIAL_DEMO_MESSAGES);
        }
      }
      return;
    }

    const unsub = subscribeRoom(roomId, (roomData: Room | null) => {
      setCurrentRoom(roomData);
      if (roomData && roomData.directMessages) {
        setMessages(roomData.directMessages);
      } else {
        setMessages([]);
      }
    });

    return () => unsub();
  }, [roomId, isDemo]);

  // Mark single message as read
  const handleMarkAsRead = useCallback(async (msgId: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));

    if (isDemo || !roomId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('dnd_demo_direct_messages');
        const msgs = stored ? JSON.parse(stored) : INITIAL_DEMO_MESSAGES;
        const updated = msgs.map((m: DirectMessage) => m.id === msgId ? { ...m, read: true } : m);
        localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
      }
      return;
    }

    await markDirectMessageAsRead(roomId, msgId);
  }, [isDemo, roomId]);

  // Mark all (or filtered) messages as read
  const handleMarkAllAsRead = useCallback(async (targetFilter: string = playerFilter) => {
    const unreadMessages = messages.filter(m => {
      const sender = m.characterName || m.senderName;
      const matches = targetFilter === 'all' || sender === targetFilter;
      return matches && !m.read;
    });

    if (unreadMessages.length === 0) return;

    // Optimistic update
    setMessages(prev => prev.map(m => {
      const sender = m.characterName || m.senderName;
      if (targetFilter === 'all' || sender === targetFilter) {
        return { ...m, read: true };
      }
      return m;
    }));

    if (isDemo || !roomId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('dnd_demo_direct_messages');
        const msgs = stored ? JSON.parse(stored) : INITIAL_DEMO_MESSAGES;
        const updated = msgs.map((m: DirectMessage) => {
          const sender = m.characterName || m.senderName;
          if (targetFilter === 'all' || sender === targetFilter) {
            return { ...m, read: true };
          }
          return m;
        });
        localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
      }
      return;
    }

    await markAllDirectMessagesAsRead(roomId, targetFilter === 'all' ? undefined : targetFilter);
  }, [messages, playerFilter, isDemo, roomId]);

  // Automatically mark unread messages as read when DM opens the modal
  useEffect(() => {
    if (modalOpen) {
      const hasUnread = messages.some(m => !m.read);
      if (hasUnread) {
        handleMarkAllAsRead('all');
      }
    }
  }, [modalOpen, handleMarkAllAsRead, messages]);

  const handleDeleteMessage = (msgId: string) => {
    showConfirm(
      "¿Deseas borrar este mensaje permanentemente del buzón?",
      async () => {
        if (isDemo || !roomId) {
          const updated = messages.filter(m => m.id !== msgId);
          setMessages(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
          }
          showAlert("Mensaje eliminado del buzón de demostración.", "Mensaje Borrado", "success");
        } else {
          await deleteDirectMessage(roomId, msgId);
          showAlert("Mensaje eliminado del buzón.", "Mensaje Borrado", "success");
        }
      },
      "🗑️ Confirmar Borrado de Mensaje"
    );
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const allPlayerOptions = Array.from(
    new Set(messages.map(m => m.characterName || m.senderName).filter(Boolean))
  );

  const filteredMessages = messages.filter(msg => {
    const sender = msg.characterName || msg.senderName;
    const matchesPlayer = playerFilter === 'all' || sender === playerFilter;
    const matchesSearch = !searchText.trim() || msg.content.toLowerCase().includes(searchText.toLowerCase());
    return matchesPlayer && matchesSearch;
  });

  // Strict DM Authorization Guard: Only the DM or Demo mode can see this button
  const isAuthorizedDM = isDemo || isDM === true || (isDM !== false && Boolean(user && currentRoom && user.uid === currentRoom.dmId));
  if (!isAuthorizedDM) return null;
  if (!isPrimary) return null;

  return (
    <>
      {/* FLOATING DM INBOX CIRCULAR BUTTON (Bottom Right, side-by-side with DiceRoller) */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        style={{ position: 'fixed', bottom: '1.5rem', right: '5.5rem', zIndex: 90 }}
        className="w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] max-w-[3.5rem] max-h-[3.5rem] shrink-0 bg-magic-gold text-black rounded-full shadow-[0_0_20px_rgba(245,208,97,0.8)] border-2 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center pointer-events-auto"
        title="Abrir Buzón del DM (Mensajes Directos)"
      >
        <Mail className="w-7 h-7 text-black" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-magic-red text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow border border-white animate-bounce pointer-events-none">
            {unreadCount}
          </span>
        )}
      </button>

      {/* FULL DM INBOX MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="dm-inbox-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[110] p-4 font-sans backdrop-blur-sm"
          >
            <div className="bg-parchment-dark border-4 border-magic-gold p-6 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col text-ink space-y-4 relative">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-ink/20 pb-3">
                <div>
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-magic-gold" /> Buzón del DM ({messages.length} mensaje{messages.length === 1 ? '' : 's'})
                  </h3>
                  <p className="text-xs text-ink-light mt-0.5">
                    Consulta y gestiona todos los mensajes directos, notas secretas y trasfondos enviados por tus jugadores.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-ink-light hover:text-magic-red transition cursor-pointer"
                  title="Cerrar buzón"
                >
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
                    value={playerFilter}
                    onChange={e => setPlayerFilter(e.target.value)}
                    className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold cursor-pointer"
                  >
                    <option value="all">👥 Todos los Jugadores ({messages.length})</option>
                    {allPlayerOptions.map(name => {
                      const count = messages.filter(m => (m.characterName || m.senderName) === name).length;
                      const unreadPlayerCount = messages.filter(m => (m.characterName || m.senderName) === name && !m.read).length;
                      return (
                        <option key={name} value={name}>
                          ⚔️ {name} ({count} msgs{unreadPlayerCount > 0 ? ` • ${unreadPlayerCount} sin leer` : ''})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Text Search Input */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Buscar en el mensaje..."
                    className="w-full p-2 pl-8 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold"
                  />
                  <Search className="w-4 h-4 text-ink-light absolute left-2.5 top-2.5" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => handleMarkAllAsRead(playerFilter)}
                      className="px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border border-emerald-500/40 rounded font-bold hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      title="Marcar todos los mensajes como leídos"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar como leídos
                    </button>
                  )}

                  {/* Reset Filters */}
                  {(playerFilter !== 'all' || searchText !== '') && (
                    <button
                      onClick={() => {
                        setPlayerFilter('all');
                        setSearchText('');
                      }}
                      className="px-3 py-1.5 bg-red-950/20 text-red-600 border border-red-500/40 rounded font-bold hover:bg-magic-red hover:text-white transition cursor-pointer whitespace-nowrap"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Messages List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                    <Mail className="w-12 h-12 text-ink/20" />
                    <p className="text-sm font-bold text-ink-light">No hay mensajes en el buzón que coincidan con el filtro.</p>
                    <p className="text-xs text-ink/50">Los mensajes directos o notas enviadas por tus aventureros aparecerán aquí.</p>
                  </div>
                ) : (
                  filteredMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-4 bg-parchment rounded-xl border shadow-md space-y-2 transition ${
                        !msg.read 
                          ? 'border-magic-gold/80 bg-parchment shadow-[0_0_15px_rgba(245,208,97,0.15)]' 
                          : 'border-ink/20 hover:border-magic-gold/40'
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-ink/15 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-magic-gold px-2.5 py-0.5 rounded bg-magic-gold/10 border border-magic-gold/30 flex items-center gap-1.5 font-cinzel">
                            ⚔️ {msg.characterName || msg.senderName}
                          </span>

                          {/* Read / Unread Status Badge */}
                          {!msg.read ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-magic-red/20 text-magic-red border border-magic-red/30 text-[10px] font-bold animate-pulse">
                              🔴 No leído
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCheck className="w-3 h-3 text-emerald-400" /> Leído
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-ink/60 font-mono">
                          <span>
                            📅 {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {!msg.read && (
                            <button
                              onClick={() => handleMarkAsRead(msg.id)}
                              className="px-2 py-1 bg-emerald-950/20 text-emerald-400 rounded border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1 font-sans text-xs font-bold"
                              title="Marcar este mensaje como leído"
                            >
                              <Check className="w-3.5 h-3.5" /> Leído
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
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
    </>
  );
}
