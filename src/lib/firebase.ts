import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, linkWithCredential, connectAuthEmulator,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "firebase/auth";
import { 
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, Firestore 
} from "firebase/firestore";
import { 
  initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider, AppCheck 
} from "firebase/app-check";
import { getDatabase, Database, goOnline, goOffline } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-dnd-companion",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:1234567890",
};

export const isUseEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

// Check if all Firebase environment variables or emulators are configured
export const isFirebaseConfigured = Boolean(
  isUseEmulator || (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
);

// Initialize Firebase App
const app = getApps().length > 0 
  ? getApp() 
  : isFirebaseConfigured 
    ? initializeApp(firebaseConfig)
    : null;

// Initialize Firebase App Check (reCAPTCHA Enterprise / Debug Token in Dev)
export let appCheck: AppCheck | null = null;
if (app && typeof window !== 'undefined') {
  try {
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
    }
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    }
  } catch (appCheckErr) {
    console.warn("[AppCheck] No se pudo inicializar Firebase App Check:", appCheckErr);
  }
}

// Initialize Services
export const auth = app ? getAuth(app) : null;

let dbInstance: Firestore | null = null;
if (app) {
  if (typeof window !== "undefined") {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } catch {
      // Fallback if initializeFirestore was already called (e.g. Next.js Fast Refresh)
      dbInstance = getFirestore(app);
    }
  } else {
    dbInstance = getFirestore(app);
  }
}

export const db: Firestore | null = dbInstance;
export const googleProvider = new GoogleAuthProvider();

// Initialize Realtime Database (RTDB)
const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (firebaseConfig.projectId ? `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com` : undefined);

let rtdbInstance: Database | null = null;
if (app) {
  try {
    rtdbInstance = rtdbUrl ? getDatabase(app, rtdbUrl) : getDatabase(app);
  } catch (rtdbErr) {
    console.warn("[RTDB] No se pudo inicializar Firebase Realtime Database:", rtdbErr);
  }
}

export const rtdb: Database | null = rtdbInstance;

export const connectRTDB = () => {
  if (rtdb) {
    try {
      goOnline(rtdb);
    } catch (e) {
      console.warn("[RTDB] Error al conectar a RTDB:", e);
    }
  }
};

export const disconnectRTDB = () => {
  if (rtdb) {
    try {
      goOffline(rtdb);
    } catch (e) {
      console.warn("[RTDB] Error al desconectar de RTDB:", e);
    }
  }
};

// Connect to Firebase Local Emulators when NEXT_PUBLIC_USE_EMULATOR=true
if (app && isUseEmulator && typeof window !== 'undefined') {
  const globalWithEmulators = globalThis as any;
  if (!globalWithEmulators._firebaseEmulatorsConnected) {
    globalWithEmulators._firebaseEmulatorsConnected = true;
    if (auth) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
    if (db) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
    console.log("Firebase conectado a Emuladores Locales (Auth: 9099, Firestore: 8080)");
  }
}

// Auth Helpers
export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth no está configurado");
  return await signInWithPopup(auth, googleProvider);
};

export const loginAnonymously = async () => {
  if (!auth) throw new Error("Firebase Auth no está configurado");
  return await signInAnonymously(auth);
};

export { 
  signInWithPopup, signInAnonymously, linkWithCredential, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile 
};
