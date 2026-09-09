"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Sparkles, Swords, Shield, Heart, Zap, BookOpen, Package, Users, Award, HelpCircle, CheckCircle2, Globe, Clock, ScrollText, Dices
} from "lucide-react";

export default function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"sheet" | "inventory" | "combat" | "dm" | "multiplayer">("sheet");

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 font-sans backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-parchment-dark border-4 border-magic-gold rounded-xl w-[95%] max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl relative text-ink"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-ink/20 pb-3 mb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-magic-gold flex items-center gap-2">
                <HelpCircle className="w-7 h-7 text-magic-gold" /> Tutorial Inicial de D&D Companion
              </h2>
              <p className="text-xs sm:text-sm text-ink-light">
                Guía completa paso a paso para dominar tu mesa de juego presencial o por Discord.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-ink-light hover:text-magic-red cursor-pointer rounded hover:bg-ink/10 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 border-b border-ink/20 pb-3 mb-4 font-sans font-bold text-xs">
            <button
              onClick={() => setActiveTab("sheet")}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded cursor-pointer transition text-center ${activeTab === 'sheet' ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0"/> <span>1. Hoja y Dados</span>
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded cursor-pointer transition text-center ${activeTab === 'inventory' ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
            >
              <Package className="w-3.5 h-3.5 shrink-0"/> <span>2. Inventario</span>
            </button>
            <button
              onClick={() => setActiveTab("combat")}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded cursor-pointer transition text-center ${activeTab === 'combat' ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
            >
              <Swords className="w-3.5 h-3.5 shrink-0"/> <span>3. Combate</span>
            </button>
            <button
              onClick={() => setActiveTab("dm")}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded cursor-pointer transition text-center ${activeTab === 'dm' ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0"/> <span>4. Panel DM</span>
            </button>
            <button
              onClick={() => setActiveTab("multiplayer")}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded cursor-pointer transition text-center col-span-2 sm:col-span-1 ${activeTab === 'multiplayer' ? 'bg-magic-gold text-black shadow' : 'bg-parchment text-ink hover:bg-ink/10'}`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0"/> <span>5. Multijugador</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4 text-xs sm:text-sm leading-relaxed">
            
            {/* TAB 1: HOJA Y DADOS */}
            {activeTab === "sheet" && (
              <div className="space-y-4">
                <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                  <h3 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Zap className="w-5 h-5" /> 1. Hoja de Personaje Interactiva y Tiradas de Dados
                  </h3>
                  <p className="text-ink-light">
                    Tu hoja de personaje calcula automáticamente todos los modificadores de D&D 5ª Edición según tus puntuaciones de atributo, nivel y equipo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🎲 Lanza Dados Animados</span>
                    <p className="text-ink-light text-xs">Haz clic en cualquier puntuación de atributo (Fuerza, Destreza, etc.) o habilidad para lanzar un dado d20 interactivo con sonido y ver el resultado total instantáneo.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">❤️ Gestión de Puntos de Vida (HP) y CA</span>
                    <p className="text-ink-light text-xs">Usa los botones <strong>+/- HP</strong> para ajustar tu vida actual al recibir daño o curación. Tu Clase de Armadura (CA) incluye bonificadores de escudos y armaduras equipadas.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⭐ Inspiración D&D 5e</span>
                    <p className="text-ink-light text-xs">El botón ⭐ <strong>Inspiración</strong> en la cabecera te permite alternar si tienes ventaja de inspiración otorgada por el DM.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">📌 Fijar Habilidades y Notas Privadas</span>
                    <p className="text-ink-light text-xs">Marca con la chincheta (📌) tus habilidades más usadas para acceso rápido y usa la pestaña <strong>Notas</strong> para guardar diarios secretos 100% privados.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INVENTARIO Y HECHIZOS */}
            {activeTab === "inventory" && (
              <div className="space-y-4">
                <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                  <h3 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Package className="w-5 h-5" /> 2. Inventario, Equipamiento y Conjuros
                  </h3>
                  <p className="text-ink-light">
                    Gestiona tu equipamiento de combate, consumibles y tu libro de hechizos con cálculo automático de espacios de conjuro.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⚔️ Equipar Armas y Armaduras</span>
                    <p className="text-ink-light text-xs">Al equipar una armadura o escudo en la pestaña <strong>Equipo</strong>, tu Clase de Armadura (CA) se actualizará automáticamente en vivo.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🧪 Consumir Pociones y Objetos</span>
                    <p className="text-ink-light text-xs">Haz clic en <strong>Consumir</strong> en las pociones de curación u objetos consumibles para gastar unidades con registro automático en el diario de la campaña.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">✨ Ranuras de Conjuro (Spell Slots)</span>
                    <p className="text-ink-light text-xs">En la pestaña <strong>Hechizos</strong>, gasta tus espacios de conjuro al lanzar magia. Un <strong>Descanso Largo</strong> restaurará toda tu vida y tus ranuras.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">📜 Añadir Hechizos Personalizados</span>
                    <p className="text-ink-light text-xs">Añade nuevos hechizos a tu grimorio indicando el nivel, escuela de magia y descripción corta.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MODO COMBATE E INICIATIVA */}
            {activeTab === "combat" && (
              <div className="space-y-4">
                <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                  <h3 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Swords className="w-5 h-5 text-magic-red" /> 3. Rueda de Combate e Iniciativa D&D 5e
                  </h3>
                  <p className="text-ink-light">
                    Sincronización en tiempo real del orden de turnos para que nadie pierda su lugar durante los enfrentamientos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⚔️ Inicio de Combate</span>
                    <p className="text-ink-light text-xs">Cuando el DM inicia el combate, se lanza automáticamente la tirada de iniciativa (d20 + Modificador de Destreza) para todos los combatientes seleccionados.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⏱️ Rueda de Turnos Automática</span>
                    <p className="text-ink-light text-xs">La pantalla indicará en dorado de quién es el turno actual. En tu turno, realiza tu acción y presiona <strong>¡Terminar mi Turno!</strong>.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🩸 Estado Moribundo y Salvaciones</span>
                    <p className="text-ink-light text-xs">Si tu HP cae a 0, entrarás en estado moribundo. Deberás lanzar salvaciones contra la muerte en tu turno (acumula 3 éxitos para estabilizarte o 3 fallos para morir).</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⏳ Efectos Temporales</span>
                    <p className="text-ink-light text-xs">Los efectos temporales (como pociones o modificadores por turnos) se reducen automáticamente conforme avanza el tiempo de combate.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PANEL MAESTRO DM */}
            {activeTab === "dm" && (
              <div className="space-y-4">
                <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                  <h3 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Shield className="w-5 h-5" /> 4. Panel Maestro del Dungeon Master (DM)
                  </h3>
                  <p className="text-ink-light">
                    El control absoluto de la campaña en tiempo real para dirigir la aventura de manera fluida y justa.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">👁️ Inspeccionar y Editar Personajes</span>
                    <p className="text-ink-light text-xs">Haz clic en <strong>Inspeccionar</strong> en la tarjeta de cualquier jugador para ver sus atributos, modificar su vida en vivo, editar puntuaciones base o gestionar sus hechizos.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🎁 Otorgar Tesoros y Magia</span>
                    <p className="text-ink-light text-xs">El DM puede otorgar directamente objetos al inventario o conjuros al grimorio de los jugadores durante la partida.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⭐ Otorgar Inspiración</span>
                    <p className="text-ink-light text-xs">Premia el buen juego de rol concediendo <strong>⭐ Inspiración</strong> a cualquier jugador con un solo clic desde su tarjeta.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🎖️ Subir de Nivel a la Party</span>
                    <p className="text-ink-light text-xs">Premia los logros de la campaña subiendo de nivel a un jugador o a toda la party simultáneamente con recálculo automático de HP y ranuras.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MULTIJUGADOR Y SALAS */}
            {activeTab === "multiplayer" && (
              <div className="space-y-4">
                <div className="bg-parchment p-4 rounded-lg border border-ink/20 space-y-2">
                  <h3 className="text-lg font-bold font-cinzel text-magic-gold flex items-center gap-2">
                    <Globe className="w-5 h-5" /> 5. Salas Multijugador en Tiempo Real
                  </h3>
                  <p className="text-ink-light">
                    Conéctate con tus amigos en salas sincronizadas al instante mediante Cloud Firestore.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🔑 Iniciar Sesión o Jugar como Invitado</span>
                    <p className="text-ink-light text-xs">Puedes unirte a partidas de inmediato como invitado sin registrarte. Para crear tus propias salas y actuar como DM, inicia sesión con Google.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🏰 Crear Salas Públicas o Privadas</span>
                    <p className="text-ink-light text-xs">Crea campañas protegidas por contraseña o de acceso libre. Configura el nombre de la sala y los permisos de entrada.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">⚡ Sincronización Realtime Ultra-Eficiente</span>
                    <p className="text-ink-light text-xs">Tus tiradas, inventario y cambios de estado se transmiten en vivo entre todos los miembros de la party en tiempo real.</p>
                  </div>
                  <div className="p-3 bg-parchment rounded border border-ink/10 space-y-1">
                    <span className="font-bold text-magic-gold flex items-center gap-1">🔒 Seguridad y Notas Privadas</span>
                    <p className="text-ink-light text-xs">Las contraseñas de sala nunca se transmiten en claro y las notas personales se mantienen 100% privadas en tu navegador.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-ink/20 flex justify-between items-center font-sans">
            <span className="text-[11px] text-ink-light italic">¡Que los dados te favorezcan en tu aventura!</span>
            <button 
              onClick={onClose} 
              className="px-5 py-2 bg-magic-gold text-black text-xs font-bold rounded hover:bg-yellow-500 transition shadow cursor-pointer"
            >
              ¡Entendido, a jugar!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
