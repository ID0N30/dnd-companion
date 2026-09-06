import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, linkWithCredential, connectAuthEmulator,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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

// Initialize Services
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

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
    console.log("🔥 Firebase conectado a Emuladores Locales (Auth: 9099, Firestore: 8080)");
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
