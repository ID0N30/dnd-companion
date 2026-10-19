"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, X, Search, Filter, Trash2, CheckCheck, Check, User, Clock, 
  AlertCircle, Send, Reply, MessageSquarePlus, Shield, ArrowRight 
} from "lucide-react";
import { 
  subscribeRoom, 
  subscribeRoomWhispers, 
  deleteDirectMessage, 
  markDirectMessageAsRead, 
  markAllDirectMessagesAsRead, 
  sendWhisperFromDM, 
  DirectMessage, 
  Room 
} from "@/lib/rooms";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/context/AuthContext";
import { DEMO_INITIAL_MESSAGES } from "@/lib/demoData";

const INITIAL_DEMO_MESSAGES: DirectMessage[] = DEMO_INITIAL_MESSAGES;

let activeInboxInstances = 0;

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
  const players = useStore(state => state.players);

  const [modalOpen, setModalOpen] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerFilter, setPlayerFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  // DM Whisper Composer State
  const [isComposing, setIsComposing] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [whisperContent, setWhisperContent] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isPrimary, setIsPrimary] = useState(true);

  // Singleton protection to prevent duplicate button rendering and phantom listeners
  useEffect(() => {
    if (activeInboxInstances > 0) {
      setIsPrimary(false);
    }
    activeInboxInstances++;

    return () => {
      activeInboxInstances--;
    };
  }, []);

  // Load messages from realtime Firestore room or local demo state
  useEffect(() => {
    if (!isPrimary) return;

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

    const unsubRoom = subscribeRoom(roomId, (roomData: Room | null) => {
      setCurrentRoom(roomData);
    });

    const unsubWhispers = subscribeRoomWhispers(roomId, { isDM: true }, (whispers) => {
      setMessages(whispers);
    });

    return () => {
      unsubRoom();
      unsubWhispers();
    };
  }, [roomId, isDemo, isPrimary]);

  // Unified list of recipient characters in this room or messages
  const recipientOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; ownerId?: string }>();
    
    // Players in room
    players.forEach(p => {
      if (p.id && p.name && (isDemo || !roomId || !p.roomId || p.roomId === roomId)) {
        map.set(p.id, {
          id: p.id,
          name: p.name,
          ownerId: p.ownerId || p.id
        });
      }
    });

    // Players found in messages
    messages.forEach(m => {
      const charId = !m.isFromDM ? m.senderId : m.recipientCharacterId;
      const charName = !m.isFromDM ? (m.characterName || m.senderName) : (m.recipientCharacterName || m.characterName);
      if (charId && charId !== 'dm' && charName && !map.has(charId)) {
        map.set(charId, {
          id: charId,
          name: charName,
          ownerId: m.playerUid || m.senderUid || charId
        });
      }
    });

    return Array.from(map.values());
  }, [players, messages, isDemo, roomId]);

  // Ensure selected recipient is valid
  useEffect(() => {
    if (!selectedRecipientId && recipientOptions.length > 0) {
      setSelectedRecipientId(recipientOptions[0].id);
    }
  }, [recipientOptions, selectedRecipientId]);

  // Mark single message as read (only messages from players)
  const handleMarkAsRead = useCallback(async (msgId: string) => {
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

    const targetMsg = messages.find(m => m.id === msgId);
    await markDirectMessageAsRead(roomId, msgId, targetMsg?.playerUid || targetMsg?.senderUid || targetMsg?.senderId);
  }, [isDemo, roomId, messages]);

  // Mark all (or filtered) messages received from players as read
  const handleMarkAllAsRead = useCallback(async (targetFilter: string = playerFilter) => {
    const unreadMessages = messages.filter(m => {
      if (m.isFromDM) return false;
      const sender = m.characterName || m.senderName;
      const matches = targetFilter === 'all' || sender === targetFilter;
      return matches && !m.read;
    });

    if (unreadMessages.length === 0) return;

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.isFromDM) return m;
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
          if (m.isFromDM) return m;
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

  // Automatically mark unread messages from players as read when DM opens the modal
  useEffect(() => {
    if (modalOpen) {
      const hasUnreadFromPlayers = messages.some(m => !m.isFromDM && !m.read);
      if (hasUnreadFromPlayers) {
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
          const targetMsg = messages.find(m => m.id === msgId);
          await deleteDirectMessage(roomId, msgId, targetMsg?.playerUid || targetMsg?.senderUid || targetMsg?.senderId);
          showAlert("Mensaje eliminado del buzón.", "Mensaje Borrado", "success");
        }
      },
      "Confirmar Borrado de Mensaje"
    );
  };

  // Open composer pre-selecting the sender of a message
  const handleReplyToMessage = (msg: DirectMessage) => {
    const targetId = !msg.isFromDM ? msg.senderId : (msg.recipientCharacterId || '');
    if (targetId) {
      setSelectedRecipientId(targetId);
    }
    setIsComposing(true);
    setTimeout(() => {
      composerTextareaRef.current?.focus();
    }, 100);
  };

  // Send DM Whisper to selected player
  const handleSendWhisper = async () => {
    if (!whisperContent.trim() || !selectedRecipientId || isSending) return;

    const recipient = recipientOptions.find(r => r.id === selectedRecipientId) || {
      id: selectedRecipientId,
      name: selectedRecipientId,
      ownerId: selectedRecipientId
    };

    setIsSending(true);
    try {
      const effectiveRoomId = roomId || 'demo_sandbox_room';
      const whisperPayload = {
        recipientCharacterId: recipient.id,
        recipientCharacterName: recipient.name,
        playerUid: recipient.ownerId || recipient.id,
        content: whisperContent.trim()
      };

      await sendWhisperFromDM(effectiveRoomId, whisperPayload);

      // Optimistic update for demo or immediate feedback
      if (isDemo || !roomId) {
        const newLocalMsg: DirectMessage = {
          id: 'whisper_dm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          senderId: 'dm',
          senderUid: user?.uid || 'dm',
          playerUid: recipient.ownerId || recipient.id,
          senderName: 'Dungeon Master',
          characterName: recipient.name,
          recipientCharacterId: recipient.id,
          recipientCharacterName: recipient.name,
          content: whisperContent.trim(),
          isFromDM: true,
          timestamp: Date.now(),
          read: false
        };
        setMessages(prev => [...prev, newLocalMsg]);
      }

      showAlert(`Susurro enviado a ${recipient.name}`, "Susurro Enviado", "success");
      setWhisperContent("");
      setIsComposing(false);
    } finally {
      setIsSending(false);
    }
  };

  // Only count unread messages received from players
  const unreadCount = messages.filter(m => !m.isFromDM && !m.read).length;

  const allPlayerOptions = Array.from(
    new Set(
      messages.map(m => (!m.isFromDM ? (m.characterName || m.senderName) : (m.recipientCharacterName || m.characterName))).filter(Boolean)
    )
  );

  const filteredMessages = messages.filter(msg => {
    const participant = !msg.isFromDM ? (msg.characterName || msg.senderName) : (msg.recipientCharacterName || msg.characterName);
    const matchesPlayer = playerFilter === 'all' || participant === playerFilter;
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
        title="Abrir Buzón del DM (Mensajes Directos y Susurros)"
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
              <div className="flex justify-between items-center border-b border-ink/20 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-2xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-magic-gold" /> Buzón del DM ({messages.length} mensaje{messages.length === 1 ? '' : 's'})
                  </h3>
                  <p className="text-xs text-ink-light mt-0.5">
                    Gestiona mensajes de jugadores y responde con susurros secretos bidireccionales.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsComposing(prev => !prev)}
                    className="px-3.5 py-1.5 bg-magic-gold text-black rounded-lg font-bold text-xs hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1.5 shadow"
                    title="Redactar un nuevo susurro secreto para un jugador"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-black" />
                    {isComposing ? "Cerrar Compositor" : "Nuevo Susurro"}
                  </button>

                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-2 text-ink-light hover:text-magic-red transition cursor-pointer"
                    title="Cerrar buzón"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Integrated DM Whisper Composer */}
              <AnimatePresence>
                {isComposing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-parchment p-4 rounded-xl border-2 border-magic-gold/60 shadow-lg space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-magic-gold" />
                          <span className="text-xs font-bold font-cinzel text-magic-gold">
                            Susurro Secreto del DM a Jugador
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-ink">Destinatario:</span>
                          {recipientOptions.length === 0 ? (
                            <span className="text-magic-red italic">No hay jugadores disponibles</span>
                          ) : (
                            <select
                              value={selectedRecipientId}
                              onChange={e => setSelectedRecipientId(e.target.value)}
                              className="p-1.5 bg-parchment-dark border border-ink/30 rounded text-ink font-bold text-xs focus:outline-none focus:border-magic-gold cursor-pointer"
                            >
                              {recipientOptions.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      <div>
                        <textarea
                          ref={composerTextareaRef}
                          value={whisperContent}
                          onChange={e => setWhisperContent(e.target.value.slice(0, 500))}
                          placeholder="Escribe una revelación, visión secreta o respuesta privada para este aventurero..."
                          rows={3}
                          className="w-full p-2.5 bg-parchment-dark border border-ink/30 rounded-lg text-xs text-ink font-sans leading-relaxed focus:outline-none focus:border-magic-gold"
                        />
                        <div className="flex justify-between items-center text-[10px] text-ink-light mt-1">
                          <span>Solo visible para el jugador seleccionado.</span>
                          <span className={whisperContent.length >= 500 ? 'text-magic-red font-bold' : ''}>
                            {whisperContent.length} / 500
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end items-center gap-2 pt-1 border-t border-ink/15">
                        <button
                          onClick={() => {
                            setIsComposing(false);
                            setWhisperContent("");
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-ink-light hover:text-ink cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSendWhisper}
                          disabled={!whisperContent.trim() || !selectedRecipientId || isSending}
                          className={`px-4 py-1.5 bg-magic-gold text-black rounded text-xs font-bold hover:bg-yellow-500 transition shadow flex items-center gap-1.5 cursor-pointer ${
                            !whisperContent.trim() || !selectedRecipientId || isSending ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Send className="w-3.5 h-3.5 text-black" />
                          {isSending ? "Enviando..." : "Enviar Susurro"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-parchment p-3.5 rounded-xl border border-ink/20 text-xs">
                {/* Player Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                  <span className="font-bold text-ink whitespace-nowrap flex items-center gap-1">
                    <Filter className="w-4 h-4 text-magic-gold" /> Filtrar por Aventurero:
                  </span>
                  <select
                    value={playerFilter}
                    onChange={e => setPlayerFilter(e.target.value)}
                    className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold focus:outline-none focus:border-magic-gold cursor-pointer"
                  >
                    <option value="all">Todos los Aventureros ({messages.length})</option>
                    {allPlayerOptions.map(name => {
                      const count = messages.filter(m => (!m.isFromDM ? (m.characterName || m.senderName) : (m.recipientCharacterName || m.characterName)) === name).length;
                      const unreadPlayerCount = messages.filter(m => !m.isFromDM && (m.characterName || m.senderName) === name && !m.read).length;
                      return (
                        <option key={name} value={name}>
                          {name} ({count} msgs{unreadPlayerCount > 0 ? ` • ${unreadPlayerCount} sin leer` : ''})
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
                      title="Marcar todos los mensajes recibidos como leídos"
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
                      className="px-3 py-1.5 bg-red-950/20 text-red-300 border border-red-500/40 rounded font-bold hover:bg-magic-red hover:text-white transition cursor-pointer whitespace-nowrap"
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
                    <p className="text-xs text-ink-light">Los mensajes directos de aventureros o tus respuestas de DM aparecerán aquí.</p>
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isDMWhisper = Boolean(msg.isFromDM);

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border transition space-y-2 shadow-md ${
                          isDMWhisper
                            ? 'bg-parchment-dark/60 border-magic-gold/50 hover:border-magic-gold'
                            : !msg.read
                              ? 'bg-parchment border-magic-gold/80 shadow-[0_0_15px_rgba(245,208,97,0.15)]'
                              : 'bg-parchment border-ink/20 hover:border-magic-gold/40'
                        }`}
                      >
                        <div className="flex justify-between items-center border-b border-ink/15 pb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDMWhisper ? (
                              <>
                                <span className="font-bold text-xs text-black px-2.5 py-0.5 rounded bg-magic-gold border border-magic-gold shadow-sm flex items-center gap-1.5 font-cinzel">
                                  <Shield className="w-3.5 h-3.5 text-black shrink-0" /> Enviado por DM
                                </span>
                                <span className="text-xs font-bold text-magic-gold flex items-center gap-1 font-cinzel">
                                  <ArrowRight className="w-3 h-3 text-magic-gold" /> {msg.recipientCharacterName || msg.characterName || 'Aventurero'}
                                </span>
                                {msg.read ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                    <CheckCheck className="w-3 h-3 text-emerald-400" /> Leído por jugador
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                    <Clock className="w-3 h-3 text-amber-400" /> Enviado al jugador (Pendiente)
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-sm text-magic-gold px-2.5 py-0.5 rounded bg-magic-gold/10 border border-magic-gold/30 flex items-center gap-1.5 font-cinzel">
                                  <User className="w-3.5 h-3.5 text-magic-gold shrink-0" /> {msg.characterName || msg.senderName}
                                </span>

                                {!msg.read ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-400/40 text-[10px] font-bold animate-pulse">
                                    <AlertCircle className="w-3 h-3 text-red-300" /> No leído
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                    <CheckCheck className="w-3 h-3 text-emerald-400" /> Leído
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-ink-light font-mono flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-ink-light shrink-0" /> {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {!isDMWhisper && (
                              <button
                                onClick={() => handleReplyToMessage(msg)}
                                className="px-2 py-1 bg-magic-gold/20 text-magic-gold rounded border border-magic-gold/40 hover:bg-magic-gold hover:text-black transition cursor-pointer flex items-center gap-1 font-sans text-xs font-bold"
                                title="Responder a este aventurero con un susurro secreto"
                              >
                                <Reply className="w-3.5 h-3.5" /> Responder
                              </button>
                            )}

                            {!isDMWhisper && !msg.read && (
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
                              className="px-2 py-1 bg-red-950/20 text-red-300 rounded border border-red-500/30 hover:bg-magic-red hover:text-white transition cursor-pointer flex items-center gap-1 font-sans text-xs font-bold"
                              title="Eliminar este mensaje"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        </div>

                        <p className={`text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans p-3 rounded-lg border border-ink/10 ${
                          isDMWhisper ? 'bg-parchment/60 italic' : 'bg-parchment-dark/50'
                        }`}>
                          {msg.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
