"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export default function CustomNotificationModal() {
  const activeNotification = useStore((state) => state.activeNotification);
  const closeNotification = useStore((state) => state.closeNotification);

  if (!activeNotification || !activeNotification.open) return null;

  const { 
    title, 
    message, 
    type = 'info', 
    confirmText = 'Entendido', 
    cancelText = 'Cancelar', 
    showCancel = false, 
    onConfirm 
  } = activeNotification;

  const handleConfirm = () => {
    closeNotification();
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    closeNotification();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-7 h-7 text-magic-red animate-pulse shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-7 h-7 text-magic-gold shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-7 h-7 text-magic-gold shrink-0 mt-0.5" />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'danger':
        return 'text-magic-red';
      case 'warning':
      case 'info':
      case 'success':
      default:
        return 'text-magic-gold';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 font-sans backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-parchment-dark border-4 border-magic-gold rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 text-ink relative"
        >
          {/* Close Button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-ink-light hover:text-magic-red cursor-pointer p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 border-b border-ink/20 pb-3 pr-6">
            {getIcon()}
            <div>
              <h3 className={`text-xl sm:text-2xl font-bold font-cinzel ${getHeaderColor()}`}>
                {title || (type === 'danger' ? 'Atención' : 'Notificación')}
              </h3>
            </div>
          </div>

          {/* Message Content */}
          <p className="text-sm text-ink/90 leading-relaxed font-sans whitespace-pre-wrap">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-ink/20 font-bold text-xs sm:text-sm">
            {showCancel && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-parchment text-ink border border-ink/30 rounded hover:bg-ink/10 transition cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-5 py-2 rounded text-black font-bold transition shadow cursor-pointer ${
                type === 'danger'
                  ? 'bg-magic-red text-white hover:bg-red-700'
                  : 'bg-magic-gold hover:bg-yellow-500 text-black'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
