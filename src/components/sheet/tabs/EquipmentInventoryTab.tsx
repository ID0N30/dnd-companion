"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sword, ShieldAlert, FlaskConical, Scroll, Briefcase, Plus, PenTool, Trash2, 
  CheckCircle2, Circle, Search, Package, Coins
} from "lucide-react";
import { CharacterState, Item, ItemType } from "@/store/useStore";

export interface EquipmentInventoryTabProps {
  character: CharacterState;
  currencyMode?: string;
  isEditing: boolean;
  toggleEquipItem: (id: string) => void;
  consumeItem: (id: string) => void;
  removeItem: (id: string) => void;
  addItem: (item: Item, isTemp: boolean, duration?: number) => void;
  onOpenItemEdit: (item: Item) => void;
  onOpenSpendModal: () => void;
  onOpenEditCurrencyModal: () => void;
}

export const EquipmentInventoryTab = React.memo(function EquipmentInventoryTab({
  character,
  currencyMode,
  isEditing,
  toggleEquipItem,
  consumeItem,
  removeItem,
  addItem,
  onOpenItemEdit,
  onOpenSpendModal,
  onOpenEditCurrencyModal,
}: EquipmentInventoryTabProps) {
  const [inventoryFilter, setInventoryFilter] = useState<ItemType | "all">("all");
  const [inventorySearch, setInventorySearch] = useState("");
  const [newItem, setNewItem] = useState<{
    name: string;
    type: ItemType;
    desc: string;
    qty: number;
    damage: string;
    acBonus: number;
    equipped: boolean;
    turns: string;
  }>({
    name: "",
    type: "general",
    desc: "",
    qty: 1,
    damage: "",
    acBonus: 0,
    equipped: false,
    turns: "",
  });

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case "weapon":
        return <Sword className="w-4 h-4 text-magic-red shrink-0" />;
      case "armor":
        return <ShieldAlert className="w-4 h-4 text-magic-gold shrink-0" />;
      case "consumable":
        return <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "quest":
        return <Scroll className="w-4 h-4 text-purple-400 shrink-0" />;
      default:
        return <Briefcase className="w-4 h-4 text-ink-light shrink-0" />;
    }
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    const isPerm = newItem.turns === "";
    const duration = isPerm ? undefined : parseInt(newItem.turns);
    addItem(
      {
        id: Date.now().toString(),
        name: newItem.name.trim(),
        type: newItem.type,
        description: newItem.desc.trim(),
        quantity: newItem.qty,
        damage: newItem.type === "weapon" ? newItem.damage.trim() : undefined,
        acBonus: newItem.type === "armor" ? newItem.acBonus : undefined,
        equipped: newItem.equipped,
      },
      !isPerm,
      duration
    );
    setNewItem({
      name: "",
      type: "general",
      desc: "",
      qty: 1,
      damage: "",
      acBonus: 0,
      equipped: false,
      turns: "",
    });
  };

  // Currency calculations
  const cur = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const isStandard = currencyMode === "standard";
  const totalGPValue =
    cur.pp * 10 + cur.gp + cur.ep * 0.5 + cur.sp * 0.1 + cur.cp * 0.01;

  // D&D 5e Carrying Capacity: STR score * 15 lbs
  const strScore = character.stats.str || 10;
  const maxCarryingCapacity = strScore * 15;
  // Total quantity of items in inventory as estimated weight
  const currentWeight = character.inventory.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const weightPercentage = Math.min(100, Math.round((currentWeight / maxCarryingCapacity) * 100));

  const filteredInventory = character.inventory.filter((item) => {
    const matchesCategory = inventoryFilter === "all" || item.type === inventoryFilter;
    const matchesSearch =
      !inventorySearch ||
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.description.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div
      key="equipment"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 font-sans"
    >
      <div className="border-b border-ink/20 pb-3 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-2xl font-bold font-cinzel text-magic-gold">Equipamiento e Inventario</h3>
          <p className="text-xs text-ink-light font-sans">
            Haz clic en "Equipar" para activar automáticamente sus bonos a la CA o ataques.
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {(["all", "weapon", "armor", "consumable", "quest", "general"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setInventoryFilter(type)}
              className={`px-3 py-1.5 rounded capitalize font-bold cursor-pointer transition ${
                inventoryFilter === type
                  ? "bg-magic-gold text-black shadow-sm"
                  : "bg-parchment text-ink hover:bg-ink/10"
              }`}
            >
              {type === "all"
                ? "Todos"
                : type === "weapon"
                ? "Armas"
                : type === "armor"
                ? "Armaduras"
                : type === "consumable"
                ? "Consumibles"
                : type === "quest"
                ? "Misión"
                : "General"}
            </button>
          ))}
        </div>
      </div>

      {/* SISTEMA DE MONEDAS D&D 5E */}
      <div className="bg-parchment-dark p-4 sm:p-5 rounded-xl border-2 border-magic-gold/50 shadow-xl font-sans space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-ink/10 pb-3">
          <div>
            <h4 className="font-bold text-lg sm:text-xl font-cinzel text-magic-gold flex items-center gap-2">
              <Coins className="w-5 h-5 text-magic-gold" /> Bolsa de Monedas ({isStandard ? "Estándar CP/SP/GP" : "D&D 5ª Edición"})
            </h4>
            <p className="text-xs text-ink-light">
              Monedas acumuladas en tu monedero y equivalencia en Piezas de Oro (PO / GP).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold bg-magic-gold/20 text-magic-gold border border-magic-gold/40 px-3 py-1.5 rounded-lg shadow-sm">
              Equivalente Total:{" "}
              <strong className="text-sm font-cinzel">{totalGPValue.toFixed(2)} PO</strong>
            </span>
            <button
              onClick={onOpenSpendModal}
              className="flex items-center gap-1.5 bg-magic-red text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition shadow cursor-pointer"
            >
              Gastar / Consumir Dinero
            </button>
            <button
              onClick={onOpenEditCurrencyModal}
              className="flex items-center gap-1.5 bg-magic-gold text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-500 transition shadow cursor-pointer font-cinzel"
            >
              <PenTool className="w-3.5 h-3.5" /> Editar Monedas
            </button>
          </div>
        </div>

        {/* Currency Denominations Display */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-2.5 bg-parchment rounded-lg border border-amber-800/30 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Cobre (PC)</span>
            <span className="font-mono text-lg font-bold text-ink">{cur.cp}</span>
          </div>
          <div className="p-2.5 bg-parchment rounded-lg border border-slate-400/40 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Plata (PP)</span>
            <span className="font-mono text-lg font-bold text-ink">{cur.sp}</span>
          </div>
          {!isStandard && (
            <div className="p-2.5 bg-parchment rounded-lg border border-emerald-600/30 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Electro (PE)</span>
              <span className="font-mono text-lg font-bold text-ink">{cur.ep}</span>
            </div>
          )}
          <div className="p-2.5 bg-parchment rounded-lg border border-yellow-500/50 text-center shadow-inner">
            <span className="text-[10px] uppercase font-bold text-yellow-600 block">Oro (PO)</span>
            <span className="font-mono text-lg font-bold text-magic-gold drop-shadow-sm">{cur.gp}</span>
          </div>
          {!isStandard && (
            <div className="p-2.5 bg-parchment rounded-lg border border-blue-400/40 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Platino (PPT)</span>
              <span className="font-mono text-lg font-bold text-ink">{cur.pp}</span>
            </div>
          )}
        </div>

        {/* Weight & Carrying Capacity Bar */}
        <div className="pt-2 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <Package className="w-4 h-4 text-magic-gold shrink-0" />
            <span>Capacidad de Carga (FUE {strScore} x 15):</span>
            <strong className="font-mono">{currentWeight} / {maxCarryingCapacity} lbs ({weightPercentage}%)</strong>
          </div>
          <div className="w-full sm:w-48 bg-parchment rounded-full h-2.5 border border-ink/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                weightPercentage > 90 ? "bg-magic-red" : "bg-magic-gold"
              }`}
              style={{ width: `${weightPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-parchment p-3 rounded-xl border border-ink/20 flex items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            placeholder="Buscar objeto en mochila..."
            className="p-1.5 pl-7 text-xs bg-parchment-dark border border-ink/30 rounded text-ink font-bold w-full focus:outline-none focus:border-magic-gold"
          />
          <Search className="w-3.5 h-3.5 text-ink-light absolute left-2 top-2" />
        </div>
        <span className="text-xs text-ink-light font-mono font-bold">
          {filteredInventory.length} objetos
        </span>
      </div>

      {/* Form to add items when isEditing is true */}
      {isEditing && (
        <div className="p-4 bg-parchment border-2 border-magic-gold rounded-xl space-y-3 font-sans shadow-lg">
          <h4 className="font-bold text-base sm:text-lg text-magic-gold font-cinzel flex items-center gap-2">
            <Plus className="w-5 h-5" /> Añadir Objeto al Inventario (Pluma Mágica)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Nombre</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Ej. Espada Larga"
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Tipo</label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ItemType })}
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold cursor-pointer"
              >
                <option value="weapon">Arma</option>
                <option value="armor">Armadura</option>
                <option value="consumable">Consumible</option>
                <option value="quest">Misión</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                value={newItem.qty}
                onChange={(e) => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })}
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
              />
            </div>
            {newItem.type === "weapon" && (
              <div>
                <label className="block font-bold mb-1">Daño</label>
                <input
                  type="text"
                  value={newItem.damage}
                  onChange={(e) => setNewItem({ ...newItem, damage: e.target.value })}
                  placeholder="Ej. 1d8 cortante"
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
                />
              </div>
            )}
            {newItem.type === "armor" && (
              <div>
                <label className="block font-bold mb-1">Bono CA (+)</label>
                <input
                  type="number"
                  value={newItem.acBonus}
                  onChange={(e) => setNewItem({ ...newItem, acBonus: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink font-bold"
                />
              </div>
            )}
            <div>
              <label className="block font-bold mb-1">Duración Turnos (vacío = Perm)</label>
              <input
                type="number"
                placeholder="Ej. 3 (vacío para permanente)"
                value={newItem.turns}
                onChange={(e) => setNewItem({ ...newItem, turns: e.target.value })}
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
              />
            </div>
            <div className="col-span-full">
              <label className="block font-bold mb-1">Descripción</label>
              <input
                type="text"
                value={newItem.desc}
                onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
                placeholder="Propiedades, valor, peso..."
                className="w-full p-2 bg-parchment-dark border border-ink/30 rounded text-ink"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-magic-gold text-black font-bold text-xs rounded hover:bg-yellow-500 transition cursor-pointer flex items-center gap-1 shadow font-cinzel"
            >
              <Plus className="w-4 h-4" /> Añadir Objeto
            </button>
          </div>
        </div>
      )}

      {/* Items Grid with Equip Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {filteredInventory.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded border-2 transition-all flex justify-between items-start relative shadow-sm ${
              item.isConsumed
                ? "bg-red-950/20 border-magic-red/50 opacity-80"
                : item.equipped
                ? "bg-parchment border-magic-gold shadow-[0_0_15px_rgba(245,208,97,0.2)]"
                : "bg-parchment-dark border-ink/20 hover:border-ink/40"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getItemTypeIcon(item.type)}
                <h4
                  className={`font-bold text-base sm:text-lg font-cinzel ${
                    item.isConsumed ? "line-through text-magic-red" : "text-ink"
                  }`}
                >
                  {item.name}
                </h4>
                <span className="text-[10px] bg-ink/10 px-2 py-0.5 rounded capitalize">
                  {item.type}
                </span>
                {item.quantity > 1 && (
                  <span className="text-[10px] bg-magic-gold/20 text-magic-gold font-bold px-2 py-0.5 rounded border border-magic-gold/30 font-mono">
                    x{item.quantity}
                  </span>
                )}
                {item.isTemporary && (
                  <span className="text-[10px] bg-purple-900/30 text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                    Temporal ({item.duration ? `${item.duration} turnos` : "Perm"})
                  </span>
                )}
                {item.isConsumed && (
                  <span className="text-[10px] bg-red-900/40 text-red-300 font-bold px-2 py-0.5 rounded border border-red-500/40">
                    CONSUMIDO (Se eliminará el próximo turno)
                  </span>
                )}
              </div>
              {item.damage && <p className="text-xs text-magic-red font-bold">Daño: {item.damage}</p>}
              {item.acBonus ? (
                <p className="text-xs text-magic-gold font-bold">
                  Bono CA: +{item.acBonus} (Aplicado si equipado)
                </p>
              ) : null}
              <p className="text-xs sm:text-sm text-ink-light">{item.description}</p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
              {item.isConsumed ? (
                <span className="text-[10px] text-red-400 font-bold italic">Agotado</span>
              ) : item.type === "consumable" ? (
                <button
                  onClick={() => consumeItem(item.id)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                  title="Consumir objeto del inventario"
                >
                  <FlaskConical className="w-3.5 h-3.5" /> Consumir (x{item.quantity})
                </button>
              ) : (
                <button
                  onClick={() => toggleEquipItem(item.id)}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${
                    item.equipped
                      ? "bg-magic-gold text-black shadow"
                      : "bg-ink/20 text-ink-light hover:text-ink"
                  }`}
                >
                  {item.equipped ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {item.equipped ? "EQUIPADO" : "Equipar"}
                </button>
              )}
              {isEditing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenItemEdit({ ...item })}
                    className="text-ink-light hover:text-magic-gold p-1 cursor-pointer transition"
                    title="Editar Objeto (Pluma Mágica)"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-ink-light hover:text-magic-red p-1 cursor-pointer transition"
                    title="Eliminar Objeto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export default EquipmentInventoryTab;
