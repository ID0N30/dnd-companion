import { auth } from "./firebase";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  context?: string;
}

const isTransientError = (err: any): boolean => {
  if (!err) return false;
  const code = (err.code || err.name || '').toLowerCase();
  const message = (err.message || '').toLowerCase();

  const transientCodes = [
    'unavailable',
    'deadline-exceeded',
    'aborted',
    'internal',
    'network-request-failed'
  ];

  if (transientCodes.some(c => code.includes(c))) return true;
  if (
    message.includes('deadline') ||
    message.includes('timeout') ||
    message.includes('tiempo de espera') ||
    message.includes('unavailable') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  ) {
    return true;
  }

  return false;
};

/**
 * Envoltorio para limitar el tiempo de ejecución de una promesa de Firestore.
 * Utiliza Promise.race con un temporizador que siempre se limpia en finally.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  context: string = 'FirestoreOp'
): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      const error: any = new Error(`Tiempo de espera agotado (${timeoutMs}ms) en ${context}`);
      error.code = 'deadline-exceeded';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
};

/**
 * Envoltorio con reintentos exponenciales con jitter y refresco proactivo de token.
 * Reintenta solo ante fallos transitorios de red o cuota.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> => {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  const timeoutMs = options?.timeoutMs ?? 8000;
  const context = options?.context ?? 'FirestoreOp';

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, context);
    } catch (err: any) {
      lastError = err;

      // Token refresh en primer intento si falla por permission-denied
      if (
        attempt === 0 &&
        (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission-denied'))
      ) {
        if (auth?.currentUser) {
          try {
            await auth.currentUser.getIdToken(true);
            const delay = baseDelayMs + Math.floor(Math.random() * 200);
            await new Promise(res => setTimeout(res, delay));
            continue;
          } catch {
            throw err;
          }
        }
      }

      // Si no es un error transitorio o alcanzamos el límite de intentos, fallar
      if (!isTransientError(err) || attempt === maxRetries) {
        throw err;
      }

      // Backoff exponencial con jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw lastError;
};
