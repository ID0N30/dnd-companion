"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Shield, User, Reply, CheckCheck, Clock } from "lucide-react";
import { DirectMessage, sendDirectMessageToDM } from "@/lib/rooms";
import { CharacterState } from "@/store/useStore";

export interface WhisperConversationModalProps {
  isOpen: boolean;
  tab: "compose" | "history";
  content: string;
  character: CharacterState;
  user: any;
  isDemoMode: boolean;
  mySentMessages: DirectMessage[];
  unreadFromDMCount: number;
  onClose: () => void;
  onTabChange: (tab: "compose" | "history") => void;
  onContentChange: (content: string) => void;
  setMySentMessages: React.Dispatch<React.SetStateAction<DirectMessage[]>>;
  showAlert: (message: string, title?: string, type?: "success" | "danger" | "warning" | "info") => void;
}

export const WhisperConversationModal = React.memo(function WhisperConversationModal({
  isOpen,
  tab,
  content,
  character,
  user,
  isDemoMode,
  mySentMessages,
  unreadFromDMCount,
  onClose,
  onTabChange,
  onContentChange,
  setMySentMessages,
  showAlert,
}: WhisperConversationModalProps) {
  const handleSendMessage = async () => {
    if (!content.trim()) return;
    const effectiveRoomId = isDemoMode
      ? "demo_sandbox_room"
      : character.roomId || (typeof window !== "undefined" ? window.location.pathname.split("/")[2] : "");

    if (!effectiveRoomId) {
      showAlert("Debes estar en una sala de campaña para enviar mensajes al DM.", "Sala Requerida", "warning");
      return;
    }

    await sendDirectMessageToDM(effectiveRoomId, {
      senderId: character.id,
      senderUid: user?.uid,
      playerUid: user?.uid || character.id,
      senderName: character.name,
      characterName: character.name,
      content: content.trim(),
    });

    if (isDemoMode) {
      const newMsg: DirectMessage = {
        id: "whisper_player_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        senderId: character.id,
        senderUid: user?.uid || "demo_user",
        playerUid: user?.uid || character.id,
        senderName: character.name,
        characterName: character.name,
        content: content.trim(),
        timestamp: Date.now(),
        read: false,
      };
      setMySentMessages((prev) => [...prev, newMsg]);
    }

    showAlert("Mensaje enviado con éxito al DM.", "Mensaje Enviado", "success");
    onContentChange("");
    onTabChange("history");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 font-sans"
        >
          <div className="bg-parchment-dark border-4 border-magic-gold p-5 rounded-xl shadow-2xl w-[95%] max-w-lg space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-ink/20 pb-3 shrink-0">
              <h3 className="text-xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Mensajes con el DM
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-ink-light hover:text-ink cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-ink/20 shrink-0 text-xs font-bold font-cinzel">
              <button
                onClick={() => onTabChange("compose")}
                className={`px-4 py-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  tab === "compose"
                    ? "border-magic-gold text-magic-gold bg-magic-gold/10"
                    : "border-transparent text-ink-light hover:text-ink"
                }`}
              >
                Redactar
              </button>
              <button
                onClick={() => onTabChange("history")}
                className={`px-4 py-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  tab === "history"
                    ? "border-magic-gold text-magic-gold bg-magic-gold/10"
                    : "border-transparent text-ink-light hover:text-ink"
                }`}
              >
                Conversación ({mySentMessages.length})
                {unreadFromDMCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-magic-red animate-pulse" />
                )}
              </button>
            </div>

            {/* Tab 1: Compose */}
            {tab === "compose" ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-ink-light">
                    Envía notas de historia, secretos, intenciones o peticiones privadas a tu Maestro de la Mazmorra (DM). Máximo 500 caracteres (se conservan siempre los 5 más recientes).
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value.slice(0, 500))}
                    placeholder="Escribe tu mensaje privado para el DM..."
                    rows={5}
                    className="w-full p-3 bg-parchment border border-ink/30 rounded-lg text-xs text-ink font-sans leading-relaxed focus:outline-none focus:border-magic-gold"
                  />
                  <div className="flex justify-between items-center text-[10px] text-ink-light">
                    <span>Solo visible para el DM de la sala.</span>
                    <span className={content.length >= 500 ? "text-magic-red font-bold" : ""}>
                      {content.length} / 500
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-ink/20">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-ink-light hover:text-ink cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!content.trim()}
                    className={`px-5 py-2 bg-magic-gold text-black rounded text-xs font-bold hover:bg-yellow-500 transition shadow cursor-pointer ${
                      !content.trim() ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Enviar Mensaje
                  </button>
                </div>
              </div>
            ) : (
              /* Tab 2: Conversation History with Bidirectional DM Whispers */
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[50vh]">
                {mySentMessages.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-ink-light italic">No hay mensajes ni susurros con el DM en esta campaña aún.</p>
                    <button
                      onClick={() => onTabChange("compose")}
                      className="text-xs text-magic-gold font-bold underline cursor-pointer"
                    >
                      Redactar mi primer mensaje
                    </button>
                  </div>
                ) : (
                  mySentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg border space-y-2 text-xs transition ${
                        msg.isFromDM
                          ? "bg-magic-gold/10 border-magic-gold shadow-[0_0_12px_rgba(245,208,97,0.2)]"
                          : "bg-parchment border-ink/20"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] font-mono border-b border-ink/10 pb-1 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {msg.isFromDM ? (
                            <span className="px-2 py-0.5 rounded bg-magic-gold text-black font-bold font-cinzel text-[10px] flex items-center gap-1 shadow-sm">
                              <Shield className="w-3 h-3 text-black" /> Susurro del DM
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-ink/10 text-ink font-bold font-cinzel text-[10px] flex items-center gap-1">
                              <User className="w-3 h-3 text-magic-gold" /> Enviado por ti ({character.name})
                            </span>
                          )}

                          <span className="text-ink-light">
                            {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {msg.isFromDM ? (
                            <button
                              onClick={() => onTabChange("compose")}
                              className="px-2 py-0.5 bg-magic-gold text-black rounded text-[10px] font-bold hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow-sm font-sans"
                              title="Responder al DM"
                            >
                              <Reply className="w-3 h-3 text-black" /> Responder al DM
                            </button>
                          ) : (
                            msg.read ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold font-sans">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Leído por el DM
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold font-sans">
                                <Clock className="w-3.5 h-3.5 text-amber-400" /> Enviado (Pendiente)
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <p className={`leading-relaxed whitespace-pre-wrap font-sans p-2.5 rounded border border-ink/10 ${
                        msg.isFromDM ? "bg-parchment-dark/70 text-ink italic font-medium" : "bg-parchment-dark/40 text-ink"
                      }`}>
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
