"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  subscribeErrorLogs, getStoredErrorLogs, clearErrorLogs, initGlobalErrorListeners, SystemErrorLog, logError 
} from "@/lib/errorLogger";
import { AlertTriangle, ShieldAlert, Info, X, Copy, Check, Trash2, Bug } from "lucide-react";

export default function ErrorToast() {
  const [activeToast, setActiveToast] = useState<SystemErrorLog | null>(null);
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  useEffect(() => {
    initGlobalErrorListeners();
    setLogs(getStoredErrorLogs());

    const unsub = subscribeErrorLogs((newLog) => {
      setLogs(getStoredErrorLogs());
      // Show toast alert for WARNING and CRITICAL
      if (newLog.severity === 'CRITICAL' || newLog.severity === 'WARNING') {
        setActiveToast(newLog);
      }
    });

    return () => unsub();
  }, []);

  const handleCopyLogs = () => {
    const reportText = logs.map(l => 
      `[${new Date(l.timestamp).toLocaleString()}] [${l.severity}] [${l.context || 'App'}]: ${l.message} ${l.code ? `(Código: ${l.code})` : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    clearErrorLogs();
    setLogs([]);
  };

  const filteredLogs = logs.filter(l => filterSeverity === 'ALL' || l.severity === filterSeverity);

  return (
    <>
      {/* FLOATING SYSTEM ERROR TOAST NOTIFICATION */}
      <AnimatePresence>
        {activeToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[120] max-w-md w-[90%] font-sans"
          >
            <div className={`p-4 rounded-xl border-2 shadow-2xl backdrop-blur-md flex justify-between items-start gap-3 text-white ${
              activeToast.severity === 'CRITICAL' 
                ? 'bg-red-950/95 border-magic-red shadow-[0_0_30px_rgba(217,56,41,0.7)]' 
                : 'bg-amber-950/95 border-magic-gold shadow-[0_0_20px_rgba(245,208,97,0.5)]'
            }`}>
              <div className="flex items-start gap-3">
                {activeToast.severity === 'CRITICAL' ? (
                  <ShieldAlert className="w-6 h-6 text-magic-red animate-pulse shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-magic-gold shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm font-cinzel tracking-wider flex items-center gap-2">
                    {activeToast.severity === 'CRITICAL' ? '⚠️ ERROR CRÍTICO DEL SISTEMA' : '⚠️ ADVERTENCIA'}
                  </h4>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">{activeToast.message}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <button 
                      onClick={() => setShowInspectorModal(true)}
                      className="text-[11px] font-bold text-magic-gold underline hover:text-yellow-400 cursor-pointer"
                    >
                      Ver Registro de Errores ({logs.length})
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveToast(null)}
                className="text-white/60 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOG INSPECTOR MODAL */}
      <AnimatePresence>
        {showInspectorModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-parchment-dark border-4 border-magic-gold rounded-xl w-[95%] max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 shadow-2xl font-sans relative"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-ink/20 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <Bug className="w-6 h-6 text-magic-gold" />
                  <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-magic-gold">
                    Registro de Errores y Diagnóstico
                  </h3>
                </div>
                <button 
                  onClick={() => setShowInspectorModal(false)}
                  className="text-ink-light hover:text-magic-red p-1 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Actions & Filters Bar */}
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4 text-xs font-bold bg-parchment p-2.5 rounded border border-ink/20">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink-light">Filtrar por:</span>
                  {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
                    <button
                      key={sev}
                      onClick={() => setFilterSeverity(sev)}
                      className={`px-2.5 py-1 rounded transition cursor-pointer ${
                        filterSeverity === sev 
                          ? 'bg-ink text-parchment-dark shadow font-bold' 
                          : 'text-ink hover:bg-ink/10'
                      }`}
                    >
                      {sev === 'ALL' ? 'Todos' : sev}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-1 bg-magic-gold text-black px-3 py-1.5 rounded font-bold hover:bg-yellow-500 transition cursor-pointer shadow"
                    title="Copiar historial de errores al portapapeles"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '¡Copiado!' : 'Copiar Reporte'}
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 bg-red-950/80 text-red-300 border border-red-500/40 px-3 py-1.5 rounded font-bold hover:bg-magic-red hover:text-white transition cursor-pointer"
                    title="Borrar todos los logs guardados"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpiar Logs
                  </button>
                </div>
              </div>

              {/* Log List View */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none min-h-[250px]">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-ink-light italic">
                    No hay errores ni advertencias registrados en este filtro.
                  </div>
                ) : (
                  filteredLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded border text-xs font-mono space-y-1 ${
                        log.severity === 'CRITICAL' 
                          ? 'bg-red-950/30 border-magic-red/60 text-red-200' 
                          : log.severity === 'WARNING'
                            ? 'bg-amber-950/30 border-magic-gold/60 text-amber-200'
                            : 'bg-ink/5 border-ink/20 text-ink'
                      }`}
                    >
                      <div className="flex justify-between items-center flex-wrap gap-1 font-sans">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          log.severity === 'CRITICAL' 
                            ? 'bg-magic-red text-white' 
                            : log.severity === 'WARNING'
                              ? 'bg-magic-gold text-black'
                              : 'bg-ink text-white'
                        }`}>
                          {log.severity}
                        </span>
                        <span className="text-ink-light text-[10px]">
                          {new Date(log.timestamp).toLocaleString()} • [{log.context || 'App'}]
                        </span>
                      </div>
                      <p className="font-sans font-bold text-sm text-ink">{log.message}</p>
                      {log.code && (
                        <span className="text-[10px] text-ink-light block">Código de Error: {log.code}</span>
                      )}
                      {log.stack && (
                        <details className="mt-1 cursor-pointer">
                          <summary className="text-[10px] text-magic-gold font-sans">Ver Traza de Pila (Stack Trace)</summary>
                          <pre className="text-[10px] p-2 bg-black/60 rounded mt-1 overflow-x-auto text-white/80 font-mono">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-ink/20 flex justify-between items-center text-xs text-ink-light font-sans">
                <span>Total de logs almacenados: {logs.length}/100</span>
                <button
                  onClick={() => setShowInspectorModal(false)}
                  className="px-4 py-1.5 bg-ink text-parchment-dark font-bold rounded hover:bg-magic-gold hover:text-black transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
