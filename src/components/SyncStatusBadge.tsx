"use client";

import React from "react";
import { useStore } from "@/store/useStore";
import { Cloud, RefreshCw, CloudOff } from "lucide-react";

export interface SyncStatusBadgeProps {
  className?: string;
}

export const SyncStatusBadge = React.memo(function SyncStatusBadge({ className = "" }: SyncStatusBadgeProps) {
  const syncState = useStore((state) => state.syncState) || "synced";

  if (syncState === "saving") {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Guardando cambios en la nube..."
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-sans font-medium text-amber-400 bg-amber-950/30 border border-amber-500/20 select-none ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
        <span className="hidden sm:inline">Guardando...</span>
      </div>
    );
  }

  if (syncState === "offline") {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Los cambios se están guardando en este dispositivo"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans font-medium text-red-400 bg-red-950/40 border border-red-500/30 select-none cursor-help ${className}`}
      >
        <CloudOff className="w-3.5 h-3.5 shrink-0 text-red-400" />
        <span>Modo Offline</span>
      </div>
    );
  }

  // 'synced' (default)
  return (
    <div
      role="status"
      aria-live="polite"
      title="Sincronizado con la nube"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-sans font-medium text-emerald-400/90 bg-emerald-950/20 border border-emerald-500/20 select-none ${className}`}
    >
      <Cloud className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
      <span className="hidden sm:inline">Sincronizado</span>
    </div>
  );
});

export default SyncStatusBadge;
