"use client";

export type ErrorSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type SystemErrorLog = {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  code?: string;
  message: string;
  context?: string;
  stack?: string;
};

const LOG_STORAGE_KEY = 'dnd_system_error_logs';
const MAX_LOGS = 100;

// Listeners for UI notification toasts
type LogListener = (log: SystemErrorLog) => void;
const listeners: Set<LogListener> = new Set();

export const subscribeErrorLogs = (listener: LogListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getStoredErrorLogs = (): SystemErrorLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Error al leer logs de localStorage:", err);
    return [];
  }
};

export const clearErrorLogs = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (err) {
    console.error("Error al limpiar logs:", err);
  }
};

export const logError = (
  error: any,
  context: string = 'General',
  severity: ErrorSeverity = 'WARNING'
): SystemErrorLog => {
  let message = 'Error desconocido en la aplicación.';
  let code: string | undefined = undefined;
  let stack: string | undefined = undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = error.message || error.description || JSON.stringify(error);
    code = error.code || error.name;
    stack = error.stack;
  }

  // Detect Firebase specific quota or auth errors and promote severity
  if (code === 'resource-exhausted' || message.includes('Quota exceeded') || message.includes('resource-exhausted')) {
    severity = 'CRITICAL';
    message = '⚠️ Cuota de Firebase Agotada: Se alcanzó el límite de operaciones gratuitas. Los datos se guardarán de forma local en este dispositivo.';
    code = 'resource-exhausted';
  } else if (code === 'auth/credential-already-in-use') {
    severity = 'WARNING';
    message = 'La cuenta de Google ya está vinculada. Se ha alternado al usuario existente.';
  } else if (code === 'permission-denied') {
    if (severity !== 'WARNING') severity = 'CRITICAL';
    message = 'Permiso denegado en Firestore para realizar esta operación.';
  } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
    severity = 'WARNING';
    message = 'Error de conexión de red. Verifica tu enlace a internet.';
  }

  const logEntry: SystemErrorLog = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: Date.now(),
    severity,
    code,
    message,
    context,
    stack
  };

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const existing = getStoredErrorLogs();
      const updated = [logEntry, ...existing].slice(0, MAX_LOGS);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("No se pudo guardar el log en localStorage:", e);
    }
  }

  // Notify active UI listeners
  listeners.forEach(fn => fn(logEntry));

  return logEntry;
};

// Save offline fallback data when Firebase fails or quota is exhausted
export const saveOfflineCharacterBackup = (character: any) => {
  if (typeof window === 'undefined' || !character || !character.id) return;
  try {
    localStorage.setItem(`dnd_offline_char_${character.id}`, JSON.stringify({
      character,
      savedAt: Date.now()
    }));
    logError(`Respaldo local guardado para ${character.name || character.id}`, 'OfflineBackup', 'INFO');
  } catch (e) {
    console.error("Error al guardar respaldo local:", e);
  }
};

// Global unhandled error catchers
let isGlobalListenerInitialized = false;

export const initGlobalErrorListeners = () => {
  if (typeof window === 'undefined' || isGlobalListenerInitialized) return;
  isGlobalListenerInitialized = true;

  window.addEventListener('error', (event) => {
    logError(
      event.error || event.message,
      `Uncaught Exception: ${event.filename || ''}:${event.lineno || ''}`,
      'CRITICAL'
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(
      event.reason,
      'Unhandled Promise Rejection',
      'CRITICAL'
    );
  });
};
