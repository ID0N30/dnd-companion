"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scroll, Plus, Pin, PenTool, Trash2 } from "lucide-react";
import { PersonalNote } from "@/store/useStore";

export interface PrivateNotesTabProps {
  characterName: string;
  notes: PersonalNote[];
  onOpenNewNote: () => void;
  onOpenEditNote: (note: PersonalNote) => void;
  onDeleteNote: (id: string) => void;
  onTogglePinNote: (id: string) => void;
}

export const PrivateNotesTab = React.memo(function PrivateNotesTab({
  characterName,
  notes,
  onOpenNewNote,
  onOpenEditNote,
  onDeleteNote,
  onTogglePinNote,
}: PrivateNotesTabProps) {
  const sortedNotes = [...notes].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt
  );

  return (
    <motion.div
      key="notes"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 font-sans"
    >
      {/* Header & Privacy Notice */}
      <div className="bg-parchment p-4 sm:p-6 rounded-lg border-2 border-magic-gold shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-cinzel text-ink flex items-center gap-2">
            <Scroll className="w-6 h-6 text-magic-gold" /> Notas Personales de {characterName}
          </h2>
          <p className="text-xs text-ink-light mt-1 flex items-center gap-1.5 font-sans flex-wrap">
            <span className="bg-amber-900/20 text-amber-900 border border-amber-900/30 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
              Respaldado en Firebase ({notes.length}/10)
            </span>
            Sincronización automática en la nube para tu personaje. <strong>No son visibles por el DM</strong>.
          </p>
        </div>

        <button
          onClick={onOpenNewNote}
          className="px-4 py-2.5 bg-magic-gold text-black font-bold rounded shadow hover:bg-yellow-500 transition text-xs flex items-center gap-2 cursor-pointer font-sans shrink-0 font-cinzel"
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
            onClick={onOpenNewNote}
            className="px-5 py-2 bg-parchment border border-magic-gold text-magic-gold font-bold rounded text-xs hover:bg-magic-gold hover:text-black transition cursor-pointer font-sans"
          >
            + Crear Primera Nota
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`p-5 bg-parchment rounded-xl border transition flex flex-col justify-between space-y-3 shadow-md ${
                note.pinned
                  ? "border-magic-gold shadow-[0_0_15px_rgba(245,208,97,0.3)] bg-amber-950/5"
                  : "border-ink/20 hover:border-magic-gold/60"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 border-b border-ink/10 pb-2 mb-2">
                  <h3 className="text-lg font-bold text-ink font-cinzel break-words flex items-center gap-2">
                    {note.pinned && (
                      <span className="text-xs bg-magic-gold text-black font-bold px-1.5 py-0.5 rounded font-sans">
                        Fijada
                      </span>
                    )}
                    {note.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onTogglePinNote(note.id)}
                      className={`p-1.5 transition cursor-pointer ${
                        note.pinned
                          ? "text-magic-gold"
                          : "text-ink-light opacity-40 hover:opacity-100"
                      }`}
                      title={note.pinned ? "Desfijar Nota" : "Fijar Nota al Inicio"}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenEditNote(note)}
                      className="p-1.5 text-ink-light hover:text-magic-gold transition cursor-pointer"
                      title="Editar Nota"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-ink-light hover:text-magic-red transition cursor-pointer"
                      title="Eliminar Nota"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-ink/90 whitespace-pre-wrap leading-relaxed break-words font-sans">
                  {note.content}
                </p>
              </div>

              <div className="text-[10px] text-ink-light border-t border-ink/10 pt-2 flex justify-between items-center flex-wrap gap-2 font-mono">
                <div className="flex items-center gap-2">
                  <span>
                    Creado: {new Date(note.createdAt).toLocaleDateString()}{" "}
                    {new Date(note.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {note.updatedAt && (
                    <span className="italic">
                      Editado: {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default PrivateNotesTab;
